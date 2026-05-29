# ruff: noqa: E501

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from time import perf_counter
from typing import Any

from sqlalchemy import text

from app.domains.automation.actions import execute_actions
from app.domains.automation.conditions import evaluate_rule_conditions
from app.domains.automation.rules import get_rule
from app.domains.automation.service import (
    AutomationContext,
    ensure_automation_tables,
    json_dumps,
    next_run_for_schedule,
    normalize_row,
    record_automation_audit_best_effort,
)


async def run_rule_now(ctx: AutomationContext, rule_id: str, *, trigger_event_id: str | None = None, trigger_payload: dict[str, Any] | None = None) -> dict[str, Any]:
    await ensure_automation_tables(ctx.session, rules=True, runs=True, action_results=True)
    rule = await get_rule(ctx, rule_id)
    started = datetime.now(UTC)
    run_row = await _create_run(ctx, rule, trigger_event_id=trigger_event_id, metadata={"trigger_payload": trigger_payload or {}})
    run_id = str(run_row["id"])
    timer = perf_counter()
    status = "success"
    error_message: str | None = None
    matched_count = actions_count = skipped_count = failure_count = 0
    try:
        if rule.get("status") != "active":
            status = "skipped"
            skipped_count = 1
            error_message = "Kural active olmadigi icin calistirilmadi."
        elif await _is_throttled(ctx, rule):
            status = "throttled"
            skipped_count = 1
            error_message = "Kural cooldown veya gunluk limit nedeniyle atlandi."
        else:
            evaluation = await evaluate_rule_conditions(ctx, rule)
            matched_count = evaluation.matched_count
            if evaluation.status in {"permission_denied", "readiness_missing"}:
                status = evaluation.status
                skipped_count = 1
                error_message = "; ".join(evaluation.warnings)
            elif matched_count == 0:
                status = "condition_not_met"
            else:
                actions = await execute_actions(ctx, rule=rule, run_id=run_id, evaluation=evaluation)
                actions_count = actions.actions_created_count
                skipped_count = actions.skipped_count
                failure_count = actions.failure_count
                status = "failed" if failure_count > 0 and actions_count == 0 else "success"
    except Exception as exc:  # pragma: no cover - defensive runtime guard
        status = "failed"
        failure_count = 1
        error_message = str(exc)[:500]

    completed = datetime.now(UTC)
    duration_ms = int((perf_counter() - timer) * 1000)
    result = await _complete_run(
        ctx,
        run_id=run_id,
        status=status,
        matched_count=matched_count,
        actions_created_count=actions_count,
        skipped_count=skipped_count,
        failure_count=failure_count,
        error_message=error_message,
        completed_at=completed,
        duration_ms=duration_ms,
    )
    await _update_rule_after_run(ctx, rule, status=status, completed_at=completed)
    await record_automation_audit_best_effort(
        ctx,
        action_type="automation_rule_run",
        entity_type="automation_rule",
        entity_id=rule_id,
        metadata={"status": status, "matched_count": matched_count, "actions_created_count": actions_count, "started_at": started.isoformat()},
    )
    return result


async def _create_run(ctx: AutomationContext, rule: dict[str, Any], *, trigger_event_id: str | None, metadata: dict[str, Any]) -> dict[str, Any]:
    result = await ctx.session.execute(
        text(
            """
            insert into public.automation_rule_runs (
              tenant_id, rule_id, trigger_type, trigger_event_id, status, started_at, metadata_json
            )
            values (
              :tenant_id, :rule_id, :trigger_type, :trigger_event_id, 'running', now(), cast(:metadata_json as jsonb)
            )
            returning *
            """
        ),
        {
            "tenant_id": ctx.tenant_id,
            "rule_id": rule["id"],
            "trigger_type": rule["trigger_type"],
            "trigger_event_id": trigger_event_id,
            "metadata_json": json_dumps(metadata),
        },
    )
    return normalize_row(result.mappings().one())


async def _complete_run(
    ctx: AutomationContext,
    *,
    run_id: str,
    status: str,
    matched_count: int,
    actions_created_count: int,
    skipped_count: int,
    failure_count: int,
    error_message: str | None,
    completed_at: datetime,
    duration_ms: int,
) -> dict[str, Any]:
    result = await ctx.session.execute(
        text(
            """
            update public.automation_rule_runs
            set status = :status,
                matched_count = :matched_count,
                actions_created_count = :actions_created_count,
                skipped_count = :skipped_count,
                failure_count = :failure_count,
                error_message = :error_message,
                completed_at = :completed_at,
                duration_ms = :duration_ms
            where tenant_id = :tenant_id and id = :run_id
            returning *
            """
        ),
        {
            "tenant_id": ctx.tenant_id,
            "run_id": run_id,
            "status": status,
            "matched_count": matched_count,
            "actions_created_count": actions_created_count,
            "skipped_count": skipped_count,
            "failure_count": failure_count,
            "error_message": error_message,
            "completed_at": completed_at,
            "duration_ms": duration_ms,
        },
    )
    return normalize_row(result.mappings().one())


async def _update_rule_after_run(ctx: AutomationContext, rule: dict[str, Any], *, status: str, completed_at: datetime) -> None:
    next_run_at = next_run_for_schedule(rule.get("trigger_config") or {}, completed_at) if rule.get("trigger_type") in {"schedule", "condition"} else rule.get("next_run_at")
    await ctx.session.execute(
        text(
            """
            update public.automation_rules
            set last_run_at = :completed_at,
                next_run_at = :next_run_at,
                run_count = run_count + 1,
                failure_count = case when :status = 'failed' then failure_count + 1 else failure_count end,
                status = case when :status = 'failed' and failure_count >= 4 then 'failed' else status end,
                updated_at = now()
            where tenant_id = :tenant_id and id = :rule_id
            """
        ),
        {"tenant_id": ctx.tenant_id, "rule_id": rule["id"], "status": status, "completed_at": completed_at, "next_run_at": next_run_at},
    )


async def _is_throttled(ctx: AutomationContext, rule: dict[str, Any]) -> bool:
    cooldown = rule.get("cooldown_minutes")
    if cooldown and rule.get("last_run_at"):
        last_run = rule["last_run_at"]
        if isinstance(last_run, datetime) and last_run > datetime.now(UTC) - timedelta(minutes=int(cooldown)):
            return True
    max_runs = rule.get("max_runs_per_day")
    if not max_runs:
        return False
    result = await ctx.session.execute(
        text(
            """
            select count(*)
            from public.automation_rule_runs
            where tenant_id = :tenant_id
              and rule_id = :rule_id
              and started_at >= now() - interval '1 day'
              and status = 'success'
            """
        ),
        {"tenant_id": ctx.tenant_id, "rule_id": rule["id"]},
    )
    return int(result.scalar_one() or 0) >= int(max_runs)


async def list_runs(ctx: AutomationContext, *, rule_id: str | None = None, status: str | None = None, trigger_type: str | None = None, page: int = 1, page_size: int = 50) -> dict[str, Any]:
    await ensure_automation_tables(ctx.session, runs=True)
    where = ["tenant_id = :tenant_id"]
    params: dict[str, Any] = {"tenant_id": ctx.tenant_id, "limit": page_size, "offset": (page - 1) * page_size}
    if rule_id:
        where.append("rule_id = :rule_id")
        params["rule_id"] = rule_id
    if status:
        where.append("status = :status")
        params["status"] = status
    if trigger_type:
        where.append("trigger_type = :trigger_type")
        params["trigger_type"] = trigger_type
    where_sql = " and ".join(where)
    total_result = await ctx.session.execute(text(f"select count(*) from public.automation_rule_runs where {where_sql}"), params)
    result = await ctx.session.execute(
        text(
            f"""
            select r.*, ar.rule_name, ar.rule_key
            from public.automation_rule_runs r
            left join public.automation_rules ar on ar.tenant_id = r.tenant_id and ar.id = r.rule_id
            where {where_sql.replace('tenant_id', 'r.tenant_id').replace('rule_id', 'r.rule_id')}
            order by r.started_at desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    total = int(total_result.scalar_one() or 0)
    return {"items": [normalize_row(row) for row in result.mappings()], "meta": {"page": page, "pageSize": page_size, "total": total, "totalPages": max(1, (total + page_size - 1) // page_size)}}


async def get_run(ctx: AutomationContext, run_id: str) -> dict[str, Any] | None:
    await ensure_automation_tables(ctx.session, runs=True)
    result = await ctx.session.execute(
        text(
            """
            select *
            from public.automation_rule_runs
            where tenant_id = :tenant_id and id = :run_id
            limit 1
            """
        ),
        {"tenant_id": ctx.tenant_id, "run_id": run_id},
    )
    row = result.mappings().one_or_none()
    return normalize_row(row) if row else None
