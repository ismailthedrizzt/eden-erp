from __future__ import annotations

import json
import logging
from typing import Any
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.operations.service import table_exists

logger = logging.getLogger(__name__)


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
        if not await table_exists(session, "public.outbox_events"):
            return None
        event_id = str(uuid4())
        await session.execute(
            text(
                """
                insert into public.outbox_events (
                  id, tenant_id, company_id, module_key, event_type, aggregate_type,
                  aggregate_id, operation_id, payload_json, status
                )
                values (
                  :id, :tenant_id, :company_id, :module_key, :event_type, :aggregate_type,
                  :aggregate_id, :operation_id, cast(:payload_json as jsonb), 'pending'
                )
                """
            ),
            {
                "id": event_id,
                "tenant_id": context["tenant_id"],
                "company_id": context.get("company_id"),
                "module_key": context.get("module_key", "branches"),
                "event_type": event_type,
                "aggregate_type": aggregate_type,
                "aggregate_id": aggregate_id,
                "operation_id": context.get("operation_id"),
                "payload_json": json.dumps(payload, ensure_ascii=False, default=str),
            },
        )
        return event_id
    except Exception as error:  # pragma: no cover - best-effort safety net
        logger.warning("Outbox enqueue skipped: %s", error)
        return None
