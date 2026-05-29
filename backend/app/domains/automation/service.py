# ruff: noqa: E501

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.core.security import RequestContext, has_permission
from app.domains.operations.service import table_exists

AUTOMATION_MODULE_KEY = "automation"
RULE_TABLE = "public.automation_rules"
RUN_TABLE = "public.automation_rule_runs"
TEMPLATE_TABLE = "public.automation_rule_templates"
ACTION_RESULT_TABLE = "public.automation_action_results"


@dataclass
class AutomationContext:
    session: AsyncSession
    request_context: RequestContext
    tenant_id: str
    warnings: list[str] = field(default_factory=list)


def service_context(session: AsyncSession, request_context: RequestContext, tenant_id: str) -> AutomationContext:
    return AutomationContext(session=session, request_context=request_context, tenant_id=tenant_id)


def can(context: RequestContext, permission_key: str) -> bool:
    return has_permission(context, permission_key)


def require_permission(ctx: AutomationContext, permission_key: str) -> None:
    if not can(ctx.request_context, permission_key) and not can(ctx.request_context, "automation.admin") and not can(ctx.request_context, "system.admin"):
        raise DomainError("Bu otomasyon islemi icin yetkiniz bulunmuyor.", "AUTOMATION_PERMISSION_DENIED", status.HTTP_403_FORBIDDEN, {"permission": permission_key})


def require_user_id(ctx: AutomationContext) -> str:
    user_id = ctx.request_context.user_id
    if not user_id:
        raise DomainError("Bu islem icin kullanici baglami zorunludur.", "AUTOMATION_USER_REQUIRED", status.HTTP_401_UNAUTHORIZED)
    return str(user_id)


async def ensure_automation_tables(
    session: AsyncSession,
    *,
    rules: bool = False,
    runs: bool = False,
    templates: bool = False,
    action_results: bool = False,
) -> None:
    checks = [
        (rules, RULE_TABLE, "AUTOMATION_RULES_MISSING", "Otomasyon kural altyapisi hazir degil."),
        (runs, RUN_TABLE, "AUTOMATION_RUNS_MISSING", "Otomasyon run log altyapisi hazir degil."),
        (templates, TEMPLATE_TABLE, "AUTOMATION_TEMPLATES_MISSING", "Otomasyon sablon altyapisi hazir degil."),
        (action_results, ACTION_RESULT_TABLE, "AUTOMATION_ACTION_RESULTS_MISSING", "Otomasyon aksiyon sonucu altyapisi hazir degil."),
    ]
    for enabled, table, code, message in checks:
        if enabled and not await table_exists(session, table):
            raise DomainError(message, code, status.HTTP_409_CONFLICT, {"module_key": AUTOMATION_MODULE_KEY})


def json_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=False, default=str)


def json_list_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else [], ensure_ascii=False, default=str)


def normalize_row(row: Any) -> dict[str, Any]:
    return {key: normalize_value(value) for key, value in dict(row).items()}


def normalize_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (date, datetime)):
        return value
    return value


def meta(page: int, page_size: int, total: int) -> dict[str, int]:
    total_pages = max(1, (total + page_size - 1) // page_size)
    return {"page": page, "pageSize": page_size, "total": total, "totalPages": total_pages}


def slugify_key(value: str) -> str:
    lowered = value.strip().lower()
    normalized = re.sub(r"[^a-z0-9]+", "_", lowered)
    normalized = re.sub(r"_+", "_", normalized).strip("_")
    return normalized or "automation_rule"


def assert_version(current: dict[str, Any], base_version: int | None) -> None:
    if base_version is None:
        return
    if int(current.get("version") or 0) != int(base_version):
        raise DomainError("Kayit baska bir islem tarafindan guncellendi. Lutfen yenileyin.", "VERSION_CONFLICT", status.HTTP_409_CONFLICT)


def next_run_for_schedule(trigger_config: dict[str, Any], from_time: datetime | None = None) -> datetime | None:
    frequency = str(trigger_config.get("frequency") or trigger_config.get("schedule_rule") or "").lower()
    base = from_time or datetime.now(UTC)
    if frequency == "hourly":
        return base + timedelta(hours=1)
    if frequency == "daily":
        return base + timedelta(days=1)
    if frequency == "weekly":
        return base + timedelta(days=7)
    if frequency == "monthly":
        return base + timedelta(days=30)
    return None


def max_actions_per_run() -> int:
    return 100


async def record_automation_audit_best_effort(
    ctx: AutomationContext,
    *,
    action_type: str,
    entity_type: str,
    entity_id: str,
    summary: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    if not await table_exists(ctx.session, "public.audit_logs"):
        return
    try:
        async with ctx.session.begin_nested():
            await ctx.session.execute(
                text(
                    """
                    insert into public.audit_logs (
                      tenant_id, module_key, entity_type, entity_id, action_type,
                      action_key, user_id, summary, result_status, severity, metadata_json
                    )
                    values (
                      :tenant_id, 'automation', :entity_type, :entity_id, :action_type,
                      :action_type, :user_id, :summary, 'success', 'info', cast(:metadata_json as jsonb)
                    )
                    """
                ),
                {
                    "tenant_id": ctx.tenant_id,
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "action_type": action_type,
                    "user_id": ctx.request_context.user_id,
                    "summary": summary or action_type,
                    "metadata_json": json_dumps(metadata or {}),
                },
            )
    except Exception:
        return


async def create_notification_best_effort(
    ctx: AutomationContext,
    *,
    user_id: str | None,
    title: str,
    message: str,
    notification_type: str,
    priority: str = "normal",
    severity: str = "warning",
    target_page: str = "/app",
    related_entity_type: str | None = None,
    related_entity_id: str | None = None,
) -> dict[str, Any] | None:
    if not user_id or not await table_exists(ctx.session, "public.notifications"):
        return None
    safe_priority = priority if priority in {"low", "normal", "high", "urgent"} else "normal"
    safe_severity = severity if severity in {"info", "success", "warning", "error", "critical"} else "warning"
    result = await ctx.session.execute(
        text(
            """
            insert into public.notifications (
              id, tenant_id, user_id, module_key, notification_type, title, message,
              severity, priority, action_required, action_key, action_label, target_page,
              related_entity_type, related_entity_id, related_record_label,
              delivered_channels, delivery_status, metadata_json
            )
            values (
              :id, :tenant_id, :user_id, 'automation', :notification_type, :title, :message,
              :severity, :priority, true, :action_key, 'Ac', :target_page,
              :related_entity_type, :related_entity_id, :related_record_label,
              '["in_app"]'::jsonb, 'delivered', cast(:metadata_json as jsonb)
            )
            returning *
            """
        ),
        {
            "id": str(uuid4()),
            "tenant_id": ctx.tenant_id,
            "user_id": user_id,
            "notification_type": notification_type,
            "title": title,
            "message": message,
            "severity": safe_severity,
            "priority": safe_priority,
            "action_key": f"automation.{notification_type}",
            "target_page": target_page,
            "related_entity_type": related_entity_type,
            "related_entity_id": related_entity_id,
            "related_record_label": title,
            "metadata_json": json_dumps({"source": "automation"}),
        },
    )
    return normalize_row(result.mappings().one())
