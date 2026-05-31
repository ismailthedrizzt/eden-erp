# ruff: noqa: B008, E501

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, require_access_context, require_tenant
from app.domains.integrations.apps import create_app, get_app, list_apps, set_app_status, update_app
from app.domains.integrations.credentials import (
    create_credential,
    list_credentials,
    revoke_credential,
    rotate_credential,
)
from app.domains.integrations.deliveries import get_delivery, list_deliveries, retry_delivery
from app.domains.integrations.event_subscriptions import get_event_type, list_event_types
from app.domains.integrations.inbound import list_inbound_events, receive_inbound_event
from app.domains.integrations.schemas import (
    CredentialCreateRequest,
    IntegrationAppCreateRequest,
    IntegrationAppListQuery,
    IntegrationAppUpdateRequest,
    WebhookDeliveryListQuery,
    WebhookSubscriptionCreateRequest,
    WebhookSubscriptionListQuery,
    WebhookSubscriptionUpdateRequest,
)
from app.domains.integrations.service import can, service_context
from app.domains.integrations.webhooks import (
    create_subscription,
    create_test_delivery,
    get_subscription,
    list_subscriptions,
    set_subscription_status,
    update_subscription,
)
from app.schemas.common import ApiSuccess

router = APIRouter()

SessionDep = Annotated[AsyncSession, Depends(get_session)]
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]


@router.get("/apps", response_model=ApiSuccess[dict[str, Any]])
async def apps_list(
    session: SessionDep,
    context: RequestContextDep,
    app_type: str | None = Query(default=None),
    status_value: str | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "integrations.view")
    tenant_id = require_tenant(context)
    try:
        result = await list_apps(service_context(session, context, tenant_id), IntegrationAppListQuery(app_type=app_type, status=status_value, search=search, page=page, page_size=page_size))
        return ApiSuccess(data=result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/apps", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def apps_create(request: IntegrationAppCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "integrations.manageApps")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await create_app(service_context(session, context, tenant_id), request)
        return ApiSuccess(data=row, message="Integration app olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/apps/{app_id}", response_model=ApiSuccess[dict[str, Any]])
async def apps_get(app_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "integrations.view")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await get_app(service_context(session, context, tenant_id), app_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/apps/{app_id}", response_model=ApiSuccess[dict[str, Any]])
async def apps_update(app_id: str, request: IntegrationAppUpdateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "integrations.manageApps")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await update_app(service_context(session, context, tenant_id), app_id, request)
        return ApiSuccess(data=row, message="Integration app guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/apps/{app_id}/suspend", response_model=ApiSuccess[dict[str, Any]])
async def apps_suspend(app_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    return await _app_status(app_id, "suspended", session, context, "Integration app askiya alindi.")


@router.post("/apps/{app_id}/revoke", response_model=ApiSuccess[dict[str, Any]])
async def apps_revoke(app_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    return await _app_status(app_id, "revoked", session, context, "Integration app iptal edildi.")


@router.post("/apps/{app_id}/credentials", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def credentials_create(app_id: str, request: CredentialCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "integrations.manageCredentials")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await create_credential(service_context(session, context, tenant_id), app_id, request)
        return ApiSuccess(data=row, message="Credential olusturuldu. Secret yalnizca bu cevapta gosterilir.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/apps/{app_id}/credentials", response_model=ApiSuccess[list[dict[str, Any]]])
async def credentials_list(app_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "integrations.manageCredentials")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await list_credentials(service_context(session, context, tenant_id), app_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/credentials/{credential_id}/revoke", response_model=ApiSuccess[dict[str, Any]])
async def credentials_revoke(credential_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "integrations.manageCredentials")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await revoke_credential(service_context(session, context, tenant_id), credential_id)
        return ApiSuccess(data=row, message="Credential iptal edildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/credentials/{credential_id}/rotate", response_model=ApiSuccess[dict[str, Any]])
async def credentials_rotate(credential_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "integrations.manageCredentials")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await rotate_credential(service_context(session, context, tenant_id), credential_id)
        return ApiSuccess(data=row, message="Credential rotate edildi. Yeni secret yalnizca bu cevapta gosterilir.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/webhook-subscriptions", response_model=ApiSuccess[dict[str, Any]])
async def webhook_subscriptions_list(
    session: SessionDep,
    context: RequestContextDep,
    integration_app_id: str | None = Query(default=None),
    status_value: str | None = Query(default=None, alias="status"),
    event_type: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "integrations.manageWebhooks")
    tenant_id = require_tenant(context)
    try:
        result = await list_subscriptions(service_context(session, context, tenant_id), WebhookSubscriptionListQuery(integration_app_id=integration_app_id, status=status_value, event_type=event_type, search=search, page=page, page_size=page_size))
        return ApiSuccess(data=result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/webhook-subscriptions", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def webhook_subscriptions_create(request: WebhookSubscriptionCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "integrations.manageWebhooks")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await create_subscription(service_context(session, context, tenant_id), request)
        return ApiSuccess(data=row, message="Webhook aboneligi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/webhook-subscriptions/{subscription_id}", response_model=ApiSuccess[dict[str, Any]])
async def webhook_subscriptions_get(subscription_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "integrations.manageWebhooks")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await get_subscription(service_context(session, context, tenant_id), subscription_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/webhook-subscriptions/{subscription_id}", response_model=ApiSuccess[dict[str, Any]])
async def webhook_subscriptions_update(subscription_id: str, request: WebhookSubscriptionUpdateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "integrations.manageWebhooks")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await update_subscription(service_context(session, context, tenant_id), subscription_id, request)
        return ApiSuccess(data=row, message="Webhook aboneligi guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/webhook-subscriptions/{subscription_id}/pause", response_model=ApiSuccess[dict[str, Any]])
async def webhook_subscriptions_pause(subscription_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    return await _subscription_status(subscription_id, "paused", session, context, "Webhook aboneligi duraklatildi.")


@router.post("/webhook-subscriptions/{subscription_id}/resume", response_model=ApiSuccess[dict[str, Any]])
async def webhook_subscriptions_resume(subscription_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    return await _subscription_status(subscription_id, "active", session, context, "Webhook aboneligi aktif edildi.")


@router.post("/webhook-subscriptions/{subscription_id}/test", response_model=ApiSuccess[dict[str, Any]])
async def webhook_subscriptions_test(subscription_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "integrations.manageWebhooks")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await create_test_delivery(service_context(session, context, tenant_id), subscription_id)
        return ApiSuccess(data=row, message="Test webhook teslimati kuyruga alindi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/webhook-deliveries", response_model=ApiSuccess[dict[str, Any]])
async def webhook_deliveries_list(
    session: SessionDep,
    context: RequestContextDep,
    subscription_id: str | None = Query(default=None),
    integration_app_id: str | None = Query(default=None),
    status_value: str | None = Query(default=None, alias="status"),
    event_type: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "integrations.viewDeliveries")
    tenant_id = require_tenant(context)
    try:
        result = await list_deliveries(service_context(session, context, tenant_id), WebhookDeliveryListQuery(subscription_id=subscription_id, integration_app_id=integration_app_id, status=status_value, event_type=event_type, page=page, page_size=page_size))
        return ApiSuccess(data=result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/webhook-deliveries/{delivery_id}", response_model=ApiSuccess[dict[str, Any]])
async def webhook_deliveries_get(delivery_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "integrations.viewDeliveries")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await get_delivery(service_context(session, context, tenant_id), delivery_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/webhook-deliveries/{delivery_id}/retry", response_model=ApiSuccess[dict[str, Any]])
async def webhook_deliveries_retry(delivery_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "integrations.retryDelivery")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await retry_delivery(service_context(session, context, tenant_id), delivery_id)
        return ApiSuccess(data=row, message="Webhook teslimati tekrar kuyruga alindi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/inbound-events", response_model=ApiSuccess[dict[str, Any]])
async def inbound_events_list(
    session: SessionDep,
    context: RequestContextDep,
    integration_app_id: str | None = Query(default=None),
    status_value: str | None = Query(default=None, alias="status"),
    inbound_event_type: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "integrations.viewInbound")
    tenant_id = require_tenant(context)
    try:
        result = await list_inbound_events(service_context(session, context, tenant_id), integration_app_id=integration_app_id, status_value=status_value, inbound_event_type=inbound_event_type, page=page, page_size=page_size)
        return ApiSuccess(data=result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/inbound/{app_key}/{event_type}", response_model=ApiSuccess[dict[str, Any]], status_code=202)
async def inbound_receive(app_key: str, event_type: str, request: Request, session: SessionDep) -> ApiSuccess[dict[str, Any]]:
    tenant_id = request.headers.get("x-tenant-id")
    if not tenant_id:
        raise domain_error_to_http(DomainError("Inbound webhook tenant header zorunludur.", "INBOUND_TENANT_REQUIRED", status.HTTP_400_BAD_REQUEST))
    try:
        raw_body = await request.body()
        async with session.begin():
            row = await receive_inbound_event(session, tenant_id=tenant_id, app_key=app_key, event_type=event_type, raw_body=raw_body, headers=dict(request.headers))
        return ApiSuccess(data=row, message="Inbound event kabul edildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/event-types", response_model=ApiSuccess[list[dict[str, Any]]])
async def event_types_list(context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "integrations.view")
    return ApiSuccess(data=list_event_types())


@router.get("/event-types/{event_type}", response_model=ApiSuccess[dict[str, Any]])
async def event_types_get(event_type: str, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "integrations.view")
    try:
        return ApiSuccess(data=get_event_type(event_type))
    except DomainError as error:
        raise domain_error_to_http(error) from error


async def _app_status(app_id: str, status_value: str, session: AsyncSession, context: RequestContext, message: str) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "integrations.manageApps")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await set_app_status(service_context(session, context, tenant_id), app_id, status_value)
        return ApiSuccess(data=row, message=message)
    except DomainError as error:
        raise domain_error_to_http(error) from error


async def _subscription_status(subscription_id: str, status_value: str, session: AsyncSession, context: RequestContext, message: str) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "integrations.manageWebhooks")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await set_subscription_status(service_context(session, context, tenant_id), subscription_id, status_value)
        return ApiSuccess(data=row, message=message)
    except DomainError as error:
        raise domain_error_to_http(error) from error


def ensure_permission(context: RequestContext, permission_key: str) -> None:
    if can(context, permission_key):
        return
    raise domain_error_to_http(
        DomainError(
            "Bu entegrasyon islemi icin yetkiniz bulunmuyor.",
            "INTEGRATION_PERMISSION_DENIED",
            status.HTTP_403_FORBIDDEN,
            {"permission": permission_key},
        )
    )
