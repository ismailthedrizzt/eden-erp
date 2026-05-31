from __future__ import annotations

# ruff: noqa: E501
import ipaddress
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlparse
from uuid import uuid4

from fastapi import status
from sqlalchemy import text

from app.core.config import get_settings
from app.core.errors import DomainError
from app.domains.integrations.apps import get_app
from app.domains.integrations.credentials import get_active_credential_hash
from app.domains.integrations.event_subscriptions import get_event_type, validate_event_types
from app.domains.integrations.schemas import (
    WebhookSubscriptionCreateRequest,
    WebhookSubscriptionListQuery,
    WebhookSubscriptionUpdateRequest,
)
from app.domains.integrations.service import (
    IntegrationContext,
    assert_version,
    default_retry_policy,
    ensure_integration_tables,
    json_dumps,
    json_list_dumps,
    meta,
    normalize_row,
    record_integration_audit_best_effort,
    require_user_id,
    sanitize_headers,
)
from app.domains.integrations.signatures import canonical_json_bytes

SUBSCRIPTION_JSON_FIELDS = {"event_types", "headers_json", "retry_policy_json", "filter_config_json"}


async def list_subscriptions(ctx: IntegrationContext, query: WebhookSubscriptionListQuery) -> dict[str, Any]:
    await ensure_integration_tables(ctx.session, subscriptions=True)
    where = ["s.tenant_id = :tenant_id"]
    params: dict[str, Any] = {"tenant_id": ctx.tenant_id, "limit": query.page_size, "offset": (query.page - 1) * query.page_size}
    if query.integration_app_id:
        where.append("s.integration_app_id = :integration_app_id")
        params["integration_app_id"] = query.integration_app_id
    if query.status:
        where.append("s.status = :status")
        params["status"] = query.status
    if query.event_type:
        where.append("s.event_types ? :event_type")
        params["event_type"] = query.event_type
    if query.search:
        where.append("(s.subscription_name ilike :search or s.target_url ilike :search or a.app_name ilike :search)")
        params["search"] = f"%{query.search}%"
    where_sql = " and ".join(where)
    count = await ctx.session.execute(text(f"select count(*) from public.integration_webhook_subscriptions s left join public.integration_apps a on a.tenant_id = s.tenant_id and a.id = s.integration_app_id where {where_sql}"), params)
    total = int(count.scalar_one() or 0)
    result = await ctx.session.execute(
        text(
            f"""
            select s.*, a.app_key, a.app_name, a.status as app_status
            from public.integration_webhook_subscriptions s
            left join public.integration_apps a on a.tenant_id = s.tenant_id and a.id = s.integration_app_id
            where {where_sql}
            order by case s.status when 'active' then 0 when 'failed' then 1 when 'paused' then 2 else 3 end, s.updated_at desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    return {"items": [normalize_row(row) for row in result.mappings()], "meta": meta(query.page, query.page_size, total)}


async def get_subscription(ctx: IntegrationContext, subscription_id: str) -> dict[str, Any]:
    await ensure_integration_tables(ctx.session, subscriptions=True)
    result = await ctx.session.execute(
        text(
            """
            select s.*, a.app_key, a.app_name, a.status as app_status
            from public.integration_webhook_subscriptions s
            left join public.integration_apps a on a.tenant_id = s.tenant_id and a.id = s.integration_app_id
            where s.tenant_id = :tenant_id and s.id = :subscription_id
            limit 1
            """
        ),
        {"tenant_id": ctx.tenant_id, "subscription_id": subscription_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Webhook aboneligi bulunamadi.", "WEBHOOK_SUBSCRIPTION_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return normalize_row(row)


async def create_subscription(ctx: IntegrationContext, request: WebhookSubscriptionCreateRequest) -> dict[str, Any]:
    await ensure_integration_tables(ctx.session, apps=True, credentials=True, subscriptions=True)
    created_by = require_user_id(ctx)
    app = await get_app(ctx, request.integration_app_id)
    _assert_app_active(app)
    _assert_events_allowed(app, request.event_types)
    validate_target_url(request.target_url)
    headers = sanitize_headers(request.headers_json)
    if request.signing_secret_id:
        credential = await get_active_credential_hash(ctx, request.signing_secret_id)
        if str(credential["integration_app_id"]) != str(request.integration_app_id):
            raise DomainError("Signing secret bu entegrasyon uygulamasina ait degil.", "WEBHOOK_SIGNING_SECRET_APP_MISMATCH", status.HTTP_409_CONFLICT)
    inserted = await ctx.session.execute(
        text(
            """
            insert into public.integration_webhook_subscriptions (
              tenant_id, integration_app_id, subscription_name, target_url, event_types, status,
              signing_secret_id, headers_json, retry_policy_json, filter_config_json, created_by
            )
            values (
              :tenant_id, :integration_app_id, :subscription_name, :target_url, cast(:event_types as jsonb), 'active',
              :signing_secret_id, cast(:headers_json as jsonb), cast(:retry_policy_json as jsonb),
              cast(:filter_config_json as jsonb), :created_by
            )
            returning *
            """
        ),
        {
            "tenant_id": ctx.tenant_id,
            "integration_app_id": request.integration_app_id,
            "subscription_name": request.subscription_name,
            "target_url": request.target_url,
            "event_types": json_list_dumps(request.event_types),
            "signing_secret_id": request.signing_secret_id,
            "headers_json": json_dumps(headers),
            "retry_policy_json": json_dumps(default_retry_policy(request.retry_policy_json)),
            "filter_config_json": json_dumps(request.filter_config_json),
            "created_by": created_by,
        },
    )
    row = normalize_row(inserted.mappings().one())
    await record_integration_audit_best_effort(ctx, action_type="webhook_subscription_created", entity_type="webhook_subscription", entity_id=str(row["id"]))
    return row


async def update_subscription(ctx: IntegrationContext, subscription_id: str, request: WebhookSubscriptionUpdateRequest) -> dict[str, Any]:
    current = await get_subscription(ctx, subscription_id)
    assert_version(current, request.base_version)
    app = await get_app(ctx, str(current["integration_app_id"]))
    data = request.model_dump(exclude_unset=True, exclude={"base_version"})
    if data.get("event_types") is not None:
        _assert_events_allowed(app, [str(item) for item in data["event_types"] or []])
    if data.get("target_url"):
        validate_target_url(str(data["target_url"]))
    if data.get("headers_json") is not None:
        data["headers_json"] = sanitize_headers(data["headers_json"])
    if data.get("retry_policy_json") is not None:
        data["retry_policy_json"] = default_retry_policy(data["retry_policy_json"])
    if data.get("signing_secret_id"):
        credential = await get_active_credential_hash(ctx, str(data["signing_secret_id"]))
        if str(credential["integration_app_id"]) != str(current["integration_app_id"]):
            raise DomainError("Signing secret bu entegrasyon uygulamasina ait degil.", "WEBHOOK_SIGNING_SECRET_APP_MISMATCH", status.HTTP_409_CONFLICT)
    params: dict[str, Any] = {"tenant_id": ctx.tenant_id, "subscription_id": subscription_id}
    set_parts: list[str] = []
    for key, value in data.items():
        if key in SUBSCRIPTION_JSON_FIELDS:
            set_parts.append(f"{key} = cast(:{key} as jsonb)")
            params[key] = json_list_dumps(value) if key == "event_types" else json_dumps(value)
        elif key in {"subscription_name", "target_url", "status", "signing_secret_id"}:
            set_parts.append(f"{key} = :{key}")
            params[key] = value
    if not set_parts:
        return current
    set_parts.extend(["updated_at = now()", "version = version + 1"])
    result = await ctx.session.execute(
        text(
            f"""
            update public.integration_webhook_subscriptions
            set {", ".join(set_parts)}
            where tenant_id = :tenant_id and id = :subscription_id
            returning *
            """
        ),
        params,
    )
    row = normalize_row(result.mappings().one())
    await record_integration_audit_best_effort(ctx, action_type="webhook_subscription_updated", entity_type="webhook_subscription", entity_id=subscription_id)
    return row


async def set_subscription_status(ctx: IntegrationContext, subscription_id: str, status_value: str) -> dict[str, Any]:
    if status_value not in {"paused", "active", "disabled"}:
        raise DomainError("Gecersiz webhook abonelik durumu.", "WEBHOOK_SUBSCRIPTION_STATUS_INVALID", status.HTTP_422_UNPROCESSABLE_ENTITY)
    await get_subscription(ctx, subscription_id)
    result = await ctx.session.execute(
        text(
            """
            update public.integration_webhook_subscriptions
            set status = :status, updated_at = now(), version = version + 1
            where tenant_id = :tenant_id and id = :subscription_id
            returning *
            """
        ),
        {"tenant_id": ctx.tenant_id, "subscription_id": subscription_id, "status": status_value},
    )
    row = normalize_row(result.mappings().one())
    await record_integration_audit_best_effort(ctx, action_type=f"webhook_subscription_{status_value}", entity_type="webhook_subscription", entity_id=subscription_id)
    return row


async def create_test_delivery(ctx: IntegrationContext, subscription_id: str) -> dict[str, Any]:
    subscription = await get_subscription(ctx, subscription_id)
    delivery_id = str(uuid4())
    envelope = {
        "event_id": f"evt_test_{delivery_id}",
        "event_type": "integration.test",
        "event_version": "1.0",
        "tenant_id": ctx.tenant_id,
        "occurred_at": datetime.now(UTC).isoformat(),
        "aggregate_type": "webhook_test",
        "aggregate_id": subscription_id,
        "operation_id": None,
        "correlation_id": delivery_id,
        "data": {"message": "Eden ERP webhook test event"},
        "metadata": {"source": "integration_hub", "test": True},
    }
    inserted = await ctx.session.execute(
        text(
            """
            insert into public.integration_webhook_deliveries (
              id, tenant_id, subscription_id, integration_app_id, event_type, event_id,
              target_url, payload_json, headers_json, status, next_attempt_at
            )
            values (
              :id, :tenant_id, :subscription_id, :integration_app_id, 'integration.test', :event_id,
              :target_url, cast(:payload_json as jsonb), '{}'::jsonb, 'pending', now()
            )
            returning *
            """
        ),
        {
            "id": delivery_id,
            "tenant_id": ctx.tenant_id,
            "subscription_id": subscription_id,
            "integration_app_id": subscription["integration_app_id"],
            "event_id": envelope["event_id"],
            "target_url": subscription["target_url"],
            "payload_json": canonical_json_bytes(envelope).decode("utf-8"),
        },
    )
    row = normalize_row(inserted.mappings().one())
    await record_integration_audit_best_effort(ctx, action_type="webhook_test_sent", entity_type="webhook_delivery", entity_id=str(row["id"]))
    return row


def validate_target_url(target_url: str) -> None:
    parsed = urlparse(target_url)
    if parsed.scheme != "https":
        if not (get_settings().is_development and parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1", "::1"}):
            raise DomainError("Webhook target URL HTTPS olmalidir.", "WEBHOOK_TARGET_URL_INVALID", status.HTTP_422_UNPROCESSABLE_ENTITY)
    if not parsed.hostname:
        raise DomainError("Webhook target URL host icermelidir.", "WEBHOOK_TARGET_URL_INVALID", status.HTTP_422_UNPROCESSABLE_ENTITY)
    try:
        ip = ipaddress.ip_address(parsed.hostname)
    except ValueError:
        return
    if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast:
        if not get_settings().is_development:
            raise DomainError("Webhook target URL private/internal IP olamaz.", "WEBHOOK_TARGET_PRIVATE_IP_BLOCKED", status.HTTP_422_UNPROCESSABLE_ENTITY)


def _assert_app_active(app: dict[str, Any]) -> None:
    if app.get("status") != "active":
        raise DomainError("Integration app aktif degil.", "INTEGRATION_APP_NOT_ACTIVE", status.HTTP_409_CONFLICT)


def _assert_events_allowed(app: dict[str, Any], event_types: list[str]) -> None:
    validate_event_types(event_types)
    allowed = {str(item) for item in app.get("allowed_event_types") or []}
    if allowed:
        disallowed = [event_type for event_type in event_types if event_type not in allowed]
        if disallowed:
            raise DomainError("Webhook aboneligi app allowed_event_types disina cikiyor.", "WEBHOOK_EVENT_NOT_ALLOWED_FOR_APP", status.HTTP_422_UNPROCESSABLE_ENTITY, {"event_types": disallowed})
    for event_type in event_types:
        get_event_type(event_type)
