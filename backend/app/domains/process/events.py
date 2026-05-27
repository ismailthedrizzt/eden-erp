from __future__ import annotations

import json
import logging
from typing import Any
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.serialization import row_to_dict
from app.domains.operations.service import table_exists
from app.domains.outbox.service import enqueue_outbox_event_best_effort

logger = logging.getLogger(__name__)


async def emit_process_event(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    process_instance_id: str,
    event_type: str,
    module_key: str,
    company_id: str | None = None,
    step_key: str | None = None,
    old_status: str | None = None,
    new_status: str | None = None,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    if not await table_exists(session, "public.process_events"):
        return None
    event_id = str(uuid4())
    result = await session.execute(
        text(
            """
            insert into public.process_events (
              id, tenant_id, process_instance_id, company_id, module_key, event_type,
              step_key, old_status, new_status, payload_json, created_by
            )
            values (
              :id, :tenant_id, :process_instance_id, :company_id, :module_key, :event_type,
              :step_key, :old_status, :new_status, cast(:payload_json as jsonb), :created_by
            )
            returning *
            """
        ),
        {
            "id": event_id,
            "tenant_id": context["tenant_id"],
            "process_instance_id": process_instance_id,
            "company_id": company_id or context.get("company_id"),
            "module_key": module_key,
            "event_type": event_type,
            "step_key": step_key,
            "old_status": old_status,
            "new_status": new_status,
            "payload_json": json.dumps(payload or {}, ensure_ascii=False, default=str),
            "created_by": context.get("user_id"),
        },
    )
    row = row_to_dict(result.mappings().one())
    await enqueue_outbox_event_best_effort(
        session,
        {
            **context,
            "company_id": company_id or context.get("company_id"),
            "module_key": module_key,
        },
        event_type=f"process.{event_type}",
        aggregate_type="process_instance",
        aggregate_id=process_instance_id,
        payload=row or {},
    )
    return row
