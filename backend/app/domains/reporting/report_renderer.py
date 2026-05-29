# ruff: noqa: E501

from __future__ import annotations

from typing import Any

from fastapi import status

from app.core.errors import DomainError
from app.domains.reporting.custom_reports import get_custom_report_by_key
from app.domains.reporting.report_permissions import assert_report_view_allowed
from app.domains.reporting.reports import REPORT_DEFINITIONS, query_report
from app.domains.reporting.saved_views import get_saved_view
from app.domains.reporting.schemas import ReportingFilter, ReportResult
from app.domains.reporting.service import ReportingQueryContext


async def render_report(
    ctx: ReportingQueryContext,
    report_key: str,
    filters: ReportingFilter | None = None,
    *,
    saved_view_id: str | None = None,
    columns: list[str] | None = None,
) -> ReportResult:
    base_report_key = report_key
    selected_columns = columns or []
    effective_filters = filters or ctx.filters
    custom_report = None
    if report_key not in REPORT_DEFINITIONS:
        custom_report = await get_custom_report_by_key(ctx, report_key)
        if not custom_report:
            raise DomainError("Rapor tanimi bulunamadi.", "REPORT_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        if custom_report["source_type"] == "saved_view":
            saved_view_id = str(custom_report["source_key"])
        else:
            base_report_key = str(custom_report["source_key"])
        if not selected_columns:
            selected_columns = [str(item.get("key")) for item in custom_report.get("columns_json") or [] if item.get("key")]
        if custom_report.get("default_filters_json"):
            effective_filters = merge_filters(effective_filters, custom_report["default_filters_json"])

    if saved_view_id:
        view = await get_saved_view(ctx, saved_view_id)
        if not view.get("report_key"):
            raise DomainError("Kayitli gorunum rapor anahtari icermiyor.", "SAVED_VIEW_REPORT_KEY_MISSING", status.HTTP_422_UNPROCESSABLE_ENTITY)
        base_report_key = str(view["report_key"])
        effective_filters = merge_filters(effective_filters, view.get("filters_json") or {})
        if not selected_columns:
            selected_columns = [str(item.get("key")) for item in view.get("columns_json") or [] if item.get("key")]

    assert_report_view_allowed(ctx, base_report_key, required_permissions=custom_report.get("required_permissions") if custom_report else None)
    result = await query_report(ctx, base_report_key, effective_filters)
    if selected_columns:
        allowed = set(selected_columns)
        result.columns = [column for column in result.columns if column["key"] in allowed]
        result.data = [{key: value for key, value in row.items() if key in allowed} for row in result.data]
    return result


def merge_filters(base: ReportingFilter, values: dict[str, Any]) -> ReportingFilter:
    data = base.model_dump()
    for key, value in values.items():
        if value is not None and key in data:
            data[key] = value
    return ReportingFilter(**data)
