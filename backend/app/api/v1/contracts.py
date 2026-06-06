# ruff: noqa: E501, I001, E402
from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.contracts.schemas import (
    ContractCreateRequest,
    ContractLifecycleRequest,
    ContractListQuery,
    ContractObligationCreateRequest,
    ContractObligationUpdateRequest,
    ContractRelationCreateRequest,
    ContractUpdateRequest,
)
from app.domains.contracts.service import (
    apply_contract_action,
    create_contract,
    create_obligation,
    create_relation,
    delete_contract,
    get_contract,
    list_contract_documents,
    list_contracts,
    list_events,
    list_obligations,
    list_relations,
    precheck_contract_action,
    service_context,
    update_contract,
)
from app.domains.documents.schemas import DocumentUploadRequest
from app.domains.documents.service import service_context as document_service_context
from app.domains.documents.service import upload_document_for_entity
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("", response_model=ApiSuccess[dict[str, Any]])
async def contracts_list(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    contract_type: str | None = Query(default=None),
    status_value: str | None = Query(default=None, alias="status"),
    counterparty: str | None = Query(default=None),
    risk_level: str | None = Query(default=None),
    owner_user_id: str | None = Query(default=None),
    expiring_within_days: int | None = Query(default=None, alias="expiringWithinDays"),
    renewal_due: bool | None = Query(default=None, alias="renewalDue"),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    sort: str = Query(default="updated_at"),
    direction: str = Query(default="desc"),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "contracts.view")
    tenant_id = require_tenant(context)
    try:
        result = await list_contracts(
            session,
            service_context(context, tenant_id),
            ContractListQuery(
                company_id=company_id,
                contract_type=contract_type,
                status=status_value,
                counterparty=counterparty,
                risk_level=risk_level,
                owner_user_id=owner_user_id,
                expiring_within_days=expiring_within_days,
                renewal_due=renewal_due,
                search=search,
                page=page,
                page_size=page_size,
                sort=sort,
                direction=direction,
            ),
        )
        return ApiSuccess(data={"data": result.data, "meta": result.meta})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def contracts_create(request: ContractCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "contracts.create")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await create_contract(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=row, message="Sözleşme taslağı oluşturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/{contract_id}", response_model=ApiSuccess[dict[str, Any]])
async def contracts_get(contract_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "contracts.view")
    tenant_id = require_tenant(context)
    try:
        row = await get_contract(session, service_context(context, tenant_id), contract_id)
        if not row:
            raise DomainError("Sözleşme bulunamadı.", "CONTRACT_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return ApiSuccess(data=row)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/{contract_id}", response_model=ApiSuccess[dict[str, Any]])
async def contracts_update(contract_id: str, request: ContractUpdateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "contracts.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await update_contract(session, service_context(context, tenant_id), contract_id, request)
        return ApiSuccess(data=row, message="Sözleşme kart bilgileri güncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.delete("/{contract_id}", response_model=ApiSuccess[dict[str, Any]])
async def contracts_delete(contract_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "contracts.archive")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await delete_contract(session, service_context(context, tenant_id), contract_id)
        return ApiSuccess(data=row, message="Sözleşme arşivlendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


def lifecycle_permission(action: str) -> str:
    return {
        "activate": "contracts.activate",
        "renew": "contracts.renew",
        "amend": "contracts.amend",
        "suspend": "contracts.suspend",
        "terminate": "contracts.terminate",
        "archive": "contracts.archive",
    }[action]


async def lifecycle_precheck(action: str, contract_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, lifecycle_permission(action))
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await precheck_contract_action(session, service_context(context, tenant_id), contract_id, action))
    except DomainError as error:
        raise domain_error_to_http(error) from error


async def lifecycle_apply(action: str, contract_id: str, request: ContractLifecycleRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, lifecycle_permission(action))
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await apply_contract_action(session, service_context(context, tenant_id), contract_id, action, request)
        return ApiSuccess(data=row, message="Sözleşme işlemi onaylandı.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/{contract_id}/activate/precheck", response_model=ApiSuccess[dict[str, Any]])
async def contract_activate_precheck(contract_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    return await lifecycle_precheck("activate", contract_id, session, context)


@router.post("/{contract_id}/activate", response_model=ApiSuccess[dict[str, Any]])
async def contract_activate(contract_id: str, request: ContractLifecycleRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    return await lifecycle_apply("activate", contract_id, request, session, context)


@router.post("/{contract_id}/renew/precheck", response_model=ApiSuccess[dict[str, Any]])
async def contract_renew_precheck(contract_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    return await lifecycle_precheck("renew", contract_id, session, context)


@router.post("/{contract_id}/renew", response_model=ApiSuccess[dict[str, Any]])
async def contract_renew(contract_id: str, request: ContractLifecycleRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    return await lifecycle_apply("renew", contract_id, request, session, context)


@router.post("/{contract_id}/amend/precheck", response_model=ApiSuccess[dict[str, Any]])
async def contract_amend_precheck(contract_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    return await lifecycle_precheck("amend", contract_id, session, context)


@router.post("/{contract_id}/amend", response_model=ApiSuccess[dict[str, Any]])
async def contract_amend(contract_id: str, request: ContractLifecycleRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    return await lifecycle_apply("amend", contract_id, request, session, context)


@router.post("/{contract_id}/suspend/precheck", response_model=ApiSuccess[dict[str, Any]])
async def contract_suspend_precheck(contract_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    return await lifecycle_precheck("suspend", contract_id, session, context)


@router.post("/{contract_id}/suspend", response_model=ApiSuccess[dict[str, Any]])
async def contract_suspend(contract_id: str, request: ContractLifecycleRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    return await lifecycle_apply("suspend", contract_id, request, session, context)


@router.post("/{contract_id}/terminate/precheck", response_model=ApiSuccess[dict[str, Any]])
async def contract_terminate_precheck(contract_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    return await lifecycle_precheck("terminate", contract_id, session, context)


@router.post("/{contract_id}/terminate", response_model=ApiSuccess[dict[str, Any]])
async def contract_terminate(contract_id: str, request: ContractLifecycleRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    return await lifecycle_apply("terminate", contract_id, request, session, context)


@router.post("/{contract_id}/archive", response_model=ApiSuccess[dict[str, Any]])
async def contract_archive(contract_id: str, request: ContractLifecycleRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    return await lifecycle_apply("archive", contract_id, request, session, context)


@router.get("/{contract_id}/relations", response_model=ApiSuccess[list[dict[str, Any]]])
async def contract_relations(contract_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "contracts.view")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await list_relations(session, service_context(context, tenant_id), contract_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/{contract_id}/relations", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def contract_relation_create(contract_id: str, request: ContractRelationCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "contracts.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await create_relation(session, service_context(context, tenant_id), contract_id, request)
        return ApiSuccess(data=row, message="İlişki kaydedildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/{contract_id}/obligations", response_model=ApiSuccess[list[dict[str, Any]]])
async def contract_obligations(contract_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "contracts.view")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await list_obligations(session, service_context(context, tenant_id), contract_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/{contract_id}/obligations", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def contract_obligation_create(contract_id: str, request: ContractObligationCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "contracts.obligationsManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await create_obligation(session, service_context(context, tenant_id), contract_id, request)
        return ApiSuccess(data=row, message="Yükümlülük kaydedildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/{contract_id}/obligations/{obligation_id}", response_model=ApiSuccess[dict[str, Any]])
async def contract_obligation_update(contract_id: str, obligation_id: str, request: ContractObligationUpdateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "contracts.obligationsManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await update_contract_obligation(session, service_context(context, tenant_id), contract_id, obligation_id, request)
        return ApiSuccess(data=row, message="Yükümlülük güncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/{contract_id}/events", response_model=ApiSuccess[list[dict[str, Any]]])
async def contract_events(contract_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "contracts.view")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await list_events(session, service_context(context, tenant_id), contract_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/{contract_id}/documents", response_model=ApiSuccess[list[dict[str, Any]]])
async def contract_documents(contract_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "contracts.view")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await list_contract_documents(session, service_context(context, tenant_id), contract_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/{contract_id}/documents/upload", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def contract_document_upload(contract_id: str, request: DocumentUploadRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "contracts.documentsUpload")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await upload_document_for_entity(session, document_service_context(context, tenant_id), "contract", contract_id, request)
        return ApiSuccess(data=row, message=row.get("message") or "Sözleşme belgesi yüklendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


def ensure_permission(context: RequestContext, permission_key: str) -> None:
    if not has_permission(context, permission_key):
        raise DomainError("Bu işlem için yetkiniz bulunmuyor.", "PERMISSION_DENIED", status.HTTP_403_FORBIDDEN)


# Alias keeps route declaration readable and avoids shadowing the service import in a long file.
from app.domains.contracts.service import update_obligation as update_contract_obligation  # noqa: E402
