# ruff: noqa: E501

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import RequestContext
from app.domains.automation.executor import run_rule_now
from app.domains.automation.service import AutomationContext, ensure_automation_tables
from app.domains.automation.triggers import list_due_rules

DEFAULT_BATCH_SIZE = 20


async def run_due_automation_rules(session: AsyncSession, tenant_id: str, *, batch_size: int = DEFAULT_BATCH_SIZE) -> dict[str, Any]:
    ctx = AutomationContext(
        session=session,
        request_context=RequestContext(tenant_id=tenant_id, user_id=None, permissions=["automation.admin", "system.admin"]),
        tenant_id=tenant_id,
    )
    await ensure_automation_tables(session, rules=True, runs=True, action_results=True)
    rules = await list_due_rules(ctx, limit=batch_size)
    completed = 0
    skipped = 0
    failed = 0
    for rule in rules:
        result = await run_rule_now(ctx, str(rule["id"]))
        status = result.get("status")
        if status == "failed":
            failed += 1
        elif status in {"skipped", "throttled", "condition_not_met", "permission_denied", "readiness_missing"}:
            skipped += 1
        else:
            completed += 1
    return {"processed": len(rules), "completed": completed, "skipped": skipped, "failed": failed}
