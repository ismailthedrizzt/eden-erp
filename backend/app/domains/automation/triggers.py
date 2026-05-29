from __future__ import annotations

from typing import Any

from sqlalchemy import text

from app.domains.automation.service import (
    AutomationContext,
    ensure_automation_tables,
    normalize_row,
)


async def list_due_rules(ctx: AutomationContext, *, limit: int = 20) -> list[dict[str, Any]]:
    await ensure_automation_tables(ctx.session, rules=True)
    result = await ctx.session.execute(
        text(
            """
            select *
            from public.automation_rules
            where tenant_id = :tenant_id
              and status = 'active'
              and trigger_type in ('schedule', 'condition')
              and next_run_at is not null
              and next_run_at <= now()
              and coalesce(is_deleted, false) = false
            order by next_run_at asc, rule_key asc
            limit :limit
            """
        ),
        {"tenant_id": ctx.tenant_id, "limit": limit},
    )
    return [normalize_row(row) for row in result.mappings()]


def event_matches_rule(
    rule: dict[str, Any],
    event_type: str,
    payload: dict[str, Any] | None = None,
) -> bool:
    if rule.get("trigger_type") != "event":
        return False
    trigger_config = rule.get("trigger_config") or {}
    if str(trigger_config.get("event_type") or "") != event_type:
        return False
    module_key = trigger_config.get("module_key")
    if module_key and payload and str(payload.get("module_key") or "") not in {"", str(module_key)}:
        return False
    return True
