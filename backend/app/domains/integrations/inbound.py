from __future__ import annotations

# ruff: noqa: E501
import json
from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.core.security import RequestContext
from app.domains.after_sales.schemas import ServiceRequestCreateRequest
from app.domains.after_sales.service_requests import create_service_request
from app.domains.integrations.credentials import (
    find_inbound_signing_credential,
    mark_credential_used,
)
from app.domains.integrations.event_subscriptions import validate_inbound_event_type
from app.domains.integrations.service import (
    IntegrationContext,
    ensure_integration_tables,
    json_dumps,
    normalize_row,
    record_integration_audit_best_effort,
)
from app.domains.integrations.signatures import verify_signature
from app.domains.integrations.transformations import (
    normalize_external_lead,
    normalize_external_service_request,
)
from app.domains.operations.service import table_exists


async def receive_inbound_event(
    session: AsyncSession,
    *,
    tenant_id: str,
    app_key: str,
    event_type: str,
    raw_body: bytes,
    headers: dict[str, str],
) -> dict[str, Any]:
    validate_inbound_event_type(event_type)
    ctx = IntegrationContext(session=session, request_context=RequestContext(tenant_id=tenant_id, user_id=None, permissions=["integrations.admin", "system.admin"]), tenant_id=tenant_id)
    await ensure_integration_tables(session, apps=True, credentials=True, inbound=True)
    app = await _load_active_app(ctx, app_key)
    _assert_inbound_allowed(app, event_type)
    payload = _parse_payload(raw_body)
    source_event_id = str(payload.get("event_id") or headers.get("x-eden-event-id") or headers.get("X-Eden-Event-Id") or "") or None
    if source_event_id:
        duplicate = await _find_duplicate(ctx, str(app["id"]), event_type, source_event_id)
        if duplicate:
            duplicate["duplicate"] = True
            return duplicate
    credential = await find_inbound_signing_credential(ctx, str(app["id"]), headers.get("x-eden-credential-id") or headers.get("X-Eden-Credential-Id"))
    signature_valid = bool(
        credential
        and verify_signature(
            raw_body,
            str(credential["secret_hash"]),
            headers.get("x-eden-timestamp") or headers.get("X-Eden-Timestamp"),
            headers.get("x-eden-signature") or headers.get("X-Eden-Signature"),
        )
    )
    if not signature_valid:
        event = await _insert_inbound(ctx, app, event_type, source_event_id, payload, {}, False, "rejected", "invalid_signature")
        await record_integration_audit_best_effort(ctx, action_type="inbound_event_rejected", entity_type="integration_inbound_event", entity_id=str(event["id"]), metadata={"reason": "invalid_signature"})
        raise DomainError("Inbound webhook imzasi dogrulanamadi.", "INBOUND_SIGNATURE_INVALID", status.HTTP_401_UNAUTHORIZED, {"event_id": str(event["id"])})
    assert credential is not None
    await mark_credential_used(ctx, str(credential["id"]))
    event = await _insert_inbound(ctx, app, event_type, source_event_id, payload, {}, True, "received", None)
    processed = await _process_inbound_event(ctx, event, app, payload)
    await record_integration_audit_best_effort(ctx, action_type="inbound_event_received", entity_type="integration_inbound_event", entity_id=str(processed["id"]), metadata={"event_type": event_type})
    return processed


async def list_inbound_events(ctx: IntegrationContext, *, integration_app_id: str | None = None, status_value: str | None = None, inbound_event_type: str | None = None, page: int = 1, page_size: int = 50) -> dict[str, Any]:
    await ensure_integration_tables(ctx.session, inbound=True)
    where = ["e.tenant_id = :tenant_id"]
    params: dict[str, Any] = {"tenant_id": ctx.tenant_id, "limit": page_size, "offset": (page - 1) * page_size}
    if integration_app_id:
        where.append("e.integration_app_id = :integration_app_id")
        params["integration_app_id"] = integration_app_id
    if status_value:
        where.append("e.status = :status")
        params["status"] = status_value
    if inbound_event_type:
        where.append("e.inbound_event_type = :inbound_event_type")
        params["inbound_event_type"] = inbound_event_type
    where_sql = " and ".join(where)
    count = await ctx.session.execute(text(f"select count(*) from public.integration_inbound_events e where {where_sql}"), params)
    total = int(count.scalar_one() or 0)
    result = await ctx.session.execute(
        text(
            f"""
            select e.*, a.app_key, a.app_name
            from public.integration_inbound_events e
            left join public.integration_apps a on a.tenant_id = e.tenant_id and a.id = e.integration_app_id
            where {where_sql}
            order by e.created_at desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    return {"items": [normalize_row(row) for row in result.mappings()], "meta": {"page": page, "pageSize": page_size, "total": total, "totalPages": max(1, (total + page_size - 1) // page_size)}}


async def _process_inbound_event(ctx: IntegrationContext, event: dict[str, Any], app: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    event_type = str(event["inbound_event_type"])
    if event_type == "service_request_created_from_external":
        return await _process_service_request(ctx, event, payload)
    if event_type == "crm_lead_created_from_external":
        return await _process_crm_lead(ctx, event, payload)
    normalized = {"needs_review": True, "reason": "No automatic processor for this inbound event yet."}
    return await _update_inbound(ctx, str(event["id"]), "validated", normalized, None, None, "needs_review")


async def _process_service_request(ctx: IntegrationContext, event: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    normalized = normalize_external_service_request(payload)
    asset = await _find_asset(ctx, normalized)
    if not asset:
        normalized["needs_review"] = True
        return await _update_inbound(ctx, str(event["id"]), "failed", normalized, None, None, "asset_or_customer_match_not_found")
    service_context = {"tenant_id": ctx.tenant_id, "user_id": None, "module_key": "integrations"}
    service_request = await create_service_request(
        ctx.session,
        service_context,
        ServiceRequestCreateRequest(
            company_id=str(asset["owning_company_id"]),
            customer_account_id=str(asset.get("customer_account_id")) if asset.get("customer_account_id") else None,
            customer_name=str(asset.get("customer_name") or "External customer"),
            installed_asset_id=str(asset["id"]),
            product_id=str(asset.get("product_id")) if asset.get("product_id") else None,
            request_type="fault",
            priority=normalized["priority"],
            subject=str(normalized["subject"]),
            description=normalized.get("description"),
            contact_person=normalized.get("contact_person"),
            contact_phone=normalized.get("contact_phone"),
            contact_email=normalized.get("contact_email"),
            source="web",
            document_files=normalized.get("attachments") or [],
            metadata_json={"source": "integration_hub", "inbound_event_id": str(event["id"])},
        ),
    )
    normalized["service_request_id"] = str(service_request["id"])
    return await _update_inbound(ctx, str(event["id"]), "processed", normalized, "service_request", str(service_request["id"]), None)


async def _process_crm_lead(ctx: IntegrationContext, event: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    normalized = normalize_external_lead(payload)
    if not await table_exists(ctx.session, "public.crm_leads"):
        normalized["needs_review"] = True
        return await _update_inbound(ctx, str(event["id"]), "failed", normalized, None, None, "crm_leads_table_missing")
    company_id = payload.get("company_id")
    if not company_id:
        normalized["needs_review"] = True
        return await _update_inbound(ctx, str(event["id"]), "failed", normalized, None, None, "company_id_required")
    inserted = await ctx.session.execute(
        text(
            """
            insert into public.crm_leads (
              tenant_id, company_id, lead_name, contact_name, phone, email,
              company_name, source, lead_status, interest_area, product_interest,
              estimated_value, currency, notes, metadata_json, created_by, updated_by
            )
            values (
              :tenant_id, :company_id, :lead_name, :contact_name, :phone, :email,
              :company_name, :source, :lead_status, :interest_area, :product_interest,
              :estimated_value, :currency, :notes, cast(:metadata_json as jsonb), null, null
            )
            returning id
            """
        ),
        {"tenant_id": ctx.tenant_id, "company_id": company_id, **normalized, "metadata_json": json_dumps(normalized.get("metadata_json"))},
    )
    lead_id = str(inserted.mappings().one()["id"])
    normalized["lead_id"] = lead_id
    return await _update_inbound(ctx, str(event["id"]), "processed", normalized, "crm_lead", lead_id, None)


async def _load_active_app(ctx: IntegrationContext, app_key: str) -> dict[str, Any]:
    result = await ctx.session.execute(
        text(
            """
            select *
            from public.integration_apps
            where tenant_id = :tenant_id and app_key = :app_key and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": ctx.tenant_id, "app_key": app_key},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Integration app bulunamadi.", "INTEGRATION_APP_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    app = normalize_row(row)
    if app.get("status") != "active":
        raise DomainError("Integration app aktif degil.", "INTEGRATION_APP_NOT_ACTIVE", status.HTTP_403_FORBIDDEN)
    return app


def _assert_inbound_allowed(app: dict[str, Any], event_type: str) -> None:
    allowed = {str(item) for item in app.get("allowed_inbound_events") or []}
    if allowed and event_type not in allowed:
        raise DomainError("Inbound event bu app icin yetkili degil.", "INBOUND_EVENT_NOT_ALLOWED_FOR_APP", status.HTTP_403_FORBIDDEN, {"event_type": event_type})


def _parse_payload(raw_body: bytes) -> dict[str, Any]:
    try:
        payload = json.loads(raw_body.decode("utf-8") or "{}")
    except json.JSONDecodeError as error:
        raise DomainError("Inbound payload JSON olmalidir.", "INBOUND_PAYLOAD_INVALID", status.HTTP_400_BAD_REQUEST) from error
    if not isinstance(payload, dict):
        raise DomainError("Inbound payload obje olmalidir.", "INBOUND_PAYLOAD_INVALID", status.HTTP_400_BAD_REQUEST)
    return payload


async def _find_duplicate(ctx: IntegrationContext, app_id: str, event_type: str, source_event_id: str) -> dict[str, Any] | None:
    result = await ctx.session.execute(
        text(
            """
            select *
            from public.integration_inbound_events
            where tenant_id = :tenant_id
              and integration_app_id = :app_id
              and inbound_event_type = :event_type
              and source_event_id = :source_event_id
            order by created_at desc
            limit 1
            """
        ),
        {"tenant_id": ctx.tenant_id, "app_id": app_id, "event_type": event_type, "source_event_id": source_event_id},
    )
    row = result.mappings().one_or_none()
    return normalize_row(row) if row else None


async def _insert_inbound(ctx: IntegrationContext, app: dict[str, Any], event_type: str, source_event_id: str | None, payload: dict[str, Any], normalized: dict[str, Any], signature_valid: bool, status_value: str, error_message: str | None) -> dict[str, Any]:
    result = await ctx.session.execute(
        text(
            """
            insert into public.integration_inbound_events (
              tenant_id, integration_app_id, inbound_event_type, source_event_id,
              signature_valid, status, payload_json, normalized_payload_json, error_message
            )
            values (
              :tenant_id, :integration_app_id, :inbound_event_type, :source_event_id,
              :signature_valid, :status, cast(:payload_json as jsonb),
              cast(:normalized_payload_json as jsonb), :error_message
            )
            returning *
            """
        ),
        {
            "tenant_id": ctx.tenant_id,
            "integration_app_id": app["id"],
            "inbound_event_type": event_type,
            "source_event_id": source_event_id,
            "signature_valid": signature_valid,
            "status": status_value,
            "payload_json": json_dumps(payload),
            "normalized_payload_json": json_dumps(normalized),
            "error_message": error_message,
        },
    )
    return normalize_row(result.mappings().one())


async def _update_inbound(ctx: IntegrationContext, event_id: str, status_value: str, normalized: dict[str, Any], related_entity_type: str | None, related_entity_id: str | None, error_message: str | None) -> dict[str, Any]:
    result = await ctx.session.execute(
        text(
            """
            update public.integration_inbound_events
            set status = :status,
                normalized_payload_json = cast(:normalized_payload_json as jsonb),
                related_entity_type = :related_entity_type,
                related_entity_id = :related_entity_id,
                error_message = :error_message,
                updated_at = now()
            where tenant_id = :tenant_id and id = :event_id
            returning *
            """
        ),
        {"tenant_id": ctx.tenant_id, "event_id": event_id, "status": status_value, "normalized_payload_json": json_dumps(normalized), "related_entity_type": related_entity_type, "related_entity_id": related_entity_id, "error_message": error_message},
    )
    return normalize_row(result.mappings().one())


async def _find_asset(ctx: IntegrationContext, normalized: dict[str, Any]) -> dict[str, Any] | None:
    if not await table_exists(ctx.session, "public.after_sales_installed_assets"):
        return None
    filters = ["tenant_id = :tenant_id", "coalesce(is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": ctx.tenant_id}
    if normalized.get("product_serial"):
        filters.append("serial_no = :serial_no")
        params["serial_no"] = normalized["product_serial"]
    if normalized.get("customer_ref"):
        filters.append("(customer_account_id::text = :customer_ref or customer_company_id::text = :customer_ref or customer_name = :customer_ref)")
        params["customer_ref"] = normalized["customer_ref"]
    if len(filters) == 2:
        return None
    result = await ctx.session.execute(text(f"select * from public.after_sales_installed_assets where {' and '.join(filters)} order by updated_at desc limit 1"), params)
    row = result.mappings().one_or_none()
    return normalize_row(row) if row else None
