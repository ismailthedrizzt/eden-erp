# ruff: noqa: E501

from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import RequestContext
from app.domains.reporting.scheduled_reports import run_scheduled_report
from app.domains.reporting.schemas import ReportingFilter
from app.domains.reporting.service import (
    ReportingQueryContext,
    ensure_advanced_reporting_tables,
    normalize_row,
)

DEFAULT_BATCH_SIZE = 20


async def run_due_scheduled_reports(session: AsyncSession, tenant_id: str, *, batch_size: int = DEFAULT_BATCH_SIZE) -> dict[str, Any]:
    ctx = ReportingQueryContext(
        session=session,
        request_context=RequestContext(tenant_id=tenant_id, user_id=None, permissions=["reporting.admin"]),
        tenant_id=tenant_id,
        filters=ReportingFilter(page=1, page_size=50),
    )
    await ensure_advanced_reporting_tables(session, scheduled_reports=True, run_logs=True)
    result = await session.execute(
        text(
            """
            select *
            from public.reporting_scheduled_reports
            where tenant_id = :tenant_id
              and status = 'active'
              and next_run_at <= now()
            order by next_run_at asc
            limit :limit
            """
        ),
        {"tenant_id": tenant_id, "limit": batch_size},
    )
    schedules = [normalize_row(row) for row in result.mappings()]
    completed = 0
    failed = 0
    for schedule in schedules:
        try:
            await run_scheduled_report(ctx, schedule)
            completed += 1
        except Exception:
            failed += 1
    return {"processed": len(schedules), "completed": completed, "failed": failed}
