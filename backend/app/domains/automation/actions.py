# ruff: noqa: E501

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

from sqlalchemy import text

from app.domains.automation.conditions import ConditionEvaluation
from app.domains.automation.registry import ACTION_TEMPLATES, CONDITION_ENTITIES, normalize_actions
from app.domains.automation.service import (
    ACTION_RESULT_TABLE,
    AutomationContext,
    create_notification_best_effort,
    json_dumps,
    max_actions_per_run,
    normalize_row,
)
from app.domains.operations.service import table_exists


@dataclass
class ActionExecutionSummary:
    actions_created_count: int = 0
    skipped_count: int = 0
    failure_count: int = 0
    previews: list[dict[str, Any]] | None = None


async def execute_actions(
    ctx: AutomationContext,
    *,
    rule: dict[str, Any],
    run_id: str,
    evaluation: ConditionEvaluation,
    simulate: bool = False,
) -> ActionExecutionSummary:
    actions = normalize_actions(rule.get("action_config") or {})
    records = evaluation.records or [{"entity_type": "automation_rule", "id": rule.get("id"), "title": rule.get("rule_name")}]
    summary = ActionExecutionSummary(previews=[] if simulate else None)
    limit = max_actions_per_run()
    produced = 0
    for record in records:
        for action in actions:
            if produced >= limit:
                summary.skipped_count += 1
                continue
            action_type = str(action.get("action_type") or "")
            template = ACTION_TEMPLATES.get(action_type)
            if not template:
                summary.failure_count += 1
                continue
            preview = _build_action_preview(rule, record, action, template)
            if simulate:
                summary.previews = summary.previews or []
                summary.previews.append(preview)
                produced += 1
                continue
            status, result, error = await _execute_single_action(ctx, rule, record, action, template, preview)
            await _record_action_result(ctx, run_id=run_id, rule_id=str(rule["id"]), action_type=action_type, status=status, record=record, result=result, error=error)
            if status == "success":
                summary.actions_created_count += 1
            elif status == "skipped":
                summary.skipped_count += 1
            else:
                summary.failure_count += 1
            produced += 1
    return summary


def _build_action_preview(rule: dict[str, Any], record: dict[str, Any], action: dict[str, Any], template: dict[str, Any]) -> dict[str, Any]:
    entity_type = str(record.get("entity_type") or "automation_rule")
    entity_definition = CONDITION_ENTITIES.get(entity_type)
    default_target = entity_definition.default_target_page if entity_definition else "/app/sistem/otomasyonlar"
    target_page = str(action.get("target_page") or default_target)
    title = str(action.get("title") or f"{rule.get('rule_name')} otomasyon aksiyonu")
    return {
        "action_type": action["action_type"],
        "label": template["label"],
        "side_effect": template["side_effect"],
        "target_entity_type": entity_type,
        "target_entity_id": str(record.get("id") or ""),
        "target_user_id": _target_user_id(record, action, rule),
        "title": title,
        "message": str(action.get("message") or f"{rule.get('rule_name')} kuralindan otomatik aksiyon olusacak."),
        "target_page": target_page,
        "sensitive_masked": True,
    }


async def _execute_single_action(
    ctx: AutomationContext,
    rule: dict[str, Any],
    record: dict[str, Any],
    action: dict[str, Any],
    template: dict[str, Any],
    preview: dict[str, Any],
) -> tuple[str, dict[str, Any], str | None]:
    try:
        async with ctx.session.begin_nested():
            return await _execute_single_action_inner(ctx, rule, record, action, template, preview)
    except Exception as exc:  # pragma: no cover - optional integration guard
        return "failed", {"preview": preview}, str(exc)[:500]


async def _execute_single_action_inner(
    ctx: AutomationContext,
    rule: dict[str, Any],
    record: dict[str, Any],
    action: dict[str, Any],
    template: dict[str, Any],
    preview: dict[str, Any],
) -> tuple[str, dict[str, Any], str | None]:
    side_effect = str(template.get("side_effect") or "")
    if side_effect in {"notification", "warning", "email"}:
        notification = await create_notification_best_effort(
            ctx,
            user_id=preview.get("target_user_id"),
            title=str(preview["title"]),
            message=str(preview["message"]),
            notification_type=str(action.get("notification_type") or action["action_type"]),
            priority=str(action.get("priority") or ("high" if side_effect == "warning" else "normal")),
            severity=str(action.get("severity") or "warning"),
            target_page=str(preview["target_page"]),
            related_entity_type=preview.get("target_entity_type"),
            related_entity_id=preview.get("target_entity_id"),
        )
        if notification:
            return "success", {"notification_id": notification.get("id"), "preview": preview}, None
        return "skipped", {"reason": "notification_infra_or_target_missing", "preview": preview}, None
    if side_effect in {"task", "process"}:
        task = await _create_project_task_best_effort(ctx, rule, record, action, preview)
        if task:
            return "success", {"task_id": task.get("id"), "preview": preview}, None
        return "skipped", {"reason": "project_task_infra_missing", "preview": preview}, None
    if side_effect == "reminder":
        reminder = await _create_reminder_best_effort(ctx, record, action, preview)
        if reminder:
            return "success", {"reminder_id": reminder.get("id"), "preview": preview}, None
        return "skipped", {"reason": "reminder_infra_or_target_missing", "preview": preview}, None
    return "success", {"queued": True, "preview": preview}, None


async def _create_project_task_best_effort(ctx: AutomationContext, rule: dict[str, Any], record: dict[str, Any], action: dict[str, Any], preview: dict[str, Any]) -> dict[str, Any] | None:
    if not await table_exists(ctx.session, "public.project_tasks"):
        return None
    result = await ctx.session.execute(text("select count(*) + 1 from public.project_tasks where tenant_id = :tenant_id"), {"tenant_id": ctx.tenant_id})
    issue_key = f"AUT-{int(result.scalar_one() or 1):06d}"
    inserted = await ctx.session.execute(
        text(
            """
            insert into public.project_tasks (
              tenant_id, company_id, issue_key, title, description, issue_type, status,
              priority, assignee_user_id, reporter_user_id, due_date,
              related_module, related_entity_type, related_entity_id, labels, metadata_json,
              created_by, updated_by
            )
            values (
              :tenant_id, :company_id, :issue_key, :title, :description, 'task', 'todo',
              :priority, :assignee_user_id, :reporter_user_id, :due_date,
              'automation', :related_entity_type, :related_entity_id, :labels, cast(:metadata_json as jsonb),
              :user_id, :user_id
            )
            returning *
            """
        ),
        {
            "tenant_id": ctx.tenant_id,
            "company_id": record.get("company_id"),
            "issue_key": issue_key,
            "title": preview["title"],
            "description": preview["message"],
            "priority": action.get("priority") or rule.get("priority") or "normal",
            "assignee_user_id": preview.get("target_user_id"),
            "reporter_user_id": ctx.request_context.user_id,
            "due_date": action.get("due_date") or date.today() + timedelta(days=int(action.get("due_in_days") or 1)),
            "related_entity_type": preview.get("target_entity_type"),
            "related_entity_id": preview.get("target_entity_id"),
            "labels": ["automation", str(rule.get("module_key") or "system")],
            "metadata_json": json_dumps({"source": "automation", "rule_id": str(rule["id"]), "action_type": action["action_type"]}),
            "user_id": ctx.request_context.user_id,
        },
    )
    return normalize_row(inserted.mappings().one())


async def _create_reminder_best_effort(ctx: AutomationContext, record: dict[str, Any], action: dict[str, Any], preview: dict[str, Any]) -> dict[str, Any] | None:
    if not preview.get("target_user_id") or not await table_exists(ctx.session, "public.reminders"):
        return None
    inserted = await ctx.session.execute(
        text(
            """
            insert into public.reminders (
              tenant_id, user_id, target_user_id, company_id, module_key, reminder_type,
              title, message, related_entity_type, related_entity_id, remind_at, channels, metadata_json
            )
            values (
              :tenant_id, :user_id, :target_user_id, :company_id, 'automation', :reminder_type,
              :title, :message, :related_entity_type, :related_entity_id, now(), cast(:channels as text[]), cast(:metadata_json as jsonb)
            )
            returning *
            """
        ),
        {
            "tenant_id": ctx.tenant_id,
            "user_id": ctx.request_context.user_id,
            "target_user_id": preview["target_user_id"],
            "company_id": record.get("company_id"),
            "reminder_type": action.get("reminder_type") or action["action_type"],
            "title": preview["title"],
            "message": preview["message"],
            "related_entity_type": preview.get("target_entity_type"),
            "related_entity_id": preview.get("target_entity_id"),
            "channels": ["in_app"],
            "metadata_json": json_dumps({"source": "automation"}),
        },
    )
    return normalize_row(inserted.mappings().one())


async def _record_action_result(
    ctx: AutomationContext,
    *,
    run_id: str,
    rule_id: str,
    action_type: str,
    status: str,
    record: dict[str, Any],
    result: dict[str, Any],
    error: str | None,
) -> None:
    if not await table_exists(ctx.session, ACTION_RESULT_TABLE):
        return
    await ctx.session.execute(
        text(
            """
            insert into public.automation_action_results (
              tenant_id, run_id, rule_id, action_type, target_entity_type,
              target_entity_id, status, result_json, error_message
            )
            values (
              :tenant_id, :run_id, :rule_id, :action_type, :target_entity_type,
              :target_entity_id, :status, cast(:result_json as jsonb), :error_message
            )
            """
        ),
        {
            "tenant_id": ctx.tenant_id,
            "run_id": run_id,
            "rule_id": rule_id,
            "action_type": action_type,
            "target_entity_type": record.get("entity_type"),
            "target_entity_id": str(record.get("id") or ""),
            "status": status,
            "result_json": json_dumps(result),
            "error_message": error,
        },
    )


def _target_user_id(record: dict[str, Any], action: dict[str, Any], rule: dict[str, Any]) -> str | None:
    return (
        action.get("target_user_id")
        or record.get("assigned_owner_user_id")
        or record.get("assignee_user_id")
        or record.get("assigned_user_id")
        or rule.get("created_by")
    )
