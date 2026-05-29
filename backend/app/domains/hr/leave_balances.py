from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.hr.employment import require_employee
from app.domains.hr.leave_types import ensure_default_leave_types
from app.domains.hr.schemas import LeaveBalanceAdjustRequest
from app.domains.hr.service import (
    assert_company_scope,
    assert_version,
    ensure_hr_deepening_tables,
    json_dumps,
    record_hr_audit_best_effort,
    row_to_dict,
)

PENDING_LEAVE_STATUSES = {"submitted", "pending_approval"}
USED_LEAVE_STATUSES = {"approved"}


def calculate_remaining_days(
    entitled_days: float,
    carried_over_days: float,
    adjusted_days: float,
    used_days: float,
    pending_days: float,
) -> float:
    return round(entitled_days + carried_over_days + adjusted_days - used_days - pending_days, 2)


async def list_employee_leave_balances(
    session: AsyncSession,
    context: dict[str, Any],
    employee_id: str,
    *,
    period_year: int | None = None,
) -> list[dict[str, Any]]:
    year = period_year or __import__("datetime").date.today().year
    employee = await require_employee(session, context, employee_id)
    await recalculate_employee_leave_balances(session, context, employee_id, period_year=year)
    result = await session.execute(
        text(
            """
            select b.*, lt.leave_type_key, lt.leave_type_name, lt.category, lt.paid,
                   lt.requires_document, lt.negative_balance_allowed
            from public.hr_leave_balances b
            join public.hr_leave_types lt on lt.tenant_id = b.tenant_id and lt.id = b.leave_type_id
            where b.tenant_id = :tenant_id
              and b.employee_id = :employee_id
              and b.period_year = :period_year
              and coalesce(b.is_deleted, false) = false
            order by lt.leave_type_name asc
            """
        ),
        {"tenant_id": context["tenant_id"], "employee_id": employee["id"], "period_year": year},
    )
    return [row_to_dict(row) for row in result.mappings()]


async def recalculate_employee_leave_balances(
    session: AsyncSession,
    context: dict[str, Any],
    employee_id: str,
    *,
    period_year: int | None = None,
) -> list[dict[str, Any]]:
    await ensure_hr_deepening_tables(
        session, leave_types=True, leave_balances=True, leave_requests=True
    )
    await ensure_default_leave_types(session, context)
    employee = await require_employee(session, context, employee_id)
    assert_company_scope(context, str(employee["company_id"]), write=True)
    year = period_year or __import__("datetime").date.today().year
    type_result = await session.execute(
        text(
            """
            select *
            from public.hr_leave_types
            where tenant_id = :tenant_id
              and active = true
              and coalesce(is_deleted, false) = false
              and (company_id is null or company_id = :company_id)
            order by case when company_id is null then 0 else 1 end, leave_type_name asc
            """
        ),
        {"tenant_id": context["tenant_id"], "company_id": employee["company_id"]},
    )
    leave_types = [row_to_dict(row) for row in type_result.mappings()]
    rows: list[dict[str, Any]] = []
    for leave_type in leave_types:
        rows.append(
            await recalculate_leave_balance(
                session,
                context,
                employee,
                leave_type,
                period_year=year,
            )
        )
    return rows


async def recalculate_leave_balance(
    session: AsyncSession,
    context: dict[str, Any],
    employee: dict[str, Any],
    leave_type: dict[str, Any],
    *,
    period_year: int,
) -> dict[str, Any]:
    current = await _find_balance(
        session,
        context["tenant_id"],
        str(employee["id"]),
        str(leave_type["id"]),
        period_year,
    )
    entitled = _as_float(
        (current or {}).get("entitled_days"), _as_float(leave_type.get("default_days_per_year"))
    )
    carried = _as_float((current or {}).get("carried_over_days"))
    adjusted = _as_float((current or {}).get("adjusted_days"))
    usage = await _usage_for_balance(
        session,
        context["tenant_id"],
        str(employee["id"]),
        str(leave_type["id"]),
        period_year,
    )
    remaining = calculate_remaining_days(
        entitled,
        carried,
        adjusted,
        usage["used_days"],
        usage["pending_days"],
    )
    params = {
        "tenant_id": context["tenant_id"],
        "company_id": employee["company_id"],
        "employee_id": employee["id"],
        "leave_type_id": leave_type["id"],
        "period_year": period_year,
        "entitled_days": entitled,
        "carried_over_days": carried,
        "used_days": usage["used_days"],
        "pending_days": usage["pending_days"],
        "remaining_days": remaining,
        "adjusted_days": adjusted,
        "adjustment_reason": (current or {}).get("adjustment_reason"),
        "status": (current or {}).get("status") or "active",
        "metadata_json": json_dumps((current or {}).get("metadata_json")),
        "user_id": context.get("user_id"),
    }
    result = await session.execute(
        text(
            """
            insert into public.hr_leave_balances (
              tenant_id, company_id, employee_id, leave_type_id, period_year,
              entitled_days, carried_over_days, used_days, pending_days, remaining_days,
              adjusted_days, adjustment_reason, last_calculated_at, status, metadata_json,
              created_by, updated_by
            )
            values (
              :tenant_id, :company_id, :employee_id, :leave_type_id, :period_year,
              :entitled_days, :carried_over_days, :used_days, :pending_days,
              :remaining_days, :adjusted_days, :adjustment_reason, now(), :status,
              cast(:metadata_json as jsonb), :user_id, :user_id
            )
            on conflict (tenant_id, employee_id, leave_type_id, period_year)
            where coalesce(is_deleted, false) = false
            do update set
              company_id = excluded.company_id,
              entitled_days = excluded.entitled_days,
              carried_over_days = excluded.carried_over_days,
              used_days = excluded.used_days,
              pending_days = excluded.pending_days,
              remaining_days = excluded.remaining_days,
              adjusted_days = excluded.adjusted_days,
              last_calculated_at = now(),
              updated_by = excluded.updated_by,
              updated_at = now(),
              version = hr_leave_balances.version + 1
            returning *
            """
        ),
        params,
    )
    return row_to_dict(result.mappings().one())


async def adjust_leave_balance(
    session: AsyncSession,
    context: dict[str, Any],
    balance_id: str,
    request: LeaveBalanceAdjustRequest,
) -> dict[str, Any]:
    current = await get_leave_balance(session, context["tenant_id"], balance_id)
    if not current:
        raise DomainError(
            "Izin bakiyesi bulunamadi.", "LEAVE_BALANCE_NOT_FOUND", status.HTTP_404_NOT_FOUND
        )
    assert_company_scope(context, str(current["company_id"]), write=True)
    assert_version(current, request.base_version)
    payload = request.model_dump(exclude_unset=True, exclude={"base_version"})
    if "metadata_json" in payload:
        payload["metadata_json"] = json_dumps(payload.get("metadata_json"))
    if not payload:
        return current
    assignments: list[str] = []
    params = {
        "tenant_id": context["tenant_id"],
        "balance_id": balance_id,
        "user_id": context.get("user_id"),
    }
    for key, value in payload.items():
        if key == "metadata_json":
            assignments.append("metadata_json = cast(:metadata_json as jsonb)")
        else:
            assignments.append(f"{key} = :{key}")
        params[key] = value
    assignments.extend(["updated_by = :user_id", "updated_at = now()", "version = version + 1"])
    result = await session.execute(
        text(
            f"""
            update public.hr_leave_balances
            set {", ".join(assignments)}
            where tenant_id = :tenant_id
              and id = :balance_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        params,
    )
    updated = row_to_dict(result.mappings().one())
    leave_type = await _get_leave_type(session, context["tenant_id"], str(updated["leave_type_id"]))
    recalculated = await recalculate_leave_balance(
        session,
        context,
        {
            "id": updated["employee_id"],
            "company_id": updated["company_id"],
        },
        leave_type,
        period_year=int(updated["period_year"]),
    )
    await record_hr_audit_best_effort(
        session,
        context,
        action_type="leave_balance_adjusted",
        action_key="hr.leaveBalance.adjust",
        summary="Izin bakiyesi guncellendi.",
        entity_type="hr_leave_balance",
        entity_id=str(balance_id),
        old_values=current,
        new_values=recalculated,
    )
    return recalculated


async def get_leave_balance(
    session: AsyncSession,
    tenant_id: str,
    balance_id: str,
) -> dict[str, Any] | None:
    await ensure_hr_deepening_tables(session, leave_balances=True)
    result = await session.execute(
        text(
            """
            select *
            from public.hr_leave_balances
            where tenant_id = :tenant_id
              and id = :balance_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "balance_id": balance_id},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def refresh_balance_for_request(
    session: AsyncSession,
    context: dict[str, Any],
    leave_request: dict[str, Any],
) -> dict[str, Any] | None:
    employee = {
        "id": leave_request["employee_id"],
        "company_id": leave_request["company_id"],
    }
    leave_type = await _get_leave_type(
        session, context["tenant_id"], str(leave_request["leave_type_id"])
    )
    return await recalculate_leave_balance(
        session,
        context,
        employee,
        leave_type,
        period_year=int(leave_request["start_date"].year),
    )


async def _find_balance(
    session: AsyncSession,
    tenant_id: str,
    employee_id: str,
    leave_type_id: str,
    period_year: int,
) -> dict[str, Any] | None:
    result = await session.execute(
        text(
            """
            select *
            from public.hr_leave_balances
            where tenant_id = :tenant_id
              and employee_id = :employee_id
              and leave_type_id = :leave_type_id
              and period_year = :period_year
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {
            "tenant_id": tenant_id,
            "employee_id": employee_id,
            "leave_type_id": leave_type_id,
            "period_year": period_year,
        },
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def _usage_for_balance(
    session: AsyncSession,
    tenant_id: str,
    employee_id: str,
    leave_type_id: str,
    period_year: int,
) -> dict[str, float]:
    result = await session.execute(
        text(
            """
            select
              coalesce(
                sum(total_days) filter (where status in ('submitted', 'pending_approval')),
                0
              ) as pending_days,
              coalesce(sum(total_days) filter (where status = 'approved'), 0) as used_days
            from public.hr_leave_requests
            where tenant_id = :tenant_id
              and employee_id = :employee_id
              and leave_type_id = :leave_type_id
              and extract(year from start_date) = :period_year
              and coalesce(is_deleted, false) = false
            """
        ),
        {
            "tenant_id": tenant_id,
            "employee_id": employee_id,
            "leave_type_id": leave_type_id,
            "period_year": period_year,
        },
    )
    row = result.mappings().one()
    return {
        "pending_days": _as_float(row["pending_days"]),
        "used_days": _as_float(row["used_days"]),
    }


async def _get_leave_type(
    session: AsyncSession,
    tenant_id: str,
    leave_type_id: str,
) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            select *
            from public.hr_leave_types
            where tenant_id = :tenant_id
              and id = :leave_type_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "leave_type_id": leave_type_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError(
            "Izin turu bulunamadi.", "LEAVE_TYPE_NOT_FOUND", status.HTTP_404_NOT_FOUND
        )
    return row_to_dict(row)


def _as_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    return float(value)
