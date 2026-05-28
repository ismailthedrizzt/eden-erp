# ruff: noqa: B008, E501

from __future__ import annotations

from typing import Annotated, Any, cast

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.notifications.email import (
    list_email_messages,
    queue_test_email,
    retry_email_message,
)
from app.domains.notifications.notifications import (
    archive_notification,
    dismiss_notification,
    get_notification,
    get_unread_counts,
    list_notifications,
    mark_all_read,
    mark_read,
)
from app.domains.notifications.preferences import get_preferences, patch_preferences
from app.domains.notifications.reminders import (
    cancel_reminder,
    create_reminder,
    dismiss_reminder,
    list_reminders,
)
from app.domains.notifications.schemas import (
    EmailListQuery,
    EmailStatus,
    EmailTestRequest,
    NotificationListQuery,
    NotificationPreferencePatch,
    NotificationPriority,
    NotificationSeverity,
    NotificationStatus,
    ReminderCreateRequest,
    ReminderListQuery,
    ReminderStatus,
)
from app.domains.notifications.service import (
    service_context,
)
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("/notifications", response_model=ApiSuccess[dict[str, Any]])
async def notifications_list(
    session: SessionDep,
    context: RequestContextDep,
    status_value: str | None = Query(default=None, alias="status"),
    notification_type: str | None = Query(default=None),
    module_key: str | None = Query(default=None),
    severity: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    action_required: bool | None = Query(default=None),
    related_entity_type: str | None = Query(default=None),
    related_entity_id: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "notifications.view")
    tenant_id = require_tenant(context)
    try:
        query = NotificationListQuery(
            status=cast(NotificationStatus | None, status_value),
            notification_type=notification_type,
            module_key=module_key,
            severity=cast(NotificationSeverity | None, severity),
            priority=cast(NotificationPriority | None, priority),
            action_required=action_required,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
            search=search,
            page=page,
            page_size=page_size,
        )
        return ApiSuccess(data=await list_notifications(session, service_context(context, tenant_id), query))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/notifications/counts", response_model=ApiSuccess[dict[str, Any]])
async def notification_counts(session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "notifications.view")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await get_unread_counts(session, service_context(context, tenant_id)))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/notifications/preferences", response_model=ApiSuccess[dict[str, Any]])
async def notification_preferences_get(session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "notifications.manage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            return ApiSuccess(data=await get_preferences(session, service_context(context, tenant_id)))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/notifications/preferences", response_model=ApiSuccess[dict[str, Any]])
async def notification_preferences_patch(
    request: NotificationPreferencePatch,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "notifications.manage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await patch_preferences(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=row, message="Bildirim tercihleri guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/notifications/{notification_id}", response_model=ApiSuccess[dict[str, Any]])
async def notification_get(
    notification_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "notifications.view")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await get_notification(session, service_context(context, tenant_id), notification_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/notifications/{notification_id}/read", response_model=ApiSuccess[dict[str, Any]])
async def notification_read(
    notification_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "notifications.view")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await mark_read(session, service_context(context, tenant_id), notification_id)
        return ApiSuccess(data=row)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/notifications/read-all", response_model=ApiSuccess[dict[str, Any]])
async def notifications_read_all(session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "notifications.view")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            return ApiSuccess(data=await mark_all_read(session, service_context(context, tenant_id)))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/notifications/{notification_id}/dismiss", response_model=ApiSuccess[dict[str, Any]])
async def notification_dismiss(
    notification_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "notifications.view")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await dismiss_notification(session, service_context(context, tenant_id), notification_id)
        return ApiSuccess(data=row)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/notifications/{notification_id}/archive", response_model=ApiSuccess[dict[str, Any]])
async def notification_archive(
    notification_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "notifications.view")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await archive_notification(session, service_context(context, tenant_id), notification_id)
        return ApiSuccess(data=row)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/reminders", response_model=ApiSuccess[dict[str, Any]])
async def reminders_list(
    session: SessionDep,
    context: RequestContextDep,
    status_value: str | None = Query(default=None, alias="status"),
    module_key: str | None = Query(default=None),
    reminder_type: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reminders.manage")
    tenant_id = require_tenant(context)
    try:
        query = ReminderListQuery(status=cast(ReminderStatus | None, status_value), module_key=module_key, reminder_type=reminder_type, page=page, page_size=page_size)
        return ApiSuccess(data=await list_reminders(session, service_context(context, tenant_id), query))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/reminders", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def reminders_create(
    request: ReminderCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reminders.manage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await create_reminder(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=row, message="Hatirlatma olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/reminders/{reminder_id}/dismiss", response_model=ApiSuccess[dict[str, Any]])
async def reminder_dismiss(reminder_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reminders.manage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            return ApiSuccess(data=await dismiss_reminder(session, service_context(context, tenant_id), reminder_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/reminders/{reminder_id}/cancel", response_model=ApiSuccess[dict[str, Any]])
async def reminder_cancel(reminder_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reminders.manage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            return ApiSuccess(data=await cancel_reminder(session, service_context(context, tenant_id), reminder_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/system/email/messages", response_model=ApiSuccess[dict[str, Any]])
async def system_email_messages(
    session: SessionDep,
    context: RequestContextDep,
    status_value: str | None = Query(default=None, alias="status"),
    template_key: str | None = Query(default=None),
    related_entity_type: str | None = Query(default=None),
    related_entity_id: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "email.admin")
    tenant_id = require_tenant(context)
    try:
        query = EmailListQuery(status=cast(EmailStatus | None, status_value), template_key=template_key, related_entity_type=related_entity_type, related_entity_id=related_entity_id, search=search, page=page, page_size=page_size)
        return ApiSuccess(data=await list_email_messages(session, service_context(context, tenant_id), query))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/system/email/messages/{message_id}/retry", response_model=ApiSuccess[dict[str, Any]])
async def system_email_retry(message_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "email.admin")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await retry_email_message(session, service_context(context, tenant_id), message_id)
        return ApiSuccess(data=row, message="E-posta tekrar kuyruga alindi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/system/email/test", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def system_email_test(
    request: EmailTestRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "email.admin")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await queue_test_email(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=row, message="Test e-postasi kuyruga alindi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


def ensure_permission(context: RequestContext, permission_key: str) -> None:
    if not has_permission(context, permission_key):
        raise DomainError("Bu islem icin yetkiniz bulunmuyor.", "PERMISSION_DENIED", status.HTTP_403_FORBIDDEN)
