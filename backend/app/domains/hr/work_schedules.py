from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.hr.employment import require_employee
from app.domains.hr.schemas import (
    ListResult,
    WorkScheduleAssignmentRequest,
    WorkScheduleCreateRequest,
    WorkScheduleListQuery,
    WorkScheduleUpdateRequest,
)
from app.domains.hr.service import (
    assert_company_exists,
    assert_company_scope,
    assert_version,
    ensure_hr_deepening_tables,
    json_dumps,
    list_meta,
    record_hr_audit_best_effort,
    row_to_dict,
)

WORK_SCHEDULE_SORT_COLUMNS = {
    "schedule_name": "schedule_name",
    "active": "active",
    "updated_at": "updated_at",
    "created_at": "created_at",
}


async def list_work_schedules(
    session: AsyncSession,
    context: dict[str, Any],
    query: WorkScheduleListQuery,
) -> ListResult:
    await ensure_hr_deepening_tables(session, work_schedules=True)
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
    if query.active is not None:
        filters.append("active = :active")
        params["active"] = query.active
    if query.search:
        filters.append("schedule_name ilike :search")
        params["search"] = f"%{query.search}%"
    sort = WORK_SCHEDULE_SORT_COLUMNS.get(query.sort, "schedule_name")
    direction = "asc" if query.direction.lower() == "asc" else "desc"
    result = await session.execute(
        text(
            f"""
            select *, count(*) over() as total_count
            from public.hr_work_schedules
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


async def create_work_schedule(
    session: AsyncSession,
    context: dict[str, Any],
    request: WorkScheduleCreateRequest,
) -> dict[str, Any]:
    await ensure_hr_deepening_tables(session, work_schedules=True)
    assert_company_scope(context, request.company_id, write=True)
    await assert_company_exists(session, context, request.company_id)
    payload = request.model_dump()
    result = await session.execute(
        text(
            """
            insert into public.hr_work_schedules (
              tenant_id, company_id, schedule_name, weekly_pattern, daily_hours,
              active, notes, created_by, updated_by
            )
            values (
              :tenant_id, :company_id, :schedule_name, cast(:weekly_pattern as jsonb),
              :daily_hours, :active, :notes, :user_id, :user_id
            )
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "user_id": context.get("user_id"),
            **payload,
            "weekly_pattern": json_dumps(payload.get("weekly_pattern")),
        },
    )
    row = row_to_dict(result.mappings().one())
    await record_hr_audit_best_effort(
        session,
        context,
        action_type="work_schedule_created",
        action_key="hr.workSchedule.create",
        summary="Calisma plani olusturuldu.",
        entity_type="hr_work_schedule",
        entity_id=str(row["id"]),
        new_values=row,
    )
    return row


async def update_work_schedule(
    session: AsyncSession,
    context: dict[str, Any],
    schedule_id: str,
    request: WorkScheduleUpdateRequest,
) -> dict[str, Any]:
    current = await get_work_schedule(session, context["tenant_id"], schedule_id)
    if not current:
        raise DomainError(
            "Calisma plani bulunamadi.", "WORK_SCHEDULE_NOT_FOUND", status.HTTP_404_NOT_FOUND
        )
    assert_company_scope(context, str(current["company_id"]), write=True)
    assert_version(current, request.base_version)
    payload = request.model_dump(exclude_unset=True, exclude={"base_version"})
    if "company_id" in payload and payload["company_id"]:
        assert_company_scope(context, str(payload["company_id"]), write=True)
    if "weekly_pattern" in payload:
        payload["weekly_pattern"] = json_dumps(payload.get("weekly_pattern"))
    if not payload:
        return current
    assignments = []
    for key in payload:
        assignments.append(
            "weekly_pattern = cast(:weekly_pattern as jsonb)"
            if key == "weekly_pattern"
            else f"{key} = :{key}"
        )
    assignments.extend(["updated_by = :user_id", "updated_at = now()", "version = version + 1"])
    result = await session.execute(
        text(
            f"""
            update public.hr_work_schedules
            set {", ".join(assignments)}
            where tenant_id = :tenant_id
              and id = :schedule_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "schedule_id": schedule_id,
            "user_id": context.get("user_id"),
            **payload,
        },
    )
    return row_to_dict(result.mappings().one())


async def assign_work_schedule_to_employee(
    session: AsyncSession,
    context: dict[str, Any],
    employee_id: str,
    request: WorkScheduleAssignmentRequest,
) -> dict[str, Any]:
    await ensure_hr_deepening_tables(session, work_schedules=True, employee_work_schedules=True)
    employee = await require_employee(session, context, employee_id, write=True)
    schedule = await get_work_schedule(session, context["tenant_id"], request.work_schedule_id)
    if not schedule or not schedule.get("active"):
        raise DomainError(
            "Aktif calisma plani bulunamadi.", "WORK_SCHEDULE_NOT_FOUND", status.HTTP_404_NOT_FOUND
        )
    if str(schedule["company_id"]) != str(employee["company_id"]):
        raise DomainError(
            "Calisma plani calisan sirketiyle uyumlu degil.",
            "WORK_SCHEDULE_COMPANY_MISMATCH",
            status.HTTP_409_CONFLICT,
        )
    if request.end_date and request.end_date < request.effective_date:
        raise DomainError(
            "Calisma plani bitis tarihi baslangictan once olamaz.",
            "WORK_SCHEDULE_ASSIGNMENT_DATE_INVALID",
            status.HTTP_400_BAD_REQUEST,
        )
    result = await session.execute(
        text(
            """
            insert into public.hr_employee_work_schedules (
              tenant_id, employee_id, work_schedule_id, effective_date, end_date,
              created_by, updated_by
            )
            values (
              :tenant_id, :employee_id, :work_schedule_id, :effective_date, :end_date,
              :user_id, :user_id
            )
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "employee_id": employee_id,
            "work_schedule_id": request.work_schedule_id,
            "effective_date": request.effective_date,
            "end_date": request.end_date,
            "user_id": context.get("user_id"),
        },
    )
    row = row_to_dict(result.mappings().one())
    await record_hr_audit_best_effort(
        session,
        context,
        action_type="work_schedule_assigned",
        action_key="hr.workSchedule.assign",
        summary="Calisana calisma plani atandi.",
        entity_type="hr_employee_work_schedule",
        entity_id=str(row["id"]),
        new_values=row,
    )
    return row


async def get_work_schedule(
    session: AsyncSession,
    tenant_id: str,
    schedule_id: str,
) -> dict[str, Any] | None:
    await ensure_hr_deepening_tables(session, work_schedules=True)
    result = await session.execute(
        text(
            """
            select *
            from public.hr_work_schedules
            where tenant_id = :tenant_id
              and id = :schedule_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "schedule_id": schedule_id},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None
