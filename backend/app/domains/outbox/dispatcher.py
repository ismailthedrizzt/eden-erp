from __future__ import annotations

import time
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

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
    await mark_processing(session, str(event["id"]), locked_by=locked_by)
    handler_results: list[dict[str, Any]] = []
    try:
        for handler_key, handler in resolve_handlers(event).items():
            result = await handler(session, event)
            handler_results.append({"handler_key": handler_key, **result})
        await mark_completed(session, str(event["id"]), {"handler_results": handler_results})
        return {"status": "completed", "handler_results": handler_results}
    except Exception as error:
        await mark_failed(session, event, error)
        return {"status": "failed", "error": str(error)}


async def dispatch_pending_events(
    session: AsyncSession,
    *,
    batch_size: int,
    locked_by: str,
) -> dict[str, Any]:
    started = time.perf_counter()
    events = await fetch_pending_batch(session, batch_size=batch_size)
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
    return summary.model_dump()
