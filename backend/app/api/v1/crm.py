# ruff: noqa: E501, I001

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.crm.interactions import create_interaction, list_interactions
from app.domains.crm.master_data import create_master_organization, create_master_person, search_master_organizations, search_master_persons
from app.domains.crm.schemas import CreateCariAccountFromStakeholderRequest, CreateFollowupTaskRequest, InteractionCreateRequest, MasterOrganizationCreateRequest, MasterOrganizationSearchQuery, MasterPersonCreateRequest, MasterPersonSearchQuery, StakeholderCreateRequest, StakeholderListQuery, StakeholderUpdateRequest
from app.domains.crm.stakeholders import create_cari_account_for_stakeholder, create_followup_task_for_stakeholder, create_stakeholder, delete_stakeholder, get_stakeholder, list_stakeholders, related_records, stakeholder_summary, update_stakeholder
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("/master/persons/search", response_model=ApiSuccess[dict[str, Any]])
async def master_persons_search(
    session: SessionDep,
    context: RequestContextDep,
    nationality: str | None = Query(default=None),
    identity_number: str | None = Query(default=None),
    passport_no: str | None = Query(default=None),
    full_name: str | None = Query(default=None),
    phone: str | None = Query(default=None),
    email: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, alias="pageSize", ge=1, le=100),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.view")
    tenant_id = require_tenant(context)
    try:
        result = await search_master_persons(session, service_context(context, tenant_id), MasterPersonSearchQuery(nationality=nationality, identity_number=identity_number, passport_no=passport_no, full_name=full_name, phone=phone, email=email, search=search, page=page, page_size=page_size))
        return ApiSuccess(data=result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/master/persons", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def master_persons_create(request: MasterPersonCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.create")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            person = await create_master_person(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=person, message="Master kisi kaydi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/master/organizations/search", response_model=ApiSuccess[dict[str, Any]])
async def master_organizations_search(
    session: SessionDep,
    context: RequestContextDep,
    country: str | None = Query(default=None),
    tax_number: str | None = Query(default=None),
    registry_number: str | None = Query(default=None),
    trade_name: str | None = Query(default=None),
    city: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, alias="pageSize", ge=1, le=100),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.view")
    tenant_id = require_tenant(context)
    try:
        result = await search_master_organizations(session, service_context(context, tenant_id), MasterOrganizationSearchQuery(country=country, tax_number=tax_number, registry_number=registry_number, trade_name=trade_name, city=city, search=search, page=page, page_size=page_size))
        return ApiSuccess(data=result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/master/organizations", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def master_organizations_create(request: MasterOrganizationCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.create")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            organization = await create_master_organization(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=organization, message="Master kurum kaydi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/stakeholders", response_model=ApiSuccess[dict[str, Any]])
async def stakeholders_list(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    stakeholder_type: str | None = Query(default=None),
    relationship_status: str | None = Query(default=None),
    customer_status: str | None = Query(default=None),
    supplier_status: str | None = Query(default=None),
    city: str | None = Query(default=None),
    sector: str | None = Query(default=None),
    owner_user_id: str | None = Query(default=None),
    has_cari_account: bool | None = Query(default=None),
    tag: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    sort: str = Query(default="updated_at"),
    direction: str = Query(default="desc"),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.view")
    tenant_id = require_tenant(context)
    try:
        result = await list_stakeholders(session, service_context(context, tenant_id), StakeholderListQuery(company_id=company_id, stakeholder_type=stakeholder_type, relationship_status=relationship_status, customer_status=customer_status, supplier_status=supplier_status, city=city, sector=sector, owner_user_id=owner_user_id, has_cari_account=has_cari_account, tag=tag, search=search, page=page, page_size=page_size, sort=sort, direction=direction))
        return ApiSuccess(data=result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/stakeholders", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def stakeholders_create(request: StakeholderCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.create")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            stakeholder = await create_stakeholder(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=stakeholder, message="Paydas kaydi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/stakeholders/{stakeholder_id}", response_model=ApiSuccess[dict[str, Any]])
async def stakeholders_get(stakeholder_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.view")
    tenant_id = require_tenant(context)
    try:
        stakeholder = await get_stakeholder(session, service_context(context, tenant_id), stakeholder_id)
        if not stakeholder:
            raise DomainError("Paydas kaydi bulunamadi.", "STAKEHOLDER_NOT_FOUND", 404)
        return ApiSuccess(data=stakeholder)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/stakeholders/{stakeholder_id}", response_model=ApiSuccess[dict[str, Any]])
async def stakeholders_update(stakeholder_id: str, request: StakeholderUpdateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            stakeholder = await update_stakeholder(session, service_context(context, tenant_id), stakeholder_id, request)
        return ApiSuccess(data=stakeholder, message="Paydas kaydi guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.delete("/stakeholders/{stakeholder_id}", response_model=ApiSuccess[dict[str, Any]])
async def stakeholders_delete(stakeholder_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.delete")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await delete_stakeholder(session, service_context(context, tenant_id), stakeholder_id)
        return ApiSuccess(data=result, message=result.get("message"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/stakeholders/{stakeholder_id}/interactions", response_model=ApiSuccess[list[dict[str, Any]]])
async def stakeholder_interactions_list(stakeholder_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "crm.view")
    tenant_id = require_tenant(context)
    try:
        rows = await list_interactions(session, service_context(context, tenant_id), stakeholder_id)
        return ApiSuccess(data=rows)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/stakeholders/{stakeholder_id}/interactions", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def stakeholder_interactions_create(stakeholder_id: str, request: InteractionCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.interactionsManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            interaction = await create_interaction(session, service_context(context, tenant_id), stakeholder_id, request)
        return ApiSuccess(data=interaction, message="Etkilesim eklendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/stakeholders/{stakeholder_id}/related-records", response_model=ApiSuccess[dict[str, Any]])
async def stakeholder_related_records(stakeholder_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.view")
    tenant_id = require_tenant(context)
    try:
        result = await related_records(session, service_context(context, tenant_id), stakeholder_id)
        return ApiSuccess(data=result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/stakeholders/{stakeholder_id}/summary", response_model=ApiSuccess[dict[str, Any]])
async def stakeholder_summary_endpoint(stakeholder_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.view")
    tenant_id = require_tenant(context)
    try:
        summary = await stakeholder_summary(session, service_context(context, tenant_id), stakeholder_id)
        return ApiSuccess(data=summary.model_dump())
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/stakeholders/{stakeholder_id}/create-cari-account", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def stakeholder_create_cari_account(stakeholder_id: str, request: CreateCariAccountFromStakeholderRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.createCariAccount")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await create_cari_account_for_stakeholder(session, service_context(context, tenant_id), stakeholder_id, request)
        return ApiSuccess(data=result, message="Paydas icin cari kart olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/stakeholders/{stakeholder_id}/create-followup-task", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def stakeholder_create_followup_task(stakeholder_id: str, request: CreateFollowupTaskRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "crm.createTask")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await create_followup_task_for_stakeholder(session, service_context(context, tenant_id), stakeholder_id, request)
        return ApiSuccess(data=result, message="Takip gorevi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


def ensure_permission(context: RequestContext, permission_key: str) -> None:
    if not has_permission(context, permission_key):
        raise DomainError("Bu islem icin yetkiniz bulunmuyor.", "PERMISSION_DENIED", status.HTTP_403_FORBIDDEN)


def service_context(context: RequestContext, tenant_id: str) -> dict[str, Any]:
    return {
        "tenant_id": tenant_id,
        "user_id": context.user_id,
        "permissions": context.permissions,
        "company_scope_ids": context.company_scope_ids,
        "writable_company_scope_ids": context.writable_company_scope_ids,
    }
