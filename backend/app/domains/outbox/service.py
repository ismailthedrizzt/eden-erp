from __future__ import annotations

import json
import logging
from typing import Any
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import log_info, log_warning
from app.core.metrics import increment_counter
from app.core.serialization import row_to_dict, rows_to_dicts
from app.domains.operations.service import table_exists

logger = logging.getLogger(__name__)

OUTBOX_REQUIRED_COLUMNS = {
    "id",
    "tenant_id",
    "company_id",
    "module_key",
    "event_type",
    "event_version",
    "aggregate_type",
    "aggregate_id",
    "operation_id",
    "process_instance_id",
    "causation_id",
    "correlation_id",
    "payload_json",
    "metadata_json",
    "status",
}


async def _table_columns(session: AsyncSession, table_name: str) -> set[str]:
    result = await session.execute(
        text(
            """
            select column_name
            from information_schema.columns
            where table_schema = 'public'
              and table_name = :table_name
            """
        ),
        {"table_name": table_name},
    )
    return {str(column) for column in result.scalars().all()}


async def _assert_outbox_schema_compatible(session: AsyncSession) -> None:
    columns = await _table_columns(session, "outbox_events")
    missing = sorted(OUTBOX_REQUIRED_COLUMNS - columns)
    if missing:
        raise RuntimeError(
            "Outbox infrastructure is not compatible. "
            f"Missing columns: {', '.join(missing)}"
        )


async def enqueue_event(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    event_type: str,
    aggregate_type: str,
    aggregate_id: str,
    payload: dict[str, Any],
    event_version: str = "1.0",
    process_instance_id: str | None = None,
    causation_id: str | None = None,
    correlation_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if not await table_exists(session, "public.outbox_events"):
        raise RuntimeError("Outbox infrastructure is not available.")
    await _assert_outbox_schema_compatible(session)
    event_id = str(uuid4())
    result = await session.execute(
        text(
            """
            insert into public.outbox_events (
              id, tenant_id, company_id, module_key, event_type, event_version, aggregate_type,
              aggregate_id, operation_id, process_instance_id, causation_id, correlation_id,
              payload_json, metadata_json, status
            )
            values (
              :id, :tenant_id, :company_id, :module_key, :event_type, :event_version,
              :aggregate_type, :aggregate_id, :operation_id, :process_instance_id,
              :causation_id, :correlation_id, cast(:payload_json as jsonb),
              cast(:metadata_json as jsonb), 'pending'
            )
            returning *
            """
        ),
        {
            "id": event_id,
            "tenant_id": context.get("tenant_id"),
            "company_id": context.get("company_id"),
            "module_key": context.get("module_key", "platform"),
            "event_type": event_type,
            "event_version": event_version,
            "aggregate_type": aggregate_type,
            "aggregate_id": aggregate_id,
            "operation_id": context.get("operation_id"),
            "process_instance_id": process_instance_id or context.get("process_instance_id"),
            "causation_id": causation_id,
            "correlation_id": correlation_id,
            "payload_json": json.dumps(payload, ensure_ascii=False, default=str),
            "metadata_json": json.dumps(metadata or {}, ensure_ascii=False, default=str),
        },
    )
    row = row_to_dict(result.mappings().one()) or {}
    increment_counter("outbox_pending_count")
    log_info(
        "Outbox event enqueued.",
        logger_name="eden.outbox",
        outbox_event_id=str(row.get("id")),
        event_type=event_type,
        aggregate_type=aggregate_type,
        module_key=context.get("module_key", "platform"),
    )
    return row


async def enqueue_many(
    session: AsyncSession,
    context: dict[str, Any],
    events: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for event in events:
        rows.append(
            await enqueue_event(
                session,
                context,
                event_type=str(event["event_type"]),
                aggregate_type=str(event["aggregate_type"]),
                aggregate_id=str(event["aggregate_id"]),
                payload=dict(event.get("payload") or {}),
                metadata=dict(event.get("metadata") or {}),
            )
        )
    return rows


async def enqueue_outbox_event_best_effort(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    event_type: str,
    aggregate_type: str,
    aggregate_id: str,
    payload: dict[str, Any],
) -> str | None:
    try:
        async with session.begin_nested():
            row = await enqueue_event(
                session,
                context,
                event_type=event_type,
                aggregate_type=aggregate_type,
                aggregate_id=aggregate_id,
                payload=payload,
            )
        return str(row["id"])
    except Exception as error:  # pragma: no cover - best-effort safety net
        increment_counter("outbox_enqueue_failed_count")
        log_warning(
            "Outbox enqueue skipped.",
            logger_name="eden.outbox",
            exception_type=error.__class__.__name__,
            event_type=event_type,
            aggregate_type=aggregate_type,
        )
        logger.warning("Outbox enqueue skipped: %s", error)
        return None


async def fetch_pending_batch(session: AsyncSession, *, batch_size: int) -> list[dict[str, Any]]:
    if not await table_exists(session, "public.outbox_events"):
        return []
    result = await session.execute(
        text(
            """
            select *
            from public.outbox_events
            where status in ('pending', 'failed')
              and coalesce(retry_count, 0) < coalesce(max_retries, 5)
              and (locked_at is null or locked_at < now() - interval '5 minutes')
            order by occurred_at nulls last, created_at
            limit :batch_size
            for update skip locked
            """
        ),
        {"batch_size": batch_size},
    )
    return rows_to_dicts(list(result.mappings().all()))


async def mark_processing(session: AsyncSession, event_id: str, *, locked_by: str) -> None:
    await session.execute(
        text(
            """
            update public.outbox_events
            set status = 'processing',
                locked_at = now(),
                locked_by = :locked_by,
                updated_at = now()
            where id = :event_id
            """
        ),
        {"event_id": event_id, "locked_by": locked_by},
    )


async def mark_completed(
    session: AsyncSession,
    event_id: str,
    handler_result: dict[str, Any],
) -> None:
    await session.execute(
        text(
            """
            update public.outbox_events
            set status = 'completed',
                published_at = now(),
                error_json = null,
                locked_at = null,
                locked_by = null,
                metadata_json = coalesce(metadata_json, '{}'::jsonb)
                  || cast(:handler_result as jsonb),
                updated_at = now()
            where id = :event_id
            """
        ),
        {
            "event_id": event_id,
            "handler_result": json.dumps(handler_result, ensure_ascii=False, default=str),
        },
    )


async def mark_failed(session: AsyncSession, event: dict[str, Any], error: Exception) -> None:
    retry_count = int(event.get("retry_count") or 0) + 1
    max_retries = int(event.get("max_retries") or 5)
    status = "dead_letter" if retry_count >= max_retries else "pending"
    await session.execute(
        text(
            """
            update public.outbox_events
            set status = :status,
                retry_count = :retry_count,
                error_json = cast(:error_json as jsonb),
                locked_at = null,
                locked_by = null,
                updated_at = now()
            where id = :event_id
            """
        ),
        {
            "event_id": event["id"],
            "status": status,
            "retry_count": retry_count,
            "error_json": json.dumps({"message": str(error)}, ensure_ascii=False),
        },
    )


async def mark_skipped(session: AsyncSession, event_id: str, reason: str) -> None:
    await session.execute(
        text(
            """
            update public.outbox_events
            set status = 'skipped',
                error_json = cast(:error_json as jsonb),
                locked_at = null,
                locked_by = null,
                updated_at = now()
            where id = :event_id
            """
        ),
        {"event_id": event_id, "error_json": json.dumps({"reason": reason}, ensure_ascii=False)},
    )


async def release_stale_locks(session: AsyncSession, *, lock_ttl_seconds: int = 300) -> int:
    result = await session.execute(
        text(
            """
            update public.outbox_events
            set status = 'pending', locked_at = null, locked_by = null, updated_at = now()
            where status = 'processing'
              and locked_at < now() - (:lock_ttl_seconds * interval '1 second')
            """
        ),
        {"lock_ttl_seconds": lock_ttl_seconds},
    )
    return int(getattr(result, "rowcount", 0) or 0)


async def dispatch_pending_events(
    session: AsyncSession,
    *,
    batch_size: int,
    locked_by: str,
) -> dict[str, Any]:
    from app.domains.outbox.dispatcher import dispatch_pending_events as dispatch

    return await dispatch(session, batch_size=batch_size, locked_by=locked_by)


async def dispatch_event(
    session: AsyncSession,
    event: dict[str, Any],
    *,
    locked_by: str,
) -> dict[str, Any]:
    from app.domains.outbox.dispatcher import dispatch_event as dispatch_one

    return await dispatch_one(session, event, locked_by=locked_by)
