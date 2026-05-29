from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.hr.schemas import ListResult, PayrollPrepListQuery
from app.domains.hr.service import (
    assert_company_scope,
    ensure_hr_deepening_tables,
    list_meta,
    record_hr_audit_best_effort,
    row_to_dict,
)
from app.domains.hr.timesheets import get_timesheet_period

PAYROLL_SORT_COLUMNS = {
    "updated_at": "p.updated_at",
    "employee": "e.full_name",
    "payroll_status": "p.payroll_status",
}
PAYROLL_PREP_NOTICE = (
    "Bu ekran bordro hesaplamasi yapmaz; bordro hazirligi icin puantaj verisini hazirlar."
)


async def list_payroll_prep_rows(
    session: AsyncSession,
    context: dict[str, Any],
    query: PayrollPrepListQuery,
) -> ListResult:
    await ensure_hr_deepening_tables(session, payroll_prep=True, timesheets=True)
    filters = ["p.tenant_id = :tenant_id", "coalesce(p.is_deleted, false) = false"]
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "limit": query.page_size,
        "offset": (query.page - 1) * query.page_size,
    }
    if query.company_id:
        assert_company_scope(context, query.company_id)
        filters.append("p.company_id = :company_id")
        params["company_id"] = query.company_id
    elif context.get("company_scope_ids"):
        filters.append("p.company_id = any(cast(:company_scope_ids as uuid[]))")
        params["company_scope_ids"] = context["company_scope_ids"]
    if query.period_id:
        filters.append("p.period_id = :period_id")
        params["period_id"] = query.period_id
    if query.employee_id:
        filters.append("p.employee_id = :employee_id")
        params["employee_id"] = query.employee_id
    if query.payroll_status:
        filters.append("p.payroll_status = :payroll_status")
        params["payroll_status"] = query.payroll_status
    sort = PAYROLL_SORT_COLUMNS.get(query.sort, "p.updated_at")
    direction = "asc" if query.direction.lower() == "asc" else "desc"
    result = await session.execute(
        text(
            f"""
            select p.*, e.full_name as employee_name, e.employee_no,
                   tp.period_key, tp.period_start, tp.period_end,
                   count(*) over() as total_count
            from public.hr_payroll_preparation_rows p
            join public.hr_employees e on e.tenant_id = p.tenant_id and e.id = p.employee_id
            join public.hr_timesheet_periods tp
              on tp.tenant_id = p.tenant_id
             and tp.id = p.period_id
            where {" and ".join(filters)}
            order by {sort} {direction}, p.id desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    rows = [row_to_dict(row) for row in result.mappings()]
    total = int(rows[0].pop("total_count")) if rows else 0
    for row in rows[1:]:
        row.pop("total_count", None)
    return ListResult(data=rows, meta=list_meta(query.page, query.page_size, total))


async def get_payroll_prep_for_period(
    session: AsyncSession,
    context: dict[str, Any],
    period_id: str,
) -> dict[str, Any]:
    period = await get_timesheet_period(session, context["tenant_id"], period_id)
    if not period:
        raise DomainError(
            "Puantaj donemi bulunamadi.", "TIMESHEET_PERIOD_NOT_FOUND", status.HTTP_404_NOT_FOUND
        )
    assert_company_scope(context, str(period["company_id"]))
    rows = await list_payroll_prep_rows(
        session,
        context,
        PayrollPrepListQuery(
            company_id=str(period["company_id"]), period_id=period_id, page_size=200
        ),
    )
    return {
        "period": period,
        "rows": rows.data,
        "notice": PAYROLL_PREP_NOTICE,
    }


async def mark_payroll_prep_ready(
    session: AsyncSession,
    context: dict[str, Any],
    period_id: str,
) -> dict[str, Any]:
    period = await get_timesheet_period(session, context["tenant_id"], period_id)
    if not period:
        raise DomainError(
            "Puantaj donemi bulunamadi.", "TIMESHEET_PERIOD_NOT_FOUND", status.HTTP_404_NOT_FOUND
        )
    assert_company_scope(context, str(period["company_id"]), write=True)
    if period["status"] not in {"approved", "locked"}:
        raise DomainError(
            "Bordro hazirligi icin puantaj once onaylanmalidir.",
            "PAYROLL_PREP_PERIOD_NOT_APPROVED",
            status.HTTP_409_CONFLICT,
        )
    await session.execute(
        text(
            """
            insert into public.hr_payroll_preparation_rows (
              tenant_id, company_id, period_id, employee_id, worked_days, leave_days,
              unpaid_leave_days, sick_leave_days, absent_days, overtime_hours,
              base_salary, currency, payroll_status, created_by, updated_by
            )
            select
              tr.tenant_id, :company_id, tr.period_id, tr.employee_id,
              tr.worked_days, tr.leave_days, tr.unpaid_leave_days, tr.sick_leave_days,
              tr.absent_days, tr.overtime_hours, null, er.currency, 'ready',
              :user_id, :user_id
            from public.hr_timesheet_rows tr
            left join lateral (
              select currency
              from public.hr_employment_records er
              where er.tenant_id = tr.tenant_id
                and er.employee_id = tr.employee_id
                and coalesce(er.is_deleted, false) = false
              order by
                case when er.employment_status = 'active' then 0 else 1 end,
                er.created_at desc
              limit 1
            ) er on true
            where tr.tenant_id = :tenant_id
              and tr.period_id = :period_id
              and coalesce(tr.is_deleted, false) = false
            on conflict (tenant_id, period_id, employee_id)
            where coalesce(is_deleted, false) = false
            do update set
              worked_days = excluded.worked_days,
              leave_days = excluded.leave_days,
              unpaid_leave_days = excluded.unpaid_leave_days,
              sick_leave_days = excluded.sick_leave_days,
              absent_days = excluded.absent_days,
              overtime_hours = excluded.overtime_hours,
              base_salary = null,
              currency = excluded.currency,
              payroll_status = 'ready',
              updated_by = excluded.updated_by,
              updated_at = now(),
              version = hr_payroll_preparation_rows.version + 1
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "company_id": period["company_id"],
            "period_id": period_id,
            "user_id": context.get("user_id"),
        },
    )
    await record_hr_audit_best_effort(
        session,
        context,
        action_type="payroll_prep_marked_ready",
        action_key="hr.payrollPrep.ready",
        summary="Bordro hazirlik satirlari hazir isaretlendi.",
        entity_type="hr_timesheet_period",
        entity_id=str(period_id),
        new_values={"period_id": period_id, "payroll_status": "ready", "no_amounts": True},
    )
    return await get_payroll_prep_for_period(session, context, period_id)
