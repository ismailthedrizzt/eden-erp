from __future__ import annotations

import json
import logging
from typing import Any
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.operations.service import table_exists

logger = logging.getLogger(__name__)


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
        if not await table_exists(session, "public.audit_logs"):
            return None
        audit_id = str(uuid4())
        await session.execute(
            text(
                """
                insert into public.audit_logs (
                  id, tenant_id, company_id, branch_id, module_key, entity_type, entity_id,
                  action_type, action_key, operation_id, user_id, old_values, new_values,
                  changed_fields, summary, result_status, severity, metadata_json
                )
                values (
                  :id, :tenant_id, :company_id, :branch_id, :module_key, :entity_type, :entity_id,
                  :action_type, :action_key, :operation_id, :user_id,
                  cast(:old_values as jsonb), cast(:new_values as jsonb), :changed_fields,
                  :summary, :result_status, :severity, cast(:metadata_json as jsonb)
                )
                """
            ),
            {
                "id": audit_id,
                "tenant_id": context["tenant_id"],
                "company_id": context.get("company_id"),
                "branch_id": branch_id,
                "module_key": context.get("module_key", "branches"),
                "entity_type": entity_type,
                "entity_id": entity_id,
                "action_type": action_type,
                "action_key": action_key,
                "operation_id": context.get("operation_id"),
                "user_id": context.get("user_id"),
                "old_values": json.dumps(old_values or {}, ensure_ascii=False, default=str),
                "new_values": json.dumps(new_values or {}, ensure_ascii=False, default=str),
                "changed_fields": list((new_values or {}).keys()),
                "summary": summary,
                "result_status": result_status,
                "severity": severity,
                "metadata_json": json.dumps(metadata or {}, ensure_ascii=False, default=str),
            },
        )
        return audit_id
    except Exception as error:  # pragma: no cover - best-effort safety net
        logger.warning("Audit insert skipped: %s", error)
        return None
