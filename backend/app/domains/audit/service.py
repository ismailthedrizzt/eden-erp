from __future__ import annotations

import json
import logging
import time
from typing import Any
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import log_info, log_warning
from app.core.metrics import increment_counter, observe_duration
from app.core.serialization import row_to_dict, rows_to_dicts
from app.domains.audit.diff import changed_fields as detect_changed_fields
from app.domains.audit.masking import mask_sensitive_data
from app.domains.operations.service import table_exists

logger = logging.getLogger(__name__)


async def record_audit(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    action_type: str,
    action_key: str | None = None,
    summary: str | None = None,
    result_status: str = "success",
    severity: str = "info",
    entity_type: str | None = None,
    entity_id: str | None = None,
    company_id: str | None = None,
    branch_id: str | None = None,
    module_key: str | None = None,
    operation_id: str | None = None,
    process_instance_id: str | None = None,
    task_id: str | None = None,
    approval_id: str | None = None,
    outbox_event_id: str | None = None,
    old_values: dict[str, Any] | None = None,
    new_values: dict[str, Any] | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    started = time.perf_counter()
    if not await table_exists(session, "public.audit_logs"):
        raise RuntimeError("Audit infrastructure is not available.")
    audit_id = str(uuid4())
    masked_old = mask_sensitive_data(old_values or {})
    masked_new = mask_sensitive_data(new_values or {})
    fields = detect_changed_fields(masked_old, masked_new)
    result = await session.execute(
        text(
            """
            insert into public.audit_logs (
              id, tenant_id, company_id, branch_id, module_key, entity_type, entity_id,
              resource, record_id, action, action_type, action_key, operation_id, process_instance_id, task_id,
              approval_id, outbox_event_id, user_id, before_json, after_json, old_values, new_values,
              changed_fields, summary, result_status, severity, metadata_json
            )
            values (
              :id, :tenant_id, :company_id, :branch_id, :module_key, :entity_type, :entity_id,
              :resource, :record_id, :action, :action_type, :action_key, :operation_id, :process_instance_id, :task_id,
              :approval_id, :outbox_event_id, :user_id, cast(:old_values as jsonb), cast(:new_values as jsonb), cast(:old_values as jsonb),
              cast(:new_values as jsonb), :changed_fields, :summary, :result_status, :severity,
              cast(:metadata_json as jsonb)
            )
            returning *
            """
        ),
        {
            "id": audit_id,
            "tenant_id": context["tenant_id"],
            "company_id": company_id or context.get("company_id"),
            "branch_id": branch_id,
            "module_key": module_key or context.get("module_key"),
            "entity_type": entity_type,
            "entity_id": entity_id,
            "resource": entity_type or context.get("module_key") or "system",
            "record_id": entity_id,
            "action": action_key or action_type,
            "action_type": action_type,
            "action_key": action_key,
            "operation_id": operation_id or context.get("operation_id"),
            "process_instance_id": process_instance_id or context.get("process_instance_id"),
            "task_id": task_id,
            "approval_id": approval_id,
            "outbox_event_id": outbox_event_id,
            "user_id": context.get("user_id"),
            "old_values": json.dumps(masked_old, ensure_ascii=False, default=str),
            "new_values": json.dumps(masked_new, ensure_ascii=False, default=str),
            "changed_fields": fields,
            "summary": summary,
            "result_status": result_status,
            "severity": severity,
            "metadata_json": json.dumps(
                mask_sensitive_data(metadata or {}),
                ensure_ascii=False,
                default=str,
            ),
        },
    )
    row = row_to_dict(result.mappings().one()) or {}
    observe_duration("audit_query_duration_ms", (time.perf_counter() - started) * 1000)
    increment_counter("audit_recorded_count")
    log_info(
        "Audit record inserted.",
        logger_name="eden.audit",
        module_key=module_key or context.get("module_key"),
        action_key=action_key,
        entity_type=entity_type,
        result_status=result_status,
        severity=severity,
    )
    return row


async def record_audit_best_effort(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    action_type: str,
    action_key: str,
    summary: str,
    result_status: str = "success",
    severity: str = "info",
    entity_type: str | None = None,
    entity_id: str | None = None,
    branch_id: str | None = None,
    old_values: dict[str, Any] | None = None,
    new_values: dict[str, Any] | None = None,
    metadata: dict[str, Any] | None = None,
) -> str | None:
    try:
        async with session.begin_nested():
            row = await record_audit(
                session,
                context,
                action_type=action_type,
                action_key=action_key,
                summary=summary,
                result_status=result_status,
                severity=severity,
                entity_type=entity_type,
                entity_id=entity_id,
                branch_id=branch_id,
                old_values=old_values,
                new_values=new_values,
                metadata=metadata,
            )
        return str(row["id"])
    except Exception as error:  # pragma: no cover - best-effort safety net
        increment_counter("audit_write_failed_count")
        log_warning(
            "Audit insert skipped.",
            logger_name="eden.audit",
            exception_type=error.__class__.__name__,
            action_key=action_key,
            entity_type=entity_type,
            result_status="failed",
        )
        logger.warning("Audit insert skipped: %s", error)
        return None


async def record_view(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    entity_type: str,
    entity_id: str | None,
    summary: str,
) -> dict[str, Any]:
    return await record_audit(
        session,
        context,
        action_type="view",
        action_key="record.view",
        entity_type=entity_type,
        entity_id=entity_id,
        summary=summary,
    )


async def record_create(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    entity_type: str,
    entity_id: str,
    new_values: dict[str, Any],
) -> dict[str, Any]:
    return await record_audit(
        session,
        context,
        action_type="create",
        action_key="record.create",
        entity_type=entity_type,
        entity_id=entity_id,
        new_values=new_values,
        summary="Kayit olusturuldu.",
    )


async def record_update(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    entity_type: str,
    entity_id: str,
    old_values: dict[str, Any],
    new_values: dict[str, Any],
) -> dict[str, Any]:
    return await record_audit(
        session,
        context,
        action_type="update",
        action_key="record.update",
        entity_type=entity_type,
        entity_id=entity_id,
        old_values=old_values,
        new_values=new_values,
        summary="Kayit guncellendi.",
    )


async def record_delete(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    entity_type: str,
    entity_id: str,
    old_values: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return await record_audit(
        session,
        context,
        action_type="delete",
        action_key="record.delete",
        entity_type=entity_type,
        entity_id=entity_id,
        old_values=old_values,
        summary="Kayit silindi.",
    )


async def record_operation_start(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
) -> dict[str, Any]:
    return await record_audit(
        session,
        context,
        action_type="operation_start",
        action_key="operation.start",
        new_values=payload,
        summary="Islem baslatildi.",
    )


async def record_operation_complete(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
) -> dict[str, Any]:
    return await record_audit(
        session,
        context,
        action_type="operation_complete",
        action_key="operation.complete",
        new_values=payload,
        summary="Islem tamamlandi.",
    )


async def record_operation_fail(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
) -> dict[str, Any]:
    return await record_audit(
        session,
        context,
        action_type="operation_fail",
        action_key="operation.fail",
        new_values=payload,
        summary="Islem tamamlanamadi.",
        result_status="failed",
        severity="warning",
    )


async def record_process_event(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
) -> dict[str, Any]:
    return await record_audit(
        session,
        context,
        action_type="process_event",
        action_key="process.event",
        new_values=payload,
        summary="Surec olayi kaydedildi.",
    )


async def record_permission_denied(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
) -> dict[str, Any]:
    return await record_audit(
        session,
        context,
        action_type="permission_denied",
        action_key="permission.denied",
        new_values=payload,
        summary="Yetki kontrolu reddedildi.",
        result_status="denied",
        severity="warning",
    )


async def record_policy_denied(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
) -> dict[str, Any]:
    return await record_audit(
        session,
        context,
        action_type="policy_denied",
        action_key="policy.denied",
        new_values=payload,
        summary="Politika kontrolu reddedildi.",
        result_status="denied",
        severity="warning",
    )


async def record_document_event(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
) -> dict[str, Any]:
    return await record_audit(
        session,
        context,
        action_type="document_event",
        action_key="document.event",
        new_values=payload,
        summary="Belge olayi kaydedildi.",
    )


async def list_audit_logs(
    session: AsyncSession,
    context: dict[str, Any],
    query: dict[str, Any],
) -> tuple[list[dict[str, Any]], int]:
    if not await table_exists(session, "public.audit_logs"):
        return [], 0
    limit = int(query.get("limit") or 50)
    offset = int(query.get("offset") or 0)
    filters = ["tenant_id = :tenant_id"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "limit": limit, "offset": offset}
    for key in [
        "entity_type",
        "entity_id",
        "company_id",
        "branch_id",
        "module_key",
        "action_type",
        "action_key",
        "user_id",
        "result_status",
        "severity",
        "operation_id",
        "process_instance_id",
        "request_id",
    ]:
        if query.get(key):
            filters.append(f"{key} = :{key}")
            params[key] = query[key]
    if query.get("correlation_id"):
        filters.append("metadata_json ->> 'correlation_id' = :correlation_id")
        params["correlation_id"] = query["correlation_id"]
    if query.get("search"):
        filters.append(
            """
            (
              summary ilike :search
              or coalesce(reason, '') ilike :search
              or coalesce(action_key, '') ilike :search
              or coalesce(action_type, '') ilike :search
              or coalesce(request_id, '') ilike :search
              or coalesce(user_label, '') ilike :search
              or coalesce(entity_id, '') ilike :search
              or coalesce(metadata_json ->> 'record_label', '') ilike :search
              or coalesce(metadata_json ->> 'correlation_id', '') ilike :search
            )
            """
        )
        params["search"] = f"%{query['search']}%"
    if query.get("date_from"):
        filters.append("created_at >= :date_from")
        params["date_from"] = query["date_from"]
    if query.get("date_to"):
        filters.append("created_at <= :date_to")
        params["date_to"] = query["date_to"]
    where_clause = " and ".join(filters)
    rows = await session.execute(
        text(
            f"""
            select *
            from public.audit_logs
            where {where_clause}
            order by created_at desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    count = await session.execute(
        text(f"select count(*) as count from public.audit_logs where {where_clause}"),
        params,
    )
    return rows_to_dicts(list(rows.mappings().all())), int(count.mappings().one()["count"] or 0)


async def get_audit_log(
    session: AsyncSession,
    context: dict[str, Any],
    audit_id: str,
) -> dict[str, Any] | None:
    if not await table_exists(session, "public.audit_logs"):
        return None
    result = await session.execute(
        text(
            """
            select *
            from public.audit_logs
            where id = :audit_id and tenant_id = :tenant_id
            limit 1
            """
        ),
        {"audit_id": audit_id, "tenant_id": context["tenant_id"]},
    )
    return row_to_dict(result.mappings().one_or_none())


async def list_audit_by_record(
    session: AsyncSession,
    context: dict[str, Any],
    entity_type: str,
    entity_id: str,
) -> list[dict[str, Any]]:
    rows, _ = await list_audit_logs(
        session,
        context,
        {"entity_type": entity_type, "entity_id": entity_id},
    )
    return rows


async def list_audit_by_operation(
    session: AsyncSession,
    context: dict[str, Any],
    operation_id: str,
) -> list[dict[str, Any]]:
    rows, _ = await list_audit_logs(session, context, {"operation_id": operation_id})
    return rows


async def list_audit_by_process(
    session: AsyncSession,
    context: dict[str, Any],
    process_instance_id: str,
) -> list[dict[str, Any]]:
    rows, _ = await list_audit_logs(session, context, {"process_instance_id": process_instance_id})
    return rows
