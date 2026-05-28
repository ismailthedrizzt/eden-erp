# ruff: noqa: E501

from __future__ import annotations

from fastapi import status

from app.core.errors import DomainError
from app.domains.reporting.reports import get_report_definition
from app.domains.reporting.schemas import ExportRequest
from app.domains.reporting.service import ReportingQueryContext, can


async def prepare_report_export(ctx: ReportingQueryContext, report_key: str, request: ExportRequest) -> dict[str, object]:
    if not can(ctx.request_context, "reporting.export") and not can(ctx.request_context, "reporting.admin"):
        raise DomainError("Rapor export icin yetkiniz bulunmuyor.", "REPORT_EXPORT_PERMISSION_DENIED", status.HTTP_403_FORBIDDEN)
    definition = get_report_definition(ctx, report_key)
    if not request.filters.date_from or not request.filters.date_to:
        raise DomainError("Export icin tarih araligi zorunludur.", "REPORT_EXPORT_DATE_RANGE_REQUIRED", status.HTTP_422_UNPROCESSABLE_ENTITY)
    return {
        "report_key": definition.report_key,
        "format": request.format,
        "status": "prepared",
        "max_rows": 5000,
        "message": "CSV export hazirligi tamamlandi. Dosya uretimi background worker fazinda etkinlesecek.",
    }
