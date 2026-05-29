from __future__ import annotations

from typing import Any

from app.domains.automation.actions import execute_actions
from app.domains.automation.conditions import evaluate_rule_conditions
from app.domains.automation.rules import get_rule
from app.domains.automation.service import AutomationContext


async def simulate_rule(
    ctx: AutomationContext,
    rule_id: str,
    *,
    limit: int = 20,
    trigger_payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    rule = await get_rule(ctx, rule_id)
    evaluation = await evaluate_rule_conditions(ctx, rule, preview_limit=limit)
    actions = await execute_actions(
        ctx,
        rule=rule,
        run_id="simulation",
        evaluation=evaluation,
        simulate=True,
    )
    return {
        "rule": rule,
        "matched_count": evaluation.matched_count,
        "matched_preview": evaluation.records[:limit],
        "action_preview": actions.previews or [],
        "warnings": evaluation.warnings,
        "trigger_payload_masked": bool(trigger_payload),
        "simulation_only": True,
    }
