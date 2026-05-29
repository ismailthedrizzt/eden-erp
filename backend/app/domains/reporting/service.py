# ruff: noqa: E501

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.core.security import RequestContext, has_permission
from app.domains.operations.service import table_exists
from app.domains.reporting.schemas import KpiCard, ReportingFilter

REPORTING_MODULE_KEY = "reporting"
SAVED_VIEW_TABLE = "public.reporting_saved_views"
CUSTOM_REPORT_TABLE = "public.reporting_custom_reports"
SCHEDULED_REPORT_TABLE = "public.reporting_scheduled_reports"
EXPORT_JOB_TABLE = "public.reporting_export_jobs"
RUN_LOG_TABLE = "public.reporting_report_run_logs"
DASHBOARD_PREFERENCES_TABLE = "public.reporting_dashboard_preferences"


@dataclass
class ReportingQueryContext:
    session: AsyncSession
    request_context: RequestContext
    tenant_id: str
    filters: ReportingFilter
    warnings: list[str] = field(default_factory=list)


def can(context: RequestContext, permission_key: str) -> bool:
    return has_permission(context, permission_key)


def service_context(
    session: AsyncSession, request_context: RequestContext, tenant_id: str, filters: ReportingFilter
) -> ReportingQueryContext:
    return ReportingQueryContext(
        session=session, request_context=request_context, tenant_id=tenant_id, filters=filters
    )


def assert_company_scope(context: RequestContext, company_id: str | None) -> None:
    if not company_id or not context.company_scope_ids:
        return
    if company_id not in {str(item) for item in context.company_scope_ids}:
        raise DomainError(
            "Bu sirket rapor erisim kapsaminiz disinda.",
            "REPORT_COMPANY_SCOPE_DENIED",
            status.HTTP_403_FORBIDDEN,
        )


def base_where(ctx: ReportingQueryContext, alias: str = "") -> tuple[list[str], dict[str, Any]]:
    prefix = f"{alias}." if alias else ""
    where = [f"{prefix}tenant_id = :tenant_id", f"coalesce({prefix}is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": ctx.tenant_id}
    if ctx.filters.company_id:
        assert_company_scope(ctx.request_context, ctx.filters.company_id)
        where.append(f"{prefix}company_id = :company_id")
        params["company_id"] = ctx.filters.company_id
    elif ctx.request_context.company_scope_ids:
        where.append(f"{prefix}company_id = any(cast(:company_scope_ids as uuid[]))")
        params["company_scope_ids"] = ctx.request_context.company_scope_ids
    return where, params


def date_filter(ctx: ReportingQueryContext, column: str, params: dict[str, Any]) -> list[str]:
    parts: list[str] = []
    if ctx.filters.date_from:
        parts.append(f"{column} >= :date_from")
        params["date_from"] = ctx.filters.date_from
    if ctx.filters.date_to:
        parts.append(f"{column} <= :date_to")
        params["date_to"] = ctx.filters.date_to
    return parts


async def safe_scalar(
    ctx: ReportingQueryContext,
    table: str,
    sql: str,
    params: dict[str, Any] | None = None,
    *,
    label: str | None = None,
) -> int | float:
    if not await table_exists(ctx.session, table):
        if label:
            ctx.warnings.append(f"{label} verisi hazir degil.")
        return 0
    try:
        result = await ctx.session.execute(text(sql), params or {})
        value = result.scalar_one_or_none()
        if value is None:
            return 0
        if isinstance(value, Decimal):
            return float(value)
        if isinstance(value, float):
            return value
        return int(value)
    except Exception:
        await ctx.session.rollback()
        if label:
            ctx.warnings.append(f"{label} ozeti su anda hesaplanamadi.")
        return 0


async def safe_rows(
    ctx: ReportingQueryContext,
    table: str,
    sql: str,
    params: dict[str, Any] | None = None,
    *,
    label: str | None = None,
) -> list[dict[str, Any]]:
    if not await table_exists(ctx.session, table):
        if label:
            ctx.warnings.append(f"{label} verisi hazir degil.")
        return []
    try:
        result = await ctx.session.execute(text(sql), params or {})
        return [dict(row) for row in result.mappings()]
    except Exception:
        await ctx.session.rollback()
        if label:
            ctx.warnings.append(f"{label} verisi su anda getirilemedi.")
        return []


def card(
    *,
    key: str,
    title: str,
    value: int | float | str | None,
    module_key: str,
    permission_visible: bool,
    description: str,
    target_page: str | None = None,
    status_value: str = "info",
    warnings: list[str] | None = None,
) -> KpiCard:
    return KpiCard(
        key=key,
        title=title,
        value=value if permission_visible else None,
        module_key=module_key,
        visible=permission_visible,
        description=description if permission_visible else "Bu KPI icin yetkiniz bulunmuyor.",
        target_page=target_page,
        status=status_value,  # type: ignore[arg-type]
        warnings=warnings or [],
    )


def status_from_count(
    value: int | float, *, warning_at: int = 1, critical_at: int | None = None
) -> str:
    if critical_at is not None and value >= critical_at:
        return "critical"
    if value >= warning_at:
        return "warning"
    return "normal"


def meta(page: int, page_size: int, total: int) -> dict[str, int]:
    total_pages = max(1, (total + page_size - 1) // page_size)
    return {"page": page, "pageSize": page_size, "total": total, "totalPages": total_pages}


def json_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=False, default=str)


def json_list_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else [], ensure_ascii=False, default=str)


def normalize_row(row: Any) -> dict[str, Any]:
    return {key: normalize_value(value) for key, value in dict(row).items()}


def normalize_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return value
    if isinstance(value, (date, datetime)):
        return value
    return value


async def ensure_advanced_reporting_tables(
    session: AsyncSession,
    *,
    saved_views: bool = False,
    custom_reports: bool = False,
    scheduled_reports: bool = False,
    export_jobs: bool = False,
    run_logs: bool = False,
    dashboard_preferences: bool = False,
) -> None:
    checks = [
        (saved_views, SAVED_VIEW_TABLE, "REPORTING_SAVED_VIEWS_MISSING", "Kayitli gorunum altyapisi hazir degil."),
        (custom_reports, CUSTOM_REPORT_TABLE, "REPORTING_CUSTOM_REPORTS_MISSING", "Ozel rapor altyapisi hazir degil."),
        (scheduled_reports, SCHEDULED_REPORT_TABLE, "REPORTING_SCHEDULED_REPORTS_MISSING", "Zamanlanmis rapor altyapisi hazir degil."),
        (export_jobs, EXPORT_JOB_TABLE, "REPORTING_EXPORT_JOBS_MISSING", "Rapor export job altyapisi hazir degil."),
        (run_logs, RUN_LOG_TABLE, "REPORTING_RUN_LOGS_MISSING", "Rapor calisma log altyapisi hazir degil."),
        (dashboard_preferences, DASHBOARD_PREFERENCES_TABLE, "REPORTING_DASHBOARD_PREFERENCES_MISSING", "Dashboard tercih altyapisi hazir degil."),
    ]
    for enabled, table, code, message in checks:
        if enabled and not await table_exists(session, table):
            raise DomainError(message, code, status.HTTP_409_CONFLICT, {"module_key": REPORTING_MODULE_KEY})


def assert_version(current: dict[str, Any], base_version: int | None) -> None:
    if base_version is None:
        return
    if int(current.get("version") or 0) != int(base_version):
        raise DomainError("Kayit baska bir islem tarafindan guncellendi. Lutfen yenileyin.", "VERSION_CONFLICT", status.HTTP_409_CONFLICT)


def require_user_id(ctx: ReportingQueryContext) -> str:
    user_id = ctx.request_context.user_id
    if not user_id:
        raise DomainError("Bu islem icin kullanici baglami zorunludur.", "REPORTING_USER_REQUIRED", status.HTTP_401_UNAUTHORIZED)
    return str(user_id)


def require_permission(ctx: ReportingQueryContext, permission_key: str) -> None:
    if not can(ctx.request_context, permission_key) and not can(ctx.request_context, "reporting.admin"):
        raise DomainError("Bu raporlama islemi icin yetkiniz bulunmuyor.", "REPORT_PERMISSION_DENIED", status.HTTP_403_FORBIDDEN)


def max_export_rows() -> int:
    return 5000


def export_expiry() -> datetime:
    return datetime.now(UTC) + timedelta(days=7)


def next_run_for_rule(schedule_rule: str, from_time: datetime | None = None) -> datetime:
    base = from_time or datetime.now(UTC)
    if schedule_rule == "daily":
        return base + timedelta(days=1)
    if schedule_rule == "monthly":
        return base + timedelta(days=30)
    return base + timedelta(days=7)


async def record_reporting_audit_best_effort(
    ctx: ReportingQueryContext,
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
        await ctx.session.execute(
            text(
                """
                insert into public.audit_logs (
                  tenant_id, module_key, entity_type, entity_id, action_type,
                  action_key, user_id, summary, result_status, severity, metadata_json
                )
                values (
                  :tenant_id, 'reporting', :entity_type, :entity_id, :action_type,
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
        await ctx.session.rollback()


async def create_reporting_notification_best_effort(
    ctx: ReportingQueryContext,
    *,
    user_id: str | None,
    notification_type: str,
    title: str,
    message: str,
    related_entity_type: str,
    related_entity_id: str,
    priority: str = "normal",
    severity: str = "info",
) -> None:
    if not user_id or not await table_exists(ctx.session, "public.notifications"):
        return
    try:
        from app.domains.notifications.notifications import create_notification
        from app.domains.notifications.schemas import NotificationCreateRequest

        await create_notification(
            ctx.session,
            {"tenant_id": ctx.tenant_id, "user_id": ctx.request_context.user_id, "company_scope_ids": ctx.request_context.company_scope_ids},
            NotificationCreateRequest(
                user_id=user_id,
                module_key="reporting",
                notification_type=notification_type,
                title=title,
                message=message,
                severity=severity,  # type: ignore[arg-type]
                priority=priority,  # type: ignore[arg-type]
                action_required=True,
                action_key=f"reporting.{notification_type}",
                action_label="Ac",
                target_page="/app/raporlama/zamanlanmis-raporlar",
                related_entity_type=related_entity_type,
                related_entity_id=related_entity_id,
                related_record_label=title,
            ),
            queue_email=False,
        )
    except Exception:
        await ctx.session.rollback()
