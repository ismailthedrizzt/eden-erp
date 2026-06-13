from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def insert_employee_lifecycle_event(
    session: AsyncSession,
    *,
    tenant_id: str,
    employee_id: str,
    operation_id: str,
    operation_type: str,
    payload: dict[str, Any],
    process_instance_id: str | None = None,
) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            insert into public.hr_employee_lifecycle_events (
              id, tenant_id, employee_id, operation_id, process_instance_id,
              operation_type, event_payload_json, created_at
            )
            values (
              :id, :tenant_id, :employee_id, :operation_id, :process_instance_id,
              :operation_type, cast(:event_payload_json as jsonb), now()
            )
            returning *
            """
        ),
        {
            "id": str(uuid4()),
            "tenant_id": tenant_id,
            "employee_id": employee_id,
            "operation_id": operation_id,
            "process_instance_id": process_instance_id,
            "operation_type": operation_type,
            "event_payload_json": json.dumps(payload, ensure_ascii=False, default=str),
        },
    )
    return dict(result.mappings().one())
