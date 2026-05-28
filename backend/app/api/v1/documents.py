# ruff: noqa: B008, E501

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.documents.schemas import (
    DocumentCreateRequest,
    DocumentListQuery,
    DocumentRejectRequest,
    DocumentUpdateRequest,
    DocumentUploadRequest,
)
from app.domains.documents.service import (
    create_document,
    create_new_version,
    delete_document,
    get_document,
    get_document_url,
    list_access_logs,
    list_documents,
    list_documents_by_entity,
    list_expiring_documents,
    list_requirements,
    reject_document,
    service_context,
    update_document,
    upload_document,
    upload_document_for_entity,
    verify_document,
)
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("/documents", response_model=ApiSuccess[dict[str, Any]])
async def documents_list(
    session: SessionDep,
    context: RequestContextDep,
    document_type: str | None = Query(default=None),
    document_category: str | None = Query(default=None),
    status_value: str | None = Query(default=None, alias="status"),
    verification_status: str | None = Query(default=None),
    required: bool | None = Query(default=None),
    company_id: str | None = Query(default=None),
    owner_entity_type: str | None = Query(default=None),
    owner_entity_id: str | None = Query(default=None),
    uploaded_by: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    sort: str = Query(default="created_at"),
    direction: str = Query(default="desc"),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.view")
    tenant_id = require_tenant(context)
    try:
        query = DocumentListQuery(document_type=document_type, document_category=document_category, status=status_value, verification_status=verification_status, required=required, company_id=company_id, owner_entity_type=owner_entity_type, owner_entity_id=owner_entity_id, uploaded_by=uploaded_by, search=search, page=page, page_size=page_size, sort=sort, direction="asc" if direction == "asc" else "desc")
        return ApiSuccess(data=await list_documents(session, service_context(context, tenant_id), query))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/documents", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def documents_create(request: DocumentCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.upload")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await create_document(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=row, message="Belge metadata olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/documents/upload", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def documents_upload(request: DocumentUploadRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.upload")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await upload_document(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=row, message="Belge yuklendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/documents/expiring", response_model=ApiSuccess[list[dict[str, Any]]])
async def documents_expiring(session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "documents.view")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await list_expiring_documents(session, service_context(context, tenant_id), expired=False))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/documents/expired", response_model=ApiSuccess[list[dict[str, Any]]])
async def documents_expired(session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "documents.view")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await list_expiring_documents(session, service_context(context, tenant_id), expired=True))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/documents/requirements", response_model=ApiSuccess[list[dict[str, Any]]])
async def documents_requirements(
    session: SessionDep,
    context: RequestContextDep,
    module_key: str | None = Query(default=None),
    operation_key: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "documents.view")
    tenant_id = require_tenant(context)
    return ApiSuccess(data=await list_requirements(session, service_context(context, tenant_id), module_key=module_key, operation_key=operation_key, entity_type=entity_type))


@router.get("/documents/requirements/{module_key}/{operation_key}", response_model=ApiSuccess[list[dict[str, Any]]])
async def documents_requirements_for_operation(module_key: str, operation_key: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "documents.view")
    tenant_id = require_tenant(context)
    return ApiSuccess(data=await list_requirements(session, service_context(context, tenant_id), module_key=module_key, operation_key=operation_key))


@router.get("/documents/by-entity/{entity_type}/{entity_id}", response_model=ApiSuccess[list[dict[str, Any]]])
async def documents_by_entity(entity_type: str, entity_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "documents.view")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await list_documents_by_entity(session, service_context(context, tenant_id), entity_type, entity_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/documents/by-entity/{entity_type}/{entity_id}/upload", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def documents_by_entity_upload(entity_type: str, entity_id: str, request: DocumentUploadRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.upload")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await upload_document_for_entity(session, service_context(context, tenant_id), entity_type, entity_id, request)
        return ApiSuccess(data=row, message="Kayda belge yuklendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/documents/{document_id}", response_model=ApiSuccess[dict[str, Any]])
async def documents_get(document_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.view")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await get_document(session, service_context(context, tenant_id), document_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/documents/{document_id}", response_model=ApiSuccess[dict[str, Any]])
async def documents_patch(document_id: str, request: DocumentUpdateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.upload")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await update_document(session, service_context(context, tenant_id), document_id, request)
        return ApiSuccess(data=row, message="Belge guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.delete("/documents/{document_id}", response_model=ApiSuccess[dict[str, Any]])
async def documents_delete(document_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.delete")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await delete_document(session, service_context(context, tenant_id), document_id)
        return ApiSuccess(data=row, message="Belge silindi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/documents/{document_id}/new-version", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def documents_new_version(document_id: str, request: DocumentUploadRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.upload")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await create_new_version(session, service_context(context, tenant_id), document_id, request)
        return ApiSuccess(data=row, message="Belge yeni versiyonu olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/documents/{document_id}/verify", response_model=ApiSuccess[dict[str, Any]])
async def documents_verify(document_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.verify")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await verify_document(session, service_context(context, tenant_id), document_id)
        return ApiSuccess(data=row, message="Belge dogrulandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/documents/{document_id}/reject", response_model=ApiSuccess[dict[str, Any]])
async def documents_reject(document_id: str, request: DocumentRejectRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.reject")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await reject_document(session, service_context(context, tenant_id), document_id, request)
        return ApiSuccess(data=row, message="Belge reddedildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/documents/{document_id}/download-url", response_model=ApiSuccess[dict[str, Any]])
async def documents_download_url(document_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.download")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            return ApiSuccess(data=await get_document_url(session, service_context(context, tenant_id), document_id, action="download"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/documents/{document_id}/preview-url", response_model=ApiSuccess[dict[str, Any]])
async def documents_preview_url(document_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "documents.view")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            return ApiSuccess(data=await get_document_url(session, service_context(context, tenant_id), document_id, action="preview"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/documents/{document_id}/access-logs", response_model=ApiSuccess[list[dict[str, Any]]])
async def documents_access_logs(document_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "documents.accessLogsView")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await list_access_logs(session, service_context(context, tenant_id), document_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


def ensure_permission(context: RequestContext, permission_key: str) -> None:
    if not has_permission(context, permission_key):
        raise DomainError("Bu islem icin yetkiniz bulunmuyor.", "PERMISSION_DENIED", status.HTTP_403_FORBIDDEN)

