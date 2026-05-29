# ruff: noqa: B008, E501

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.portal.access import PortalAccessContext, get_portal_access_context
from app.domains.portal.admin import create_portal_invitation, list_portal_users, update_portal_user
from app.domains.portal.dashboard import portal_dashboard
from app.domains.portal.documents import (
    list_portal_documents,
    portal_document_download_url,
    upload_portal_document,
)
from app.domains.portal.notifications import (
    list_portal_notifications,
    mark_portal_notification_read,
)
from app.domains.portal.products import get_portal_product, list_portal_products
from app.domains.portal.schemas import (
    PortalAttachmentRequest,
    PortalCommentRequest,
    PortalDocumentUploadRequest,
    PortalInvitationCreateRequest,
    PortalServiceRequestCreateRequest,
    PortalUserListQuery,
    PortalUserUpdateRequest,
)
from app.domains.portal.service import record_portal_activity
from app.domains.portal.service_requests import (
    append_portal_attachments,
    append_portal_comment,
    create_portal_service_request,
    get_portal_service_record,
    get_portal_service_request,
    list_portal_service_records,
    list_portal_service_requests,
)
from app.schemas.common import ApiSuccess

router = APIRouter()
admin_router = APIRouter(dependencies=[Depends(require_access_context)])

SessionDep = Annotated[AsyncSession, Depends(get_session)]
PortalContextDep = Annotated[PortalAccessContext, Depends(get_portal_access_context)]
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]


@router.get("/me", response_model=ApiSuccess[dict[str, Any]])
async def portal_me(session: SessionDep, portal_context: PortalContextDep) -> ApiSuccess[dict[str, Any]]:
    try:
        async with session.begin():
            await record_portal_activity(session, portal_context, action_type="portal_login", entity_type="portal_user", entity_id=portal_context.portal_user_id)
        return ApiSuccess(
            data={
                "id": portal_context.portal_user_id,
                "auth_user_id": portal_context.auth_user_id,
                "external_user_type": portal_context.external_user_type,
                "stakeholder_id": portal_context.stakeholder_id,
                "customer_account_id": portal_context.customer_account_id,
                "portal_role": portal_context.portal_role,
                "status": portal_context.status,
                "stakeholder": portal_context.stakeholder,
                "access_scope": portal_context.access_scope,
                "preferences": portal_context.preferences,
            }
        )
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/dashboard", response_model=ApiSuccess[dict[str, Any]])
async def portal_dashboard_get(session: SessionDep, portal_context: PortalContextDep) -> ApiSuccess[dict[str, Any]]:
    try:
        return ApiSuccess(data=await portal_dashboard(session, portal_context))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/products", response_model=ApiSuccess[dict[str, Any]])
async def portal_products_list(
    session: SessionDep,
    portal_context: PortalContextDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[dict[str, Any]]:
    try:
        return ApiSuccess(data=await list_portal_products(session, portal_context, page=page, page_size=page_size))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/products/{asset_id}", response_model=ApiSuccess[dict[str, Any]])
async def portal_products_get(asset_id: str, session: SessionDep, portal_context: PortalContextDep) -> ApiSuccess[dict[str, Any]]:
    try:
        async with session.begin():
            payload = await get_portal_product(session, portal_context, asset_id)
        return ApiSuccess(data=payload)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/service-requests", response_model=ApiSuccess[dict[str, Any]])
async def portal_service_requests_list(
    session: SessionDep,
    portal_context: PortalContextDep,
    status_value: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[dict[str, Any]]:
    try:
        return ApiSuccess(data=await list_portal_service_requests(session, portal_context, status_value=status_value, page=page, page_size=page_size))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/service-requests", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def portal_service_requests_create(request: PortalServiceRequestCreateRequest, session: SessionDep, portal_context: PortalContextDep) -> ApiSuccess[dict[str, Any]]:
    try:
        async with session.begin():
            row = await create_portal_service_request(session, portal_context, request)
        return ApiSuccess(data=row, message="Servis talebiniz alindi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/service-requests/{request_id}", response_model=ApiSuccess[dict[str, Any]])
async def portal_service_requests_get(request_id: str, session: SessionDep, portal_context: PortalContextDep) -> ApiSuccess[dict[str, Any]]:
    try:
        async with session.begin():
            row = await get_portal_service_request(session, portal_context, request_id)
        return ApiSuccess(data=row)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/service-requests/{request_id}/comments", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def portal_service_requests_comment(request_id: str, request: PortalCommentRequest, session: SessionDep, portal_context: PortalContextDep) -> ApiSuccess[dict[str, Any]]:
    try:
        async with session.begin():
            row = await append_portal_comment(session, portal_context, request_id, request)
        return ApiSuccess(data=row, message="Yorumunuz servis talebine eklendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/service-requests/{request_id}/attachments", response_model=ApiSuccess[dict[str, Any]])
async def portal_service_requests_attachments(request_id: str, request: PortalAttachmentRequest, session: SessionDep, portal_context: PortalContextDep) -> ApiSuccess[dict[str, Any]]:
    try:
        async with session.begin():
            row = await append_portal_attachments(session, portal_context, request_id, request)
        return ApiSuccess(data=row, message="Ekler servis talebine baglandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/service-records", response_model=ApiSuccess[dict[str, Any]])
async def portal_service_records_list(
    session: SessionDep,
    portal_context: PortalContextDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[dict[str, Any]]:
    try:
        return ApiSuccess(data=await list_portal_service_records(session, portal_context, page=page, page_size=page_size))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/service-records/{service_id}", response_model=ApiSuccess[dict[str, Any]])
async def portal_service_records_get(service_id: str, session: SessionDep, portal_context: PortalContextDep) -> ApiSuccess[dict[str, Any]]:
    try:
        async with session.begin():
            row = await get_portal_service_record(session, portal_context, service_id)
        return ApiSuccess(data=row)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/documents", response_model=ApiSuccess[dict[str, Any]])
async def portal_documents_list(
    session: SessionDep,
    portal_context: PortalContextDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[dict[str, Any]]:
    try:
        return ApiSuccess(data=await list_portal_documents(session, portal_context, page=page, page_size=page_size))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/documents/upload", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def portal_documents_upload(request: PortalDocumentUploadRequest, session: SessionDep, portal_context: PortalContextDep) -> ApiSuccess[dict[str, Any]]:
    try:
        async with session.begin():
            row = await upload_portal_document(session, portal_context, request)
        return ApiSuccess(data=row, message="Belge portala yuklendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/documents/{document_id}/download-url", response_model=ApiSuccess[dict[str, Any]])
async def portal_documents_download_url(document_id: str, session: SessionDep, portal_context: PortalContextDep) -> ApiSuccess[dict[str, Any]]:
    try:
        async with session.begin():
            payload = await portal_document_download_url(session, portal_context, document_id)
        return ApiSuccess(data=payload)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/notifications", response_model=ApiSuccess[list[dict[str, Any]]])
async def portal_notifications_list(session: SessionDep, portal_context: PortalContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    try:
        return ApiSuccess(data=await list_portal_notifications(session, portal_context))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/notifications/{notification_id}/read", response_model=ApiSuccess[dict[str, Any]])
async def portal_notifications_read(notification_id: str, session: SessionDep, portal_context: PortalContextDep) -> ApiSuccess[dict[str, Any]]:
    try:
        async with session.begin():
            row = await mark_portal_notification_read(session, portal_context, notification_id)
        return ApiSuccess(data=row, message="Bildirim okundu olarak isaretlendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@admin_router.post("/invitations", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def admin_portal_invitations_create(request: PortalInvitationCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_admin_permission(context, "portal.inviteUsers")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            invitation = await create_portal_invitation(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=invitation, message="Portal daveti olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@admin_router.get("/users", response_model=ApiSuccess[dict[str, Any]])
async def admin_portal_users_list(
    session: SessionDep,
    context: RequestContextDep,
    stakeholder_id: str | None = Query(default=None),
    status_value: str | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[dict[str, Any]]:
    ensure_admin_permission(context, "portal.manageUsers")
    tenant_id = require_tenant(context)
    try:
        query = PortalUserListQuery(stakeholder_id=stakeholder_id, status=status_value, search=search, page=page, page_size=page_size)
        return ApiSuccess(data=await list_portal_users(session, service_context(context, tenant_id), query))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@admin_router.patch("/users/{portal_user_id}", response_model=ApiSuccess[dict[str, Any]])
async def admin_portal_users_update(portal_user_id: str, request: PortalUserUpdateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    permission = "portal.suspendUsers" if request.status in {"suspended", "revoked"} else "portal.manageUsers"
    ensure_admin_permission(context, permission)
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await update_portal_user(session, service_context(context, tenant_id), portal_user_id, request)
        return ApiSuccess(data=row, message="Portal kullanicisi guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


def service_context(context: RequestContext, tenant_id: str) -> dict[str, Any]:
    return {
        "tenant_id": tenant_id,
        "user_id": context.user_id,
        "company_id": getattr(context, "company_id", None),
        "permissions": sorted(context.permissions),
        "company_scope_ids": sorted(context.company_scope_ids or []),
        "writable_company_scope_ids": sorted(context.writable_company_scope_ids or []),
    }


def ensure_admin_permission(context: RequestContext, permission_key: str) -> None:
    if has_permission(context, permission_key) or has_permission(context, "portal.manageUsers") or has_permission(context, "system.admin"):
        return
    raise domain_error_to_http(
        DomainError(
            "Musteri portali yonetimi icin yetkiniz bulunmuyor.",
            "PORTAL_ADMIN_PERMISSION_DENIED",
            status.HTTP_403_FORBIDDEN,
            {"permission": permission_key},
        )
    )
