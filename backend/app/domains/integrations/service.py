from __future__ import annotations

# ruff: noqa: E501
import json
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.core.security import RequestContext, has_permission
from app.domains.operations.service import table_exists

INTEGRATIONS_MODULE_KEY = "integrations"
APP_TABLE = "public.integration_apps"
CREDENTIAL_TABLE = "public.integration_credentials"
SUBSCRIPTION_TABLE = "public.integration_webhook_subscriptions"
DELIVERY_TABLE = "public.integration_webhook_deliveries"
INBOUND_TABLE = "public.integration_inbound_events"
EVENT_SUBSCRIPTION_TABLE = "public.integration_event_subscriptions"

SECRET_HEADER_KEYS = {"authorization", "cookie", "set-cookie", "x-api-key", "api-key", "x-auth-token"}


@dataclass
class IntegrationContext:
    session: AsyncSession
    request_context: RequestContext
    tenant_id: str
    warnings: list[str] = field(default_factory=list)


def service_context(session: AsyncSession, request_context: RequestContext, tenant_id: str) -> IntegrationContext:
    return IntegrationContext(session=session, request_context=request_context, tenant_id=tenant_id)


def can(context: RequestContext, permission_key: str) -> bool:
    return has_permission(context, permission_key) or has_permission(context, "integrations.admin") or has_permission(context, "system.admin")


def require_permission(ctx: IntegrationContext, permission_key: str) -> None:
    if not can(ctx.request_context, permission_key):
        raise DomainError("Bu entegrasyon islemi icin yetkiniz bulunmuyor.", "INTEGRATION_PERMISSION_DENIED", status.HTTP_403_FORBIDDEN, {"permission": permission_key})


def require_user_id(ctx: IntegrationContext) -> str:
    if not ctx.request_context.user_id:
        raise DomainError("Bu islem icin kullanici baglami zorunludur.", "INTEGRATION_USER_REQUIRED", status.HTTP_401_UNAUTHORIZED)
    return str(ctx.request_context.user_id)


async def ensure_integration_tables(
    session: AsyncSession,
    *,
    apps: bool = False,
    credentials: bool = False,
    subscriptions: bool = False,
    deliveries: bool = False,
    inbound: bool = False,
    event_subscriptions: bool = False,
) -> None:
    checks = [
        (apps, APP_TABLE, "INTEGRATION_APPS_TABLE_MISSING", "Entegrasyon uygulama altyapisi hazir degil."),
        (credentials, CREDENTIAL_TABLE, "INTEGRATION_CREDENTIALS_TABLE_MISSING", "Entegrasyon credential altyapisi hazir degil."),
        (subscriptions, SUBSCRIPTION_TABLE, "INTEGRATION_SUBSCRIPTIONS_TABLE_MISSING", "Webhook abonelik altyapisi hazir degil."),
        (deliveries, DELIVERY_TABLE, "INTEGRATION_DELIVERIES_TABLE_MISSING", "Webhook teslimat altyapisi hazir degil."),
        (inbound, INBOUND_TABLE, "INTEGRATION_INBOUND_TABLE_MISSING", "Inbound webhook altyapisi hazir degil."),
        (event_subscriptions, EVENT_SUBSCRIPTION_TABLE, "INTEGRATION_EVENT_SUBSCRIPTIONS_TABLE_MISSING", "Event subscription altyapisi hazir degil."),
    ]
    for enabled, table, code, message in checks:
        if enabled and not await table_exists(session, table):
            raise DomainError(message, code, status.HTTP_409_CONFLICT, {"module_key": INTEGRATIONS_MODULE_KEY})


def json_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=False, default=str, sort_keys=True)


def json_list_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else [], ensure_ascii=False, default=str, sort_keys=True)


def normalize_row(row: Any) -> dict[str, Any]:
    return {key: normalize_value(value) for key, value in dict(row).items()}


def normalize_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (date, datetime)):
        return value
    return value


def meta(page: int, page_size: int, total: int) -> dict[str, int]:
    return {"page": page, "pageSize": page_size, "total": total, "totalPages": max(1, (total + page_size - 1) // page_size)}


def slugify_key(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "_", value.strip().lower())
    normalized = re.sub(r"_+", "_", normalized).strip("_")
    return normalized or "integration_app"


def assert_version(current: dict[str, Any], base_version: int | None) -> None:
    if base_version is None:
        return
    if int(current.get("version") or 0) != int(base_version):
        raise DomainError("Kayit baska bir islem tarafindan guncellendi. Lutfen yenileyin.", "VERSION_CONFLICT", status.HTTP_409_CONFLICT)


def sanitize_headers(headers: dict[str, str] | None) -> dict[str, str]:
    sanitized: dict[str, str] = {}
    for key, value in (headers or {}).items():
        lowered = key.lower()
        if lowered in SECRET_HEADER_KEYS or "secret" in lowered or "token" in lowered:
            raise DomainError("Webhook header alanlarinda secret/token tasinamaz. Credential store kullanin.", "WEBHOOK_SECRET_HEADER_REJECTED", status.HTTP_422_UNPROCESSABLE_ENTITY, {"header": key})
        sanitized[key] = str(value)
    return sanitized


def default_retry_policy(policy: dict[str, Any] | None = None) -> dict[str, Any]:
    merged: dict[str, Any] = {
        "max_retries": 5,
        "initial_delay_seconds": 60,
        "backoff_multiplier": 2,
        "max_delay_seconds": 3600,
        "timeout_seconds": 10,
    }
    merged.update(policy or {})
    merged["max_retries"] = min(max(int(merged.get("max_retries") or 5), 0), 20)
    merged["initial_delay_seconds"] = min(max(int(merged.get("initial_delay_seconds") or 60), 1), 86400)
    merged["backoff_multiplier"] = min(max(float(merged.get("backoff_multiplier") or 2), 1), 10)
    merged["max_delay_seconds"] = min(max(int(merged.get("max_delay_seconds") or 3600), 1), 86400)
    merged["timeout_seconds"] = min(max(int(merged.get("timeout_seconds") or 10), 1), 60)
    return merged


async def record_integration_audit_best_effort(
    ctx: IntegrationContext,
    *,
    action_type: str,
    entity_type: str,
    entity_id: str,
    summary: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    if not await table_exists(ctx.session, "public.audit_logs"):
        return
    try:
        async with ctx.session.begin_nested():
            await ctx.session.execute(
                text(
                    """
                    insert into public.audit_logs (
                      tenant_id, module_key, entity_type, entity_id, action_type,
                      action_key, user_id, summary, result_status, severity, metadata_json
                    )
                    values (
                      :tenant_id, 'integrations', :entity_type, :entity_id, :action_type,
                      :action_type, :user_id, :summary, 'success', 'info', cast(:metadata_json as jsonb)
                    )
                    """
                ),
                {
                    "tenant_id": ctx.tenant_id,
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "action_type": action_type,
                    "user_id": ctx.request_context.user_id,
                    "summary": summary or action_type,
                    "metadata_json": json_dumps(metadata or {}),
                },
            )
    except Exception:
        return


async def notify_integration_owner_best_effort(
    ctx: IntegrationContext,
    *,
    app: dict[str, Any] | None,
    title: str,
    message: str,
    related_entity_type: str,
    related_entity_id: str,
    severity: str = "warning",
) -> None:
    owner_user_id = str(app.get("owner_user_id")) if app and app.get("owner_user_id") else ctx.request_context.user_id
    if not owner_user_id or not await table_exists(ctx.session, "public.notifications"):
        return
    try:
        async with ctx.session.begin_nested():
            await ctx.session.execute(
                text(
                    """
                    insert into public.notifications (
                      tenant_id, user_id, module_key, notification_type, title, message,
                      severity, priority, action_required, action_key, action_label,
                      target_page, related_entity_type, related_entity_id,
                      delivered_channels, delivery_status, metadata_json
                    )
                    values (
                      :tenant_id, :user_id, 'integrations', 'integration_warning', :title, :message,
                      :severity, 'high', true, 'integrations.open', 'Entegrasyonu Ac',
                      '/app/sistem/entegrasyonlar', :related_entity_type, :related_entity_id,
                      '["in_app"]'::jsonb, 'delivered', cast(:metadata_json as jsonb)
                    )
                    """
                ),
                {
                    "tenant_id": ctx.tenant_id,
                    "user_id": owner_user_id,
                    "title": title,
                    "message": message,
                    "severity": severity,
                    "related_entity_type": related_entity_type,
                    "related_entity_id": related_entity_id,
                    "metadata_json": json_dumps({"source": "integration_hub"}),
                },
            )
    except Exception:
        return
