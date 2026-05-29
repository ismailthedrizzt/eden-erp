# ruff: noqa: E501

from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy import text

from app.core.errors import DomainError
from app.domains.automation.registry import RULE_STATUSES, TRIGGER_TYPES, validate_registry_payload
from app.domains.automation.schemas import (
    AutomationRuleCreateRequest,
    AutomationRuleListQuery,
    AutomationRuleUpdateRequest,
)
from app.domains.automation.service import (
    AutomationContext,
    assert_version,
    ensure_automation_tables,
    json_dumps,
    meta,
    next_run_for_schedule,
    normalize_row,
    record_automation_audit_best_effort,
    require_user_id,
    slugify_key,
)

RULE_JSON_FIELDS = {"trigger_config", "condition_config", "action_config"}
RULE_MUTABLE = {
    "rule_name",
    "description",
    "module_key",
    "trigger_type",
    "trigger_config",
    "condition_config",
    "action_config",
    "status",
    "priority",
    "run_mode",
    "max_runs_per_day",
    "cooldown_minutes",
    "next_run_at",
}


async def list_rules(ctx: AutomationContext, query: AutomationRuleListQuery) -> dict[str, Any]:
    await ensure_automation_tables(ctx.session, rules=True)
    where = ["tenant_id = :tenant_id", "coalesce(is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": ctx.tenant_id, "limit": query.page_size, "offset": (query.page - 1) * query.page_size}
    if query.module_key:
        where.append("module_key = :module_key")
        params["module_key"] = query.module_key
    if query.status:
        where.append("status = :status")
        params["status"] = query.status
    if query.trigger_type:
        where.append("trigger_type = :trigger_type")
        params["trigger_type"] = query.trigger_type
    if query.failed_only:
        where.append("(status = 'failed' or failure_count > 0)")
    where_sql = " and ".join(where)
    count_result = await ctx.session.execute(text(f"select count(*) from public.automation_rules where {where_sql}"), params)
    total = int(count_result.scalar_one() or 0)
    result = await ctx.session.execute(
        text(
            f"""
            select *
            from public.automation_rules
            where {where_sql}
            order by case status when 'failed' then 0 when 'active' then 1 when 'paused' then 2 else 3 end,
                     updated_at desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    return {"items": [normalize_row(row) for row in result.mappings()], "meta": meta(query.page, query.page_size, total)}


async def get_rule(ctx: AutomationContext, rule_id: str) -> dict[str, Any]:
    await ensure_automation_tables(ctx.session, rules=True)
    result = await ctx.session.execute(
        text(
            """
            select *
            from public.automation_rules
            where tenant_id = :tenant_id and id = :rule_id and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": ctx.tenant_id, "rule_id": rule_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Otomasyon kurali bulunamadi.", "AUTOMATION_RULE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return normalize_row(row)


async def create_rule(ctx: AutomationContext, request: AutomationRuleCreateRequest) -> dict[str, Any]:
    await ensure_automation_tables(ctx.session, rules=True)
    created_by = require_user_id(ctx)
    _assert_rule_payload(request.trigger_type, request.status, request.condition_config, request.action_config)
    rule_key = request.rule_key or f"{slugify_key(request.module_key)}_{slugify_key(request.rule_name)}"
    next_run_at = request.next_run_at or (next_run_for_schedule(request.trigger_config) if request.trigger_type in {"schedule", "condition"} else None)
    inserted = await ctx.session.execute(
        text(
            """
            insert into public.automation_rules (
              tenant_id, rule_key, rule_name, description, module_key, trigger_type,
              trigger_config, condition_config, action_config, status, priority, run_mode,
              max_runs_per_day, cooldown_minutes, next_run_at, created_by, updated_by
            )
            values (
              :tenant_id, :rule_key, :rule_name, :description, :module_key, :trigger_type,
              cast(:trigger_config as jsonb), cast(:condition_config as jsonb), cast(:action_config as jsonb),
              :status, :priority, :run_mode, :max_runs_per_day, :cooldown_minutes, :next_run_at, :created_by, :created_by
            )
            returning *
            """
        ),
        {
            "tenant_id": ctx.tenant_id,
            "rule_key": rule_key,
            "rule_name": request.rule_name,
            "description": request.description,
            "module_key": request.module_key,
            "trigger_type": request.trigger_type,
            "trigger_config": json_dumps(request.trigger_config),
            "condition_config": json_dumps(request.condition_config),
            "action_config": json_dumps(request.action_config),
            "status": request.status,
            "priority": request.priority,
            "run_mode": request.run_mode,
            "max_runs_per_day": request.max_runs_per_day,
            "cooldown_minutes": request.cooldown_minutes,
            "next_run_at": next_run_at,
            "created_by": created_by,
        },
    )
    rule = normalize_row(inserted.mappings().one())
    await record_automation_audit_best_effort(ctx, action_type="automation_rule_created", entity_type="automation_rule", entity_id=str(rule["id"]))
    return rule


async def update_rule(ctx: AutomationContext, rule_id: str, request: AutomationRuleUpdateRequest) -> dict[str, Any]:
    current = await get_rule(ctx, rule_id)
    assert_version(current, request.base_version)
    data = request.model_dump(exclude_unset=True, exclude={"base_version"})
    trigger_type = str(data.get("trigger_type") or current.get("trigger_type"))
    status_value = str(data.get("status") or current.get("status"))
    raw_condition_config = data.get("condition_config") if data.get("condition_config") is not None else current.get("condition_config")
    raw_action_config = data.get("action_config") if data.get("action_config") is not None else current.get("action_config")
    condition_config = raw_condition_config if isinstance(raw_condition_config, dict) else {}
    action_config = raw_action_config if isinstance(raw_action_config, dict) else {}
    _assert_rule_payload(trigger_type, status_value, condition_config, action_config)
    if "next_run_at" not in data and trigger_type in {"schedule", "condition"} and data.get("trigger_config"):
        data["next_run_at"] = next_run_for_schedule(data["trigger_config"])
    set_parts: list[str] = []
    params: dict[str, Any] = {"tenant_id": ctx.tenant_id, "rule_id": rule_id, "updated_by": ctx.request_context.user_id}
    for key, value in data.items():
        if key not in RULE_MUTABLE:
            continue
        if key in RULE_JSON_FIELDS:
            set_parts.append(f"{key} = cast(:{key} as jsonb)")
            params[key] = json_dumps(value)
        else:
            set_parts.append(f"{key} = :{key}")
            params[key] = value
    if not set_parts:
        return current
    set_parts.extend(["updated_by = :updated_by", "updated_at = now()", "version = version + 1"])
    result = await ctx.session.execute(
        text(
            f"""
            update public.automation_rules
            set {", ".join(set_parts)}
            where tenant_id = :tenant_id and id = :rule_id and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        params,
    )
    row = normalize_row(result.mappings().one())
    await record_automation_audit_best_effort(ctx, action_type="automation_rule_updated", entity_type="automation_rule", entity_id=rule_id)
    return row


async def delete_rule(ctx: AutomationContext, rule_id: str) -> dict[str, Any]:
    await get_rule(ctx, rule_id)
    await ctx.session.execute(
        text(
            """
            update public.automation_rules
            set is_deleted = true, updated_at = now(), updated_by = :user_id, version = version + 1
            where tenant_id = :tenant_id and id = :rule_id
            """
        ),
        {"tenant_id": ctx.tenant_id, "rule_id": rule_id, "user_id": ctx.request_context.user_id},
    )
    await record_automation_audit_best_effort(ctx, action_type="automation_rule_deleted", entity_type="automation_rule", entity_id=rule_id)
    return {"id": rule_id, "deleted": True}


async def set_rule_status(ctx: AutomationContext, rule_id: str, status_value: str) -> dict[str, Any]:
    if status_value not in {"active", "paused", "disabled"}:
        raise DomainError("Gecersiz kural durumu.", "AUTOMATION_RULE_STATUS_INVALID", status.HTTP_422_UNPROCESSABLE_ENTITY)
    current = await get_rule(ctx, rule_id)
    next_run_at = next_run_for_schedule(current.get("trigger_config") or {}) if status_value == "active" and current.get("trigger_type") in {"schedule", "condition"} else current.get("next_run_at")
    result = await ctx.session.execute(
        text(
            """
            update public.automation_rules
            set status = :status, next_run_at = :next_run_at, updated_at = now(), updated_by = :user_id, version = version + 1
            where tenant_id = :tenant_id and id = :rule_id and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        {"tenant_id": ctx.tenant_id, "rule_id": rule_id, "status": status_value, "next_run_at": next_run_at, "user_id": ctx.request_context.user_id},
    )
    row = normalize_row(result.mappings().one())
    await record_automation_audit_best_effort(ctx, action_type=f"automation_rule_{status_value}", entity_type="automation_rule", entity_id=rule_id)
    return row


def _assert_rule_payload(trigger_type: str, status_value: str, condition_config: dict[str, Any], action_config: dict[str, Any]) -> None:
    if trigger_type not in TRIGGER_TYPES:
        raise DomainError("Trigger tipi registry disinda.", "AUTOMATION_TRIGGER_INVALID", status.HTTP_422_UNPROCESSABLE_ENTITY)
    if status_value not in RULE_STATUSES:
        raise DomainError("Kural durumu gecersiz.", "AUTOMATION_RULE_STATUS_INVALID", status.HTTP_422_UNPROCESSABLE_ENTITY)
    errors = validate_registry_payload(trigger_type, condition_config, action_config)
    if errors:
        raise DomainError("Otomasyon kurali registry disi alan veya aksiyon iceriyor.", "AUTOMATION_REGISTRY_VIOLATION", status.HTTP_422_UNPROCESSABLE_ENTITY, {"errors": errors})
