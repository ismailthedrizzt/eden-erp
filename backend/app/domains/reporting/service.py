# ruff: noqa: E501

from __future__ import annotations

from dataclasses import dataclass, field
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
