from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.hr.schemas import ListResult, TimesheetCreateRequest, TimesheetListQuery
from app.domains.hr.service import (
    assert_company_exists,
    assert_company_scope,
    ensure_hr_deepening_tables,
    list_meta,
    record_hr_audit_best_effort,
    row_to_dict,
)

TIMESHEET_SORT_COLUMNS = {
    "period_key": "period_key",
    "period_start": "period_start",
    "period_end": "period_end",
    "status": "status",
    "updated_at": "updated_at",
    "created_at": "created_at",
}


def count_workdays(start_date: date, end_date: date) -> float:
    day = start_date
    count = 0
    while day <= end_date:
        if day.weekday() < 5:
            count += 1
        day += timedelta(days=1)
    return float(count)


async def list_timesheet_periods(
    session: AsyncSession,
    context: dict[str, Any],
    query: TimesheetListQuery,
) -> ListResult:
    await ensure_hr_deepening_tables(session, timesheets=True)
    filters = ["tenant_id = :tenant_id", "coalesce(is_deleted, false) = false"]
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "limit": query.page_size,
        "offset": (query.page - 1) * query.page_size,
    }
    if query.company_id:
        assert_company_scope(context, query.company_id)
        filters.append("company_id = :company_id")
        params["company_id"] = query.company_id
    elif context.get("company_scope_ids"):
        filters.append("company_id = any(cast(:company_scope_ids as uuid[]))")
        params["company_scope_ids"] = context["company_scope_ids"]
    if query.status:
        filters.append("status = :status")
        params["status"] = query.status
    if query.period_from:
        filters.append("period_end >= :period_from")
        params["period_from"] = query.period_from
    if query.period_to:
        filters.append("period_start <= :period_to")
        params["period_to"] = query.period_to
    if query.search:
        filters.append("period_key ilike :search")
        params["search"] = f"%{query.search}%"
    sort = TIMESHEET_SORT_COLUMNS.get(query.sort, "period_start")
    direction = "asc" if query.direction.lower() == "asc" else "desc"
    result = await session.execute(
        text(
            f"""
            select *, count(*) over() as total_count
            from public.hr_timesheet_periods
            where {" and ".join(filters)}
            order by {sort} {direction}, id desc
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


async def create_timesheet_period(
    session: AsyncSession,
    context: dict[str, Any],
    request: TimesheetCreateRequest,
) -> dict[str, Any]:
    await ensure_hr_deepening_tables(session, timesheets=True)
    assert_company_scope(context, request.company_id, write=True)
    await assert_company_exists(session, context, request.company_id)
    result = await session.execute(
        text(
            """
            insert into public.hr_timesheet_periods (
              tenant_id, company_id, period_key, period_start, period_end,
              status, created_by, updated_by
            )
            values (
              :tenant_id, :company_id, :period_key, :period_start, :period_end,
              'draft', :user_id, :user_id
            )
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "user_id": context.get("user_id"),
            **request.model_dump(),
        },
    )
    row = row_to_dict(result.mappings().one())
    await record_hr_audit_best_effort(
        session,
        context,
        action_type="timesheet_created",
        action_key="hr.timesheet.create",
        summary="Puantaj donemi olusturuldu.",
        entity_type="hr_timesheet_period",
        entity_id=str(row["id"]),
        new_values=row,
    )
    return row


async def get_timesheet_period(
    session: AsyncSession,
    tenant_id: str,
    period_id: str,
) -> dict[str, Any] | None:
    await ensure_hr_deepening_tables(session, timesheets=True)
    result = await session.execute(
        text(
            """
            select *
            from public.hr_timesheet_periods
            where tenant_id = :tenant_id
              and id = :period_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "period_id": period_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        return None
    period = row_to_dict(row)
    period["rows"] = await list_timesheet_rows(session, tenant_id, period_id)
    return period


async def list_timesheet_rows(
    session: AsyncSession,
    tenant_id: str,
    period_id: str,
) -> list[dict[str, Any]]:
    result = await session.execute(
        text(
            """
            select tr.*, e.full_name as employee_name, e.employee_no
            from public.hr_timesheet_rows tr
            join public.hr_employees e on e.tenant_id = tr.tenant_id and e.id = tr.employee_id
            where tr.tenant_id = :tenant_id
              and tr.period_id = :period_id
              and coalesce(tr.is_deleted, false) = false
            order by e.full_name asc
            """
        ),
        {"tenant_id": tenant_id, "period_id": period_id},
    )
    return [row_to_dict(row) for row in result.mappings()]


async def calculate_timesheet_period(
    session: AsyncSession,
    context: dict[str, Any],
    period_id: str,
) -> dict[str, Any]:
    period = await _require_period(session, context, period_id, write=True)
    if period["status"] in {"locked", "cancelled"}:
        raise DomainError(
            "Kilitli veya iptal puantaj hesaplanamaz.",
            "TIMESHEET_CALCULATE_INVALID_STATUS",
            status.HTTP_409_CONFLICT,
        )
    await session.execute(
        text(
            """
            update public.hr_timesheet_periods
            set status = 'calculating',
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :period_id
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "period_id": period_id,
            "user_id": context.get("user_id"),
        },
    )
    await session.execute(
        text(
            """
            update public.hr_timesheet_rows
            set is_deleted = true, updated_by = :user_id, updated_at = now(), version = version + 1
            where tenant_id = :tenant_id
              and period_id = :period_id
              and coalesce(is_deleted, false) = false
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "period_id": period_id,
            "user_id": context.get("user_id"),
        },
    )
    employees = await _period_employees(session, context, period)
    totals = {
        "employee_count": 0,
        "total_work_days": 0.0,
        "total_leave_days": 0.0,
        "total_absent_days": 0.0,
        "total_overtime_hours": 0.0,
    }
    planned = count_workdays(period["period_start"], period["period_end"])
    for employee in employees:
        row = await _calculate_employee_row(session, context, period, employee, planned)
        totals["employee_count"] += 1
        totals["total_work_days"] += float(row["worked_days"] or 0)
        totals["total_leave_days"] += float(row["leave_days"] or 0)
        totals["total_absent_days"] += float(row["absent_days"] or 0)
        totals["total_overtime_hours"] += float(row["overtime_hours"] or 0)
    result = await session.execute(
        text(
            """
            update public.hr_timesheet_periods
            set status = 'ready_for_review',
                employee_count = :employee_count,
                total_work_days = :total_work_days,
                total_leave_days = :total_leave_days,
                total_absent_days = :total_absent_days,
                total_overtime_hours = :total_overtime_hours,
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id
              and id = :period_id
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "period_id": period_id,
            "user_id": context.get("user_id"),
            **totals,
        },
    )
    updated = row_to_dict(result.mappings().one())
    updated["rows"] = await list_timesheet_rows(session, context["tenant_id"], period_id)
    await record_hr_audit_best_effort(
        session,
        context,
        action_type="timesheet_calculated",
        action_key="hr.timesheet.calculate",
        summary="Puantaj donemi hesaplandi.",
        entity_type="hr_timesheet_period",
        entity_id=str(period_id),
        old_values=period,
        new_values=updated,
    )
    return updated


async def approve_timesheet_period(
    session: AsyncSession,
    context: dict[str, Any],
    period_id: str,
) -> dict[str, Any]:
    period = await _require_period(session, context, period_id, write=True)
    if period["status"] not in {"ready_for_review", "approved"}:
        raise DomainError(
            "Puantaj once hesaplanip incelemeye hazir olmalidir.",
            "TIMESHEET_APPROVE_INVALID_STATUS",
            status.HTTP_409_CONFLICT,
        )
    await session.execute(
        text(
            """
            update public.hr_timesheet_rows
            set status = 'approved',
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id
              and period_id = :period_id
              and coalesce(is_deleted, false) = false
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "period_id": period_id,
            "user_id": context.get("user_id"),
        },
    )
    result = await session.execute(
        text(
            """
            update public.hr_timesheet_periods
            set status = 'approved',
                approved_by = :user_id,
                approved_at = now(),
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :period_id
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "period_id": period_id,
            "user_id": context.get("user_id"),
        },
    )
    updated = row_to_dict(result.mappings().one())
    await record_hr_audit_best_effort(
        session,
        context,
        action_type="timesheet_approved",
        action_key="hr.timesheet.approve",
        summary="Puantaj donemi onaylandi.",
        entity_type="hr_timesheet_period",
        entity_id=str(period_id),
        old_values=period,
        new_values=updated,
    )
    return updated


async def lock_timesheet_period(
    session: AsyncSession,
    context: dict[str, Any],
    period_id: str,
) -> dict[str, Any]:
    period = await _require_period(session, context, period_id, write=True)
    if period["status"] not in {"approved", "locked"}:
        raise DomainError(
            "Puantaj kilitlemek icin once onaylanmalidir.",
            "TIMESHEET_LOCK_INVALID_STATUS",
            status.HTTP_409_CONFLICT,
        )
    await session.execute(
        text(
            """
            update public.hr_timesheet_rows
            set status = 'locked', updated_by = :user_id, updated_at = now(), version = version + 1
            where tenant_id = :tenant_id
              and period_id = :period_id
              and coalesce(is_deleted, false) = false
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "period_id": period_id,
            "user_id": context.get("user_id"),
        },
    )
    result = await session.execute(
        text(
            """
            update public.hr_timesheet_periods
            set status = 'locked', updated_by = :user_id, updated_at = now(), version = version + 1
            where tenant_id = :tenant_id and id = :period_id
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "period_id": period_id,
            "user_id": context.get("user_id"),
        },
    )
    updated = row_to_dict(result.mappings().one())
    await record_hr_audit_best_effort(
        session,
        context,
        action_type="timesheet_locked",
        action_key="hr.timesheet.lock",
        summary="Puantaj donemi kilitlendi.",
        entity_type="hr_timesheet_period",
        entity_id=str(period_id),
        old_values=period,
        new_values=updated,
    )
    return updated


async def _require_period(
    session: AsyncSession,
    context: dict[str, Any],
    period_id: str,
    *,
    write: bool = False,
) -> dict[str, Any]:
    period = await get_timesheet_period(session, context["tenant_id"], period_id)
    if not period:
        raise DomainError(
            "Puantaj donemi bulunamadi.", "TIMESHEET_PERIOD_NOT_FOUND", status.HTTP_404_NOT_FOUND
        )
    assert_company_scope(context, str(period["company_id"]), write=write)
    return period


async def _period_employees(
    session: AsyncSession,
    context: dict[str, Any],
    period: dict[str, Any],
) -> list[dict[str, Any]]:
    result = await session.execute(
        text(
            """
            select *
            from public.hr_employees
            where tenant_id = :tenant_id
              and company_id = :company_id
              and employment_status = 'active'
              and coalesce(is_deleted, false) = false
            order by full_name asc
            """
        ),
        {"tenant_id": context["tenant_id"], "company_id": period["company_id"]},
    )
    return [row_to_dict(row) for row in result.mappings()]


async def _calculate_employee_row(
    session: AsyncSession,
    context: dict[str, Any],
    period: dict[str, Any],
    employee: dict[str, Any],
    planned_days: float,
) -> dict[str, Any]:
    attendance = await _attendance_aggregate(session, context, period, employee)
    leave = await _leave_aggregate(session, context, period, employee)
    result = await session.execute(
        text(
            """
            insert into public.hr_timesheet_rows (
              tenant_id, period_id, employee_id, planned_days, worked_days,
              leave_days, unpaid_leave_days, sick_leave_days, absent_days,
              overtime_hours, missing_hours, notes, status, created_by, updated_by
            )
            values (
              :tenant_id, :period_id, :employee_id, :planned_days, :worked_days,
              :leave_days, :unpaid_leave_days, :sick_leave_days, :absent_days,
              :overtime_hours, :missing_hours, :notes, 'reviewed', :user_id, :user_id
            )
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "period_id": period["id"],
            "employee_id": employee["id"],
            "planned_days": planned_days,
            "worked_days": attendance["worked_days"],
            "leave_days": leave["leave_days"],
            "unpaid_leave_days": leave["unpaid_leave_days"],
            "sick_leave_days": leave["sick_leave_days"],
            "absent_days": attendance["absent_days"],
            "overtime_hours": attendance["overtime_hours"],
            "missing_hours": attendance["missing_hours"],
            "notes": "MVP calculation from attendance and approved leave.",
            "user_id": context.get("user_id"),
        },
    )
    return row_to_dict(result.mappings().one())


async def _attendance_aggregate(
    session: AsyncSession,
    context: dict[str, Any],
    period: dict[str, Any],
    employee: dict[str, Any],
) -> dict[str, float]:
    result = await session.execute(
        text(
            """
            select
              count(distinct work_date) filter (
                where status in (
                  'present',
                  'remote',
                  'field',
                  'late',
                  'early_leave',
                  'overtime'
                )
              ) as worked_days,
              count(distinct work_date) filter (where status = 'absent') as absent_days,
              coalesce(sum(overtime_hours), 0) as overtime_hours,
              coalesce(sum(missing_hours), 0) as missing_hours
            from public.hr_attendance_records
            where tenant_id = :tenant_id
              and employee_id = :employee_id
              and work_date between :period_start and :period_end
              and coalesce(is_deleted, false) = false
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "employee_id": employee["id"],
            "period_start": period["period_start"],
            "period_end": period["period_end"],
        },
    )
    row = result.mappings().one()
    return {
        key: float(row[key] or 0)
        for key in ["worked_days", "absent_days", "overtime_hours", "missing_hours"]
    }


async def _leave_aggregate(
    session: AsyncSession,
    context: dict[str, Any],
    period: dict[str, Any],
    employee: dict[str, Any],
) -> dict[str, float]:
    result = await session.execute(
        text(
            """
            select
              coalesce(sum(lr.total_days), 0) as leave_days,
              coalesce(
                sum(lr.total_days) filter (where lt.category = 'unpaid'),
                0
              ) as unpaid_leave_days,
              coalesce(sum(lr.total_days) filter (where lt.category = 'sick'), 0) as sick_leave_days
            from public.hr_leave_requests lr
            join public.hr_leave_types lt
              on lt.tenant_id = lr.tenant_id
             and lt.id = lr.leave_type_id
            where lr.tenant_id = :tenant_id
              and lr.employee_id = :employee_id
              and lr.status = 'approved'
              and lr.start_date <= :period_end
              and lr.end_date >= :period_start
              and coalesce(lr.is_deleted, false) = false
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "employee_id": employee["id"],
            "period_start": period["period_start"],
            "period_end": period["period_end"],
        },
    )
    row = result.mappings().one()
    return {
        key: float(row[key] or 0) for key in ["leave_days", "unpaid_leave_days", "sick_leave_days"]
    }
