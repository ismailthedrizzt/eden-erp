from __future__ import annotations

import time
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import bind_log_context, log_info, log_warning
from app.core.metrics import record_outbox, set_gauge
from app.domains.outbox.handlers import resolve_handlers
from app.domains.outbox.schemas import OutboxDispatchSummary
from app.domains.outbox.service import (
    fetch_pending_batch,
    mark_completed,
    mark_failed,
    mark_processing,
)


async def dispatch_event(
    session: AsyncSession,
    event: dict[str, Any],
    *,
    locked_by: str,
) -> dict[str, Any]:
    started = time.perf_counter()
    bind_log_context(outbox_event_id=str(event["id"]))
    log_info(
        "Outbox event processing started.",
        logger_name="eden.outbox",
        outbox_event_id=str(event["id"]),
        event_type=event.get("event_type"),
    )
    await mark_processing(session, str(event["id"]), locked_by=locked_by)
    handler_results: list[dict[str, Any]] = []
    try:
        for handler_key, handler in resolve_handlers(event).items():
            result = await handler(session, event)
            handler_results.append({"handler_key": handler_key, **result})
        await mark_completed(session, str(event["id"]), {"handler_results": handler_results})
        duration_ms = (time.perf_counter() - started) * 1000
        record_outbox("completed", duration_ms)
        log_info(
            "Outbox event completed.",
            logger_name="eden.outbox",
            outbox_event_id=str(event["id"]),
            duration_ms=round(duration_ms, 2),
        )
        return {"status": "completed", "handler_results": handler_results}
    except Exception as error:
        await mark_failed(session, event, error)
        duration_ms = (time.perf_counter() - started) * 1000
        record_outbox("failed", duration_ms)
        log_warning(
            "Outbox event failed.",
            logger_name="eden.outbox",
            outbox_event_id=str(event["id"]),
            exception_type=error.__class__.__name__,
            retry_count=int(event.get("retry_count") or 0) + 1,
            max_retries=int(event.get("max_retries") or 5),
            duration_ms=round(duration_ms, 2),
        )
        return {"status": "failed", "error": str(error)}


async def dispatch_pending_events(
    session: AsyncSession,
    *,
    batch_size: int,
    locked_by: str,
) -> dict[str, Any]:
    started = time.perf_counter()
    events = await fetch_pending_batch(session, batch_size=batch_size)
    set_gauge("outbox_pending_count", len(events))
    log_info(
        "Outbox batch started.",
        logger_name="eden.outbox",
        batch_size=batch_size,
        row_count=len(events),
        worker_id=locked_by,
    )
    summary = OutboxDispatchSummary(processed=len(events))
    for event in events:
        result = await dispatch_event(session, event, locked_by=locked_by)
        if result["status"] == "completed":
            summary.completed += 1
        elif result["status"] == "failed":
            if int(event.get("retry_count") or 0) + 1 >= int(event.get("max_retries") or 5):
                summary.failed += 1
            else:
                summary.retried += 1
            summary.errors.append(str(result.get("error") or "handler_failed"))
        else:
            summary.skipped += 1
    summary.duration_ms = int((time.perf_counter() - started) * 1000)
    log_info(
        "Outbox batch completed.",
        logger_name="eden.outbox",
        duration_ms=summary.duration_ms,
        processed=summary.processed,
        completed=summary.completed,
        failed=summary.failed,
        retried=summary.retried,
        skipped=summary.skipped,
    )
    return summary.model_dump()
