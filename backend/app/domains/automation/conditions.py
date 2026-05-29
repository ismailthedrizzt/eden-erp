# ruff: noqa: E501

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from fastapi import status
from sqlalchemy import text

from app.core.errors import DomainError
from app.domains.automation.registry import CONDITION_ENTITIES, CONDITION_OPERATORS, ConditionEntity
from app.domains.automation.service import AutomationContext, can, normalize_row
from app.domains.operations.service import table_exists


@dataclass
class ConditionEvaluation:
    matched_count: int
    records: list[dict[str, Any]] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    status: str = "condition_met"


async def evaluate_rule_conditions(ctx: AutomationContext, rule: dict[str, Any], *, preview_limit: int = 50) -> ConditionEvaluation:
    config = rule.get("condition_config") or {}
    if not isinstance(config, dict) or not config:
        return ConditionEvaluation(matched_count=1, records=[{"entity_type": "automation_rule", "id": rule.get("id"), "title": rule.get("rule_name")}])

    entity_key = str(config.get("entity") or "")
    operator = str(config.get("operator") or "")
    field_name = str(config.get("field") or "")
    if operator not in CONDITION_OPERATORS:
        raise DomainError("Condition operator registry disinda.", "AUTOMATION_CONDITION_OPERATOR_INVALID", status.HTTP_422_UNPROCESSABLE_ENTITY)
    if operator == "permission_available":
        permission_key = str(config.get("permission") or config.get("value") or "")
        return ConditionEvaluation(matched_count=1 if can(ctx.request_context, permission_key) else 0)
    if operator == "module_ready":
        module_entity = CONDITION_ENTITIES.get(entity_key)
        if not module_entity:
            raise DomainError("Condition entity registry disinda.", "AUTOMATION_CONDITION_ENTITY_INVALID", status.HTTP_422_UNPROCESSABLE_ENTITY)
        ready = await table_exists(ctx.session, module_entity.table)
        return ConditionEvaluation(matched_count=1 if ready else 0, warnings=[] if ready else [f"{module_entity.label} altyapisi hazir degil."])
    if operator == "record_scope_valid":
        return ConditionEvaluation(matched_count=1)

    definition = CONDITION_ENTITIES.get(entity_key)
    if not definition:
        raise DomainError("Condition entity registry disinda.", "AUTOMATION_CONDITION_ENTITY_INVALID", status.HTTP_422_UNPROCESSABLE_ENTITY)
    if field_name not in definition.fields:
        raise DomainError("Condition field registry disinda.", "AUTOMATION_CONDITION_FIELD_INVALID", status.HTTP_422_UNPROCESSABLE_ENTITY)
    if not await table_exists(ctx.session, definition.table):
        return ConditionEvaluation(matched_count=0, warnings=[f"{definition.label} tablosu hazir degil."], status="readiness_missing")
    if not _permission_allows(ctx, definition.required_permission):
        return ConditionEvaluation(matched_count=0, warnings=[f"{definition.required_permission} yetkisi olmadan kosul degerlendirilemedi."], status="permission_denied")

    where, params = _build_where(ctx, definition, config)
    select_field = field_name
    limit = min(max(preview_limit, 1), 100)
    count_result = await ctx.session.execute(
        text(f"select count(*) from {definition.table} where {' and '.join(where)}"),
        params,
    )
    matched_count = int(count_result.scalar_one() or 0)
    params["limit"] = limit
    row_result = await ctx.session.execute(
        text(
            f"""
            select id, :entity_key as entity_type, {select_field} as matched_value,
                   {", ".join(_optional_selects(definition))}
            from {definition.table}
            where {" and ".join(where)}
            order by id desc
            limit :limit
            """
        ),
        {**params, "entity_key": entity_key},
    )
    records = [normalize_row(row) for row in row_result.mappings()]
    return ConditionEvaluation(
        matched_count=matched_count,
        records=records,
        status="condition_met" if matched_count > 0 else "condition_not_met",
    )


def _permission_allows(ctx: AutomationContext, permission_key: str) -> bool:
    return can(ctx.request_context, permission_key) or can(ctx.request_context, "automation.admin") or can(ctx.request_context, "system.admin")


def _build_where(ctx: AutomationContext, definition: ConditionEntity, config: dict[str, Any]) -> tuple[list[str], dict[str, Any]]:
    field_name = str(config.get("field"))
    operator = str(config.get("operator"))
    value = config.get("value")
    params: dict[str, Any] = {"tenant_id": ctx.tenant_id}
    where = ["tenant_id = :tenant_id"]
    if definition.company_scoped and ctx.request_context.company_scope_ids:
        where.append("company_id = any(cast(:company_scope_ids as uuid[]))")
        params["company_scope_ids"] = ctx.request_context.company_scope_ids
    condition_sql = _operator_sql(field_name, operator, value, params)
    if condition_sql:
        where.append(condition_sql)
    for filter_field, filter_value in (config.get("filters") or {}).items():
        if str(filter_field) not in definition.fields:
            continue
        param_key = f"filter_{filter_field}"
        if isinstance(filter_value, list):
            where.append(f"{filter_field} = any(cast(:{param_key} as text[]))")
            params[param_key] = [str(item) for item in filter_value]
        else:
            where.append(f"{filter_field} = :{param_key}")
            params[param_key] = filter_value
    return where, params


def _operator_sql(field_name: str, operator: str, value: Any, params: dict[str, Any]) -> str:
    if operator in {"field_equals", "status_is"}:
        params["value"] = value
        return f"{field_name} = :value"
    if operator == "field_not_equals":
        params["value"] = value
        return f"coalesce({field_name}::text, '') <> coalesce(:value::text, '')"
    if operator == "field_in":
        params["value_list"] = [str(item) for item in (value if isinstance(value, list) else [value])]
        return f"{field_name} = any(cast(:value_list as text[]))"
    if operator == "field_not_in":
        params["value_list"] = [str(item) for item in (value if isinstance(value, list) else [value])]
        return f"not ({field_name} = any(cast(:value_list as text[])))"
    if operator == "field_is_empty":
        return f"({field_name} is null or {field_name}::text = '')"
    if operator == "field_is_not_empty":
        return f"({field_name} is not null and {field_name}::text <> '')"
    if operator == "date_before":
        return _date_compare_sql(field_name, value, "<", params)
    if operator == "date_after":
        return _date_compare_sql(field_name, value, ">", params)
    if operator == "date_within_days":
        params["days"] = int(value or 0)
        return f"{field_name}::date between current_date and current_date + (:days * interval '1 day')"
    if operator == "number_greater_than":
        params["number_value"] = value
        return f"{field_name}::numeric > :number_value"
    if operator == "number_less_than":
        params["number_value"] = value
        return f"{field_name}::numeric < :number_value"
    if operator == "count_greater_than":
        return "true"
    return "true"


def _date_compare_sql(field_name: str, value: Any, sign: str, params: dict[str, Any]) -> str:
    if value == "today":
        return f"{field_name}::date {sign} current_date"
    if isinstance(value, str) and value.startswith("today-"):
        days = int(value.split("-", 1)[1] or 0)
        return f"{field_name}::date {sign} current_date - interval '{days} day'"
    if isinstance(value, str) and value.startswith("today+"):
        days = int(value.split("+", 1)[1] or 0)
        return f"{field_name}::date {sign} current_date + interval '{days} day'"
    params["date_value"] = value
    return f"{field_name}::date {sign} cast(:date_value as date)"


def _optional_selects(definition: ConditionEntity) -> list[str]:
    selects = []
    if "company_id" in definition.fields:
        selects.append("company_id")
    if "assigned_owner_user_id" in definition.fields:
        selects.append("assigned_owner_user_id")
    if "assignee_user_id" in definition.fields:
        selects.append("assignee_user_id")
    if "assigned_user_id" in definition.fields:
        selects.append("assigned_user_id")
    if "status" in definition.fields:
        selects.append("status")
    if not selects:
        selects.append("null::text as status")
    return selects
