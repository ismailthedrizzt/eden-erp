from __future__ import annotations

from datetime import timedelta
from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.hr.employment import require_employee
from app.domains.hr.schemas import (
    AttendanceCreateRequest,
    AttendanceImportRequest,
    AttendanceListQuery,
    AttendanceStatus,
    AttendanceUpdateRequest,
    ListResult,
)
from app.domains.hr.service import (
    assert_company_scope,
    assert_version,
    ensure_hr_deepening_tables,
    list_meta,
    record_hr_audit_best_effort,
    row_to_dict,
)

ATTENDANCE_SORT_COLUMNS = {
    "work_date": "a.work_date",
    "status": "a.status",
    "source": "a.source",
    "updated_at": "a.updated_at",
    "created_at": "a.created_at",
}


def calculate_hour_deltas(
    planned_hours: float | int | None, actual_hours: float | int | None
) -> tuple[float, float]:
    planned = float(planned_hours or 0)
    actual = float(actual_hours or 0)
    return (round(max(0, actual - planned), 2), round(max(0, planned - actual), 2))


async def list_attendance_records(
    session: AsyncSession,
    context: dict[str, Any],
    query: AttendanceListQuery,
) -> ListResult:
    await ensure_hr_deepening_tables(session, attendance=True)
    filters = ["a.tenant_id = :tenant_id", "coalesce(a.is_deleted, false) = false"]
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "limit": query.page_size,
        "offset": (query.page - 1) * query.page_size,
    }
    if query.company_id:
        assert_company_scope(context, query.company_id)
        filters.append("a.company_id = :company_id")
        params["company_id"] = query.company_id
    elif context.get("company_scope_ids"):
        filters.append("a.company_id = any(cast(:company_scope_ids as uuid[]))")
        params["company_scope_ids"] = context["company_scope_ids"]
    if query.employee_id:
        filters.append("a.employee_id = :employee_id")
        params["employee_id"] = query.employee_id
    if query.status:
        filters.append("a.status = :status")
        params["status"] = query.status
    if query.source:
        filters.append("a.source = :source")
        params["source"] = query.source
    if query.approved is not None:
        filters.append("a.approved = :approved")
        params["approved"] = query.approved
    if query.date_from:
        filters.append("a.work_date >= :date_from")
        params["date_from"] = query.date_from
    if query.date_to:
        filters.append("a.work_date <= :date_to")
        params["date_to"] = query.date_to
    if query.search:
        filters.append(
            "("
            "e.full_name ilike :search "
            "or e.employee_no ilike :search "
            "or coalesce(a.notes, '') ilike :search"
            ")"
        )
        params["search"] = f"%{query.search}%"
    sort = ATTENDANCE_SORT_COLUMNS.get(query.sort, "a.work_date")
    direction = "asc" if query.direction.lower() == "asc" else "desc"
    result = await session.execute(
        text(
            f"""
            select a.*, e.full_name as employee_name, e.employee_no,
                   count(*) over() as total_count
            from public.hr_attendance_records a
            join public.hr_employees e on e.tenant_id = a.tenant_id and e.id = a.employee_id
            where {" and ".join(filters)}
            order by {sort} {direction}, a.id desc
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


async def create_attendance_record(
    session: AsyncSession,
    context: dict[str, Any],
    request: AttendanceCreateRequest,
) -> dict[str, Any]:
    await ensure_hr_deepening_tables(session, attendance=True)
    employee = await require_employee(session, context, request.employee_id, write=True)
    if employee.get("employment_status") == "terminated":
        raise DomainError(
            "Isten ayrilmis calisana devam kaydi girilemez.",
            "ATTENDANCE_EMPLOYEE_TERMINATED",
            status.HTTP_409_CONFLICT,
        )
    await assert_no_locked_timesheet(
        session, context, str(employee["company_id"]), request.work_date, request.work_date
    )
    overtime, missing = calculate_hour_deltas(request.planned_hours, request.actual_hours)
    result = await session.execute(
        text(
            """
            insert into public.hr_attendance_records (
              tenant_id, company_id, employee_id, work_date, status, check_in_time,
              check_out_time, planned_hours, actual_hours, overtime_hours,
              missing_hours, source, related_leave_request_id, related_shift_id,
              notes, approved, approved_by, approved_at, created_by, updated_by
            )
            values (
              :tenant_id, :company_id, :employee_id, :work_date, :status,
              :check_in_time, :check_out_time, :planned_hours, :actual_hours,
              :overtime_hours, :missing_hours, :source, :related_leave_request_id,
              :related_shift_id, :notes, :approved,
              case when :approved then :user_id else null end,
              case when :approved then now() else null end,
              :user_id, :user_id
            )
            on conflict (tenant_id, employee_id, work_date)
            where coalesce(is_deleted, false) = false
            do update set
              status = excluded.status,
              check_in_time = excluded.check_in_time,
              check_out_time = excluded.check_out_time,
              planned_hours = excluded.planned_hours,
              actual_hours = excluded.actual_hours,
              overtime_hours = excluded.overtime_hours,
              missing_hours = excluded.missing_hours,
              source = excluded.source,
              related_leave_request_id = excluded.related_leave_request_id,
              related_shift_id = excluded.related_shift_id,
              notes = excluded.notes,
              approved = excluded.approved,
              approved_by = excluded.approved_by,
              approved_at = excluded.approved_at,
              updated_by = excluded.updated_by,
              updated_at = now(),
              version = hr_attendance_records.version + 1
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "company_id": employee["company_id"],
            "user_id": context.get("user_id"),
            **request.model_dump(),
            "overtime_hours": request.overtime_hours
            if request.overtime_hours is not None
            else overtime,
            "missing_hours": request.missing_hours
            if request.missing_hours is not None
            else missing,
        },
    )
    row = row_to_dict(result.mappings().one())
    await record_hr_audit_best_effort(
        session,
        context,
        action_type="attendance_created",
        action_key="hr.attendance.create",
        summary="Devam-devamsizlik kaydi olusturuldu.",
        entity_type="hr_attendance_record",
        entity_id=str(row["id"]),
        new_values=row,
    )
    return row


async def update_attendance_record(
    session: AsyncSession,
    context: dict[str, Any],
    attendance_id: str,
    request: AttendanceUpdateRequest,
) -> dict[str, Any]:
    current = await get_attendance_record(session, context["tenant_id"], attendance_id)
    if not current:
        raise DomainError(
            "Devam-devamsizlik kaydi bulunamadi.", "ATTENDANCE_NOT_FOUND", status.HTTP_404_NOT_FOUND
        )
    assert_company_scope(context, str(current["company_id"]), write=True)
    assert_version(current, request.base_version)
    await assert_no_locked_timesheet(
        session, context, str(current["company_id"]), current["work_date"], current["work_date"]
    )
    payload = request.model_dump(exclude_unset=True, exclude={"base_version"})
    if not payload:
        return current
    planned = payload.get("planned_hours", current.get("planned_hours"))
    actual = payload.get("actual_hours", current.get("actual_hours"))
    overtime, missing = calculate_hour_deltas(planned, actual)
    payload.setdefault("overtime_hours", overtime)
    payload.setdefault("missing_hours", missing)
    if payload.get("approved") is True and not payload.get("approved_by"):
        payload["approved_by"] = context.get("user_id")
    assignments = []
    for key in payload:
        assignments.append(f"{key} = :{key}")
    if payload.get("approved") is True:
        assignments.append("approved_at = coalesce(approved_at, now())")
    assignments.extend(["updated_by = :user_id", "updated_at = now()", "version = version + 1"])
    result = await session.execute(
        text(
            f"""
            update public.hr_attendance_records
            set {", ".join(assignments)}
            where tenant_id = :tenant_id
              and id = :attendance_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "attendance_id": attendance_id,
            "user_id": context.get("user_id"),
            **payload,
        },
    )
    updated = row_to_dict(result.mappings().one())
    await record_hr_audit_best_effort(
        session,
        context,
        action_type="attendance_updated",
        action_key="hr.attendance.update",
        summary="Devam-devamsizlik kaydi guncellendi.",
        entity_type="hr_attendance_record",
        entity_id=str(updated["id"]),
        old_values=current,
        new_values=updated,
    )
    return updated


async def import_attendance_records(
    session: AsyncSession,
    context: dict[str, Any],
    request: AttendanceImportRequest,
) -> dict[str, Any]:
    rows = []
    for item in request.records:
        rows.append(await create_attendance_record(session, context, item))
    return {"inserted": len(rows), "records": rows}


async def create_attendance_for_leave(
    session: AsyncSession,
    context: dict[str, Any],
    leave_request: dict[str, Any],
    leave_type: dict[str, Any],
) -> None:
    employee = await require_employee(
        session, context, str(leave_request["employee_id"]), write=True
    )
    current_date = leave_request["start_date"]
    status_value: AttendanceStatus = (
        "sick_leave" if leave_type.get("category") == "sick" else "leave"
    )
    while current_date <= leave_request["end_date"]:
        planned_hours = await planned_hours_for_employee_date(
            session,
            context["tenant_id"],
            str(employee["id"]),
            current_date,
            default_hours=7.5,
        )
        await create_attendance_record(
            session,
            context,
            AttendanceCreateRequest(
                employee_id=str(employee["id"]),
                work_date=current_date,
                status=status_value,
                planned_hours=planned_hours,
                actual_hours=0,
                overtime_hours=0,
                missing_hours=0,
                source="system",
                related_leave_request_id=str(leave_request["id"]),
                notes=f"{leave_request.get('request_no')} onayli izin",
                approved=True,
            ),
        )
        current_date += timedelta(days=1)


async def get_attendance_record(
    session: AsyncSession,
    tenant_id: str,
    attendance_id: str,
) -> dict[str, Any] | None:
    await ensure_hr_deepening_tables(session, attendance=True)
    result = await session.execute(
        text(
            """
            select *
            from public.hr_attendance_records
            where tenant_id = :tenant_id
              and id = :attendance_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "attendance_id": attendance_id},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def planned_hours_for_employee_date(
    session: AsyncSession,
    tenant_id: str,
    employee_id: str,
    work_date: Any,
    *,
    default_hours: float = 0,
) -> float:
    if not await _deepening_work_schedule_tables_exist(session):
        return default_hours
    result = await session.execute(
        text(
            """
            select ws.daily_hours
            from public.hr_employee_work_schedules ews
            join public.hr_work_schedules ws
              on ws.tenant_id = ews.tenant_id
             and ws.id = ews.work_schedule_id
            where ews.tenant_id = :tenant_id
              and ews.employee_id = :employee_id
              and ews.effective_date <= :work_date
              and (ews.end_date is null or ews.end_date >= :work_date)
              and coalesce(ews.is_deleted, false) = false
              and coalesce(ws.is_deleted, false) = false
              and ws.active = true
            order by ews.effective_date desc
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "employee_id": employee_id, "work_date": work_date},
    )
    row = result.mappings().one_or_none()
    return float(row["daily_hours"]) if row else default_hours


async def assert_no_locked_timesheet(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    start_date: Any,
    end_date: Any,
) -> None:
    await ensure_hr_deepening_tables(session, timesheets=True)
    result = await session.execute(
        text(
            """
            select id, period_key
            from public.hr_timesheet_periods
            where tenant_id = :tenant_id
              and company_id = :company_id
              and status = 'locked'
              and coalesce(is_deleted, false) = false
              and period_start <= :end_date
              and period_end >= :start_date
            limit 1
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "company_id": company_id,
            "start_date": start_date,
            "end_date": end_date,
        },
    )
    row = result.mappings().one_or_none()
    if row:
        raise DomainError(
            "Kilitli puantaj donemine ait kayit degistirilemez.",
            "TIMESHEET_PERIOD_LOCKED",
            status.HTTP_409_CONFLICT,
            {"period_key": row["period_key"]},
        )


async def _deepening_work_schedule_tables_exist(session: AsyncSession) -> bool:
    from app.domains.operations.service import table_exists

    return await table_exists(session, "public.hr_work_schedules") and await table_exists(
        session, "public.hr_employee_work_schedules"
    )
