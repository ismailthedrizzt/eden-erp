from __future__ import annotations

from typing import Any

from sqlalchemy import text

from app.domains.automation.executor import run_rule_now
from app.domains.automation.service import (
    AutomationContext,
    ensure_automation_tables,
    normalize_row,
)
from app.domains.automation.triggers import event_matches_rule


async def handle_automation_event(
    ctx: AutomationContext,
    *,
    event_type: str,
    trigger_event_id: str | None = None,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    await ensure_automation_tables(ctx.session, rules=True, runs=True)
    result = await ctx.session.execute(
        text(
            """
            select *
            from public.automation_rules
            where tenant_id = :tenant_id
              and status = 'active'
              and trigger_type = 'event'
              and coalesce(is_deleted, false) = false
            order by priority desc, updated_at desc
            """
        ),
        {"tenant_id": ctx.tenant_id},
    )
    rules = [normalize_row(row) for row in result.mappings()]
    matched = [rule for rule in rules if event_matches_rule(rule, event_type, payload)]
    completed = 0
    failed = 0
    for rule in matched:
        run = await run_rule_now(
            ctx,
            str(rule["id"]),
            trigger_event_id=trigger_event_id,
            trigger_payload=payload,
        )
        if run.get("status") == "failed":
            failed += 1
        else:
            completed += 1
    return {
        "event_type": event_type,
        "matched_rules": len(matched),
        "completed": completed,
        "failed": failed,
    }
