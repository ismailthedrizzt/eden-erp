from __future__ import annotations

# ruff: noqa: E501
import time
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from fastapi import status
from sqlalchemy import text

from app.core.errors import DomainError
from app.domains.integrations.credentials import get_active_credential_hash
from app.domains.integrations.schemas import WebhookDeliveryListQuery
from app.domains.integrations.service import (
    IntegrationContext,
    default_retry_policy,
    ensure_integration_tables,
    json_dumps,
    meta,
    normalize_row,
    notify_integration_owner_best_effort,
    record_integration_audit_best_effort,
)
from app.domains.integrations.signatures import build_signature_headers, canonical_json_bytes
from app.domains.integrations.webhooks import validate_target_url


async def list_deliveries(ctx: IntegrationContext, query: WebhookDeliveryListQuery) -> dict[str, Any]:
    await ensure_integration_tables(ctx.session, deliveries=True)
    where = ["d.tenant_id = :tenant_id"]
    params: dict[str, Any] = {"tenant_id": ctx.tenant_id, "limit": query.page_size, "offset": (query.page - 1) * query.page_size}
    if query.subscription_id:
        where.append("d.subscription_id = :subscription_id")
        params["subscription_id"] = query.subscription_id
    if query.integration_app_id:
        where.append("d.integration_app_id = :integration_app_id")
        params["integration_app_id"] = query.integration_app_id
    if query.status:
        where.append("d.status = :status")
        params["status"] = query.status
    if query.event_type:
        where.append("d.event_type = :event_type")
        params["event_type"] = query.event_type
    where_sql = " and ".join(where)
    count = await ctx.session.execute(text(f"select count(*) from public.integration_webhook_deliveries d where {where_sql}"), params)
    total = int(count.scalar_one() or 0)
    result = await ctx.session.execute(
        text(
            f"""
            select d.*, s.subscription_name, a.app_key, a.app_name
            from public.integration_webhook_deliveries d
            left join public.integration_webhook_subscriptions s on s.tenant_id = d.tenant_id and s.id = d.subscription_id
            left join public.integration_apps a on a.tenant_id = d.tenant_id and a.id = d.integration_app_id
            where {where_sql}
            order by d.created_at desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    return {"items": [normalize_row(row) for row in result.mappings()], "meta": meta(query.page, query.page_size, total)}


async def get_delivery(ctx: IntegrationContext, delivery_id: str) -> dict[str, Any]:
    await ensure_integration_tables(ctx.session, deliveries=True)
    result = await ctx.session.execute(
        text(
            """
            select d.*, s.subscription_name, s.retry_policy_json, s.headers_json as subscription_headers,
                   s.signing_secret_id, s.status as subscription_status,
                   a.app_key, a.app_name, a.owner_user_id
            from public.integration_webhook_deliveries d
            left join public.integration_webhook_subscriptions s on s.tenant_id = d.tenant_id and s.id = d.subscription_id
            left join public.integration_apps a on a.tenant_id = d.tenant_id and a.id = d.integration_app_id
            where d.tenant_id = :tenant_id and d.id = :delivery_id
            limit 1
            """
        ),
        {"tenant_id": ctx.tenant_id, "delivery_id": delivery_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Webhook teslimati bulunamadi.", "WEBHOOK_DELIVERY_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return normalize_row(row)


async def retry_delivery(ctx: IntegrationContext, delivery_id: str) -> dict[str, Any]:
    await get_delivery(ctx, delivery_id)
    result = await ctx.session.execute(
        text(
            """
            update public.integration_webhook_deliveries
            set status = 'pending',
                next_attempt_at = now(),
                error_message = null,
                response_status_code = null,
                response_body_excerpt = null
            where tenant_id = :tenant_id and id = :delivery_id
            returning *
            """
        ),
        {"tenant_id": ctx.tenant_id, "delivery_id": delivery_id},
    )
    row = normalize_row(result.mappings().one())
    await record_integration_audit_best_effort(ctx, action_type="webhook_delivery_retried", entity_type="webhook_delivery", entity_id=delivery_id)
    return row


async def create_deliveries_for_outbox_event(ctx: IntegrationContext, outbox_event: dict[str, Any]) -> list[dict[str, Any]]:
    await ensure_integration_tables(ctx.session, apps=True, subscriptions=True, deliveries=True)
    event_type = str(outbox_event.get("event_type") or "")
    if not event_type:
        return []
    result = await ctx.session.execute(
        text(
            """
            select s.*, a.status as app_status, a.allowed_event_types, a.app_key, a.app_name
            from public.integration_webhook_subscriptions s
            join public.integration_apps a on a.tenant_id = s.tenant_id and a.id = s.integration_app_id
            where s.tenant_id = :tenant_id
              and s.status = 'active'
              and a.status = 'active'
              and s.event_types ? :event_type
            """
        ),
        {"tenant_id": ctx.tenant_id, "event_type": event_type},
    )
    rows: list[dict[str, Any]] = []
    for subscription in [normalize_row(row) for row in result.mappings()]:
        if not _passes_filter(subscription.get("filter_config_json") or {}, outbox_event):
            continue
        envelope = build_envelope(outbox_event)
        inserted = await ctx.session.execute(
            text(
                """
                insert into public.integration_webhook_deliveries (
                  tenant_id, subscription_id, integration_app_id, outbox_event_id,
                  event_type, event_id, target_url, payload_json, headers_json,
                  status, next_attempt_at
                )
                values (
                  :tenant_id, :subscription_id, :integration_app_id, :outbox_event_id,
                  :event_type, :event_id, :target_url, cast(:payload_json as jsonb),
                  '{}'::jsonb, 'pending', now()
                )
                returning *
                """
            ),
            {
                "tenant_id": ctx.tenant_id,
                "subscription_id": subscription["id"],
                "integration_app_id": subscription["integration_app_id"],
                "outbox_event_id": outbox_event.get("id"),
                "event_type": event_type,
                "event_id": str(envelope["event_id"]),
                "target_url": subscription["target_url"],
                "payload_json": canonical_json_bytes(envelope).decode("utf-8"),
            },
        )
        rows.append(normalize_row(inserted.mappings().one()))
    return rows


async def list_due_deliveries(ctx: IntegrationContext, *, limit: int = 20) -> list[dict[str, Any]]:
    await ensure_integration_tables(ctx.session, deliveries=True)
    result = await ctx.session.execute(
        text(
            """
            select d.*, s.retry_policy_json, s.headers_json as subscription_headers,
                   s.signing_secret_id, s.status as subscription_status,
                   a.status as app_status, a.owner_user_id, a.app_name
            from public.integration_webhook_deliveries d
            join public.integration_webhook_subscriptions s on s.tenant_id = d.tenant_id and s.id = d.subscription_id
            join public.integration_apps a on a.tenant_id = d.tenant_id and a.id = d.integration_app_id
            where d.tenant_id = :tenant_id
              and d.status in ('pending','failed')
              and (d.next_attempt_at is null or d.next_attempt_at <= now())
            order by d.created_at asc
            limit :limit
            for update of d skip locked
            """
        ),
        {"tenant_id": ctx.tenant_id, "limit": limit},
    )
    return [normalize_row(row) for row in result.mappings()]


async def deliver_webhook(ctx: IntegrationContext, delivery_id: str) -> dict[str, Any]:
    delivery = await get_delivery(ctx, delivery_id)
    return await deliver_webhook_row(ctx, delivery)


async def deliver_webhook_row(ctx: IntegrationContext, delivery: dict[str, Any]) -> dict[str, Any]:
    if delivery.get("app_status") and delivery.get("app_status") != "active":
        return await _mark_delivery(ctx, delivery, "skipped", error_message="Integration app aktif degil.")
    if delivery.get("subscription_status") and delivery.get("subscription_status") != "active":
        return await _mark_delivery(ctx, delivery, "skipped", error_message="Webhook aboneligi aktif degil.")
    started = time.perf_counter()
    await ctx.session.execute(text("update public.integration_webhook_deliveries set status = 'delivering', last_attempt_at = now(), attempt_count = attempt_count + 1 where tenant_id = :tenant_id and id = :id"), {"tenant_id": ctx.tenant_id, "id": delivery["id"]})
    payload = dict(delivery.get("payload_json") or {})
    secret_hash = None
    if delivery.get("signing_secret_id"):
        credential = await get_active_credential_hash(ctx, str(delivery["signing_secret_id"]))
        secret_hash = str(credential["secret_hash"])
    headers = {
        **(delivery.get("subscription_headers") or {}),
        **build_signature_headers(payload, str(delivery["id"]), secret_hash),
        "Content-Type": "application/json",
    }
    try:
        validate_target_url(str(delivery["target_url"]))
        timeout_seconds = int((delivery.get("retry_policy_json") or {}).get("timeout_seconds") or default_retry_policy()["timeout_seconds"])
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            response = await client.post(str(delivery["target_url"]), content=canonical_json_bytes(payload), headers=headers)
        duration_ms = int((time.perf_counter() - started) * 1000)
        if 200 <= response.status_code < 300:
            return await _mark_delivery(ctx, delivery, "delivered", response_status_code=response.status_code, response_body_excerpt=_excerpt(response.text), duration_ms=duration_ms, headers=headers)
        return await _schedule_failure(ctx, delivery, f"HTTP {response.status_code}", response_status_code=response.status_code, response_body_excerpt=_excerpt(response.text), duration_ms=duration_ms, headers=headers)
    except Exception as error:
        duration_ms = int((time.perf_counter() - started) * 1000)
        return await _schedule_failure(ctx, delivery, str(error), duration_ms=duration_ms, headers=headers)


async def _schedule_failure(
    ctx: IntegrationContext,
    delivery: dict[str, Any],
    error_message: str,
    *,
    response_status_code: int | None = None,
    response_body_excerpt: str | None = None,
    duration_ms: int | None = None,
    headers: dict[str, str] | None = None,
) -> dict[str, Any]:
    policy = default_retry_policy(delivery.get("retry_policy_json") or {})
    attempt_count = int(delivery.get("attempt_count") or 0) + 1
    if attempt_count >= int(policy["max_retries"]):
        row = await _mark_delivery(ctx, delivery, "dead_letter", response_status_code=response_status_code, response_body_excerpt=response_body_excerpt, error_message=error_message, duration_ms=duration_ms, headers=headers)
        await notify_integration_owner_best_effort(ctx, app=delivery, title="Webhook teslimati dead-letter oldu", message=f"{delivery.get('event_type')} teslimati retry limitini asti.", related_entity_type="webhook_delivery", related_entity_id=str(delivery["id"]), severity="error")
        return row
    delay = min(int(policy["max_delay_seconds"]), int(policy["initial_delay_seconds"] * (float(policy["backoff_multiplier"]) ** max(0, attempt_count - 1))))
    next_attempt_at = datetime.now(UTC) + timedelta(seconds=delay)
    return await _mark_delivery(ctx, delivery, "failed", response_status_code=response_status_code, response_body_excerpt=response_body_excerpt, error_message=error_message, duration_ms=duration_ms, headers=headers, next_attempt_at=next_attempt_at)


async def _mark_delivery(
    ctx: IntegrationContext,
    delivery: dict[str, Any],
    status_value: str,
    *,
    response_status_code: int | None = None,
    response_body_excerpt: str | None = None,
    error_message: str | None = None,
    duration_ms: int | None = None,
    headers: dict[str, str] | None = None,
    next_attempt_at: datetime | None = None,
) -> dict[str, Any]:
    result = await ctx.session.execute(
        text(
            """
            update public.integration_webhook_deliveries
            set status = :status,
                headers_json = cast(:headers_json as jsonb),
                response_status_code = :response_status_code,
                response_body_excerpt = :response_body_excerpt,
                error_message = :error_message,
                duration_ms = :duration_ms,
                next_attempt_at = :next_attempt_at,
                delivered_at = case when :status = 'delivered' then now() else delivered_at end
            where tenant_id = :tenant_id and id = :id
            returning *
            """
        ),
        {
            "tenant_id": ctx.tenant_id,
            "id": delivery["id"],
            "status": status_value,
            "headers_json": json_dumps(mask_delivery_headers(headers or {})),
            "response_status_code": response_status_code,
            "response_body_excerpt": response_body_excerpt,
            "error_message": _excerpt(error_message) if error_message else None,
            "duration_ms": duration_ms,
            "next_attempt_at": next_attempt_at,
        },
    )
    await ctx.session.execute(
        text(
            """
            update public.integration_webhook_subscriptions
            set last_delivery_at = now(),
                last_success_at = case when :status = 'delivered' then now() else last_success_at end,
                last_failure_at = case when :status in ('failed','dead_letter') then now() else last_failure_at end,
                failure_count = case when :status in ('failed','dead_letter') then failure_count + 1 else failure_count end,
                status = case when :status = 'dead_letter' then 'failed' else status end
            where tenant_id = :tenant_id and id = :subscription_id
            """
        ),
        {"tenant_id": ctx.tenant_id, "subscription_id": delivery["subscription_id"], "status": status_value},
    )
    return normalize_row(result.mappings().one())


def build_envelope(outbox_event: dict[str, Any]) -> dict[str, Any]:
    payload = dict(outbox_event.get("payload_json") or outbox_event.get("payload") or {})
    return {
        "event_id": str(outbox_event.get("id") or outbox_event.get("event_id")),
        "event_type": str(outbox_event.get("event_type")),
        "event_version": str(outbox_event.get("event_version") or "1.0"),
        "tenant_id": str(outbox_event.get("tenant_id")),
        "occurred_at": str(outbox_event.get("occurred_at") or outbox_event.get("created_at") or datetime.now(UTC).isoformat()),
        "aggregate_type": str(outbox_event.get("aggregate_type") or payload.get("aggregate_type") or "record"),
        "aggregate_id": str(outbox_event.get("aggregate_id") or payload.get("id") or ""),
        "operation_id": outbox_event.get("operation_id"),
        "correlation_id": outbox_event.get("correlation_id"),
        "data": payload,
        "metadata": dict(outbox_event.get("metadata_json") or {}),
    }


def mask_delivery_headers(headers: dict[str, str]) -> dict[str, str]:
    masked: dict[str, str] = {}
    for key, value in headers.items():
        lowered = key.lower()
        if lowered in {"x-eden-signature", "authorization"} or "secret" in lowered or "token" in lowered:
            masked[key] = "***"
        else:
            masked[key] = value
    return masked


def _passes_filter(filter_config: dict[str, Any], outbox_event: dict[str, Any]) -> bool:
    if not filter_config:
        return True
    payload = dict(outbox_event.get("payload_json") or {})
    for key, expected in filter_config.items():
        if payload.get(key) != expected and outbox_event.get(key) != expected:
            return False
    return True


def _excerpt(value: str | None, limit: int = 500) -> str | None:
    if value is None:
        return None
    return value[:limit]
