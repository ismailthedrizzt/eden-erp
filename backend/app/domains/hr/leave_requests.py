from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.hr.employment import require_employee
from app.domains.hr.leave_balances import recalculate_leave_balance, refresh_balance_for_request
from app.domains.hr.leave_types import get_leave_type
from app.domains.hr.schemas import (
    LeaveCancelRequest,
    LeaveRejectRequest,
    LeaveRequestCreateRequest,
    LeaveRequestListQuery,
    LeaveRequestUpdateRequest,
    ListResult,
)
from app.domains.hr.service import (
    assert_company_scope,
    assert_version,
    create_hr_notification_best_effort,
    ensure_hr_deepening_tables,
    list_meta,
    record_hr_audit_best_effort,
    row_to_dict,
)

LEAVE_ACTIVE_STATUSES = {"submitted", "pending_approval", "approved"}
LEAVE_MUTABLE_STATUSES = {"draft"}
LEAVE_SORT_COLUMNS = {
    "request_no": "lr.request_no",
    "start_date": "lr.start_date",
    "end_date": "lr.end_date",
    "status": "lr.status",
    "created_at": "lr.created_at",
    "updated_at": "lr.updated_at",
}


async def list_leave_requests(
    session: AsyncSession,
    context: dict[str, Any],
    query: LeaveRequestListQuery,
) -> ListResult:
    await ensure_hr_deepening_tables(
        session, leave_requests=True, leave_types=True, leave_balances=True
    )
    filters = ["lr.tenant_id = :tenant_id", "coalesce(lr.is_deleted, false) = false"]
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "limit": query.page_size,
        "offset": (query.page - 1) * query.page_size,
    }
    if query.company_id:
        assert_company_scope(context, query.company_id)
        filters.append("lr.company_id = :company_id")
        params["company_id"] = query.company_id
    elif context.get("company_scope_ids"):
        filters.append("lr.company_id = any(cast(:company_scope_ids as uuid[]))")
        params["company_scope_ids"] = context["company_scope_ids"]
    if query.employee_id:
        filters.append("lr.employee_id = :employee_id")
        params["employee_id"] = query.employee_id
    if query.leave_type_id:
        filters.append("lr.leave_type_id = :leave_type_id")
        params["leave_type_id"] = query.leave_type_id
    if query.status:
        filters.append("lr.status = :status")
        params["status"] = query.status
    if query.approver_id:
        filters.append("lr.approver_id = :approver_id")
        params["approver_id"] = query.approver_id
    if query.pending_approval:
        filters.append("lr.status = 'pending_approval'")
    if query.mine and context.get("user_id"):
        filters.append("lr.requested_by = :mine_user_id")
        params["mine_user_id"] = context["user_id"]
    if query.date_from:
        filters.append("lr.end_date >= :date_from")
        params["date_from"] = query.date_from
    if query.date_to:
        filters.append("lr.start_date <= :date_to")
        params["date_to"] = query.date_to
    if query.search:
        filters.append(
            "("
            "lr.request_no ilike :search "
            "or e.full_name ilike :search "
            "or lt.leave_type_name ilike :search"
            ")"
        )
        params["search"] = f"%{query.search}%"
    sort = LEAVE_SORT_COLUMNS.get(query.sort, "lr.created_at")
    direction = "asc" if query.direction.lower() == "asc" else "desc"
    result = await session.execute(
        text(
            f"""
            select lr.*, e.full_name as employee_name, e.employee_no,
                   lt.leave_type_name, lt.leave_type_key, lt.category, lt.paid,
                   b.remaining_days as balance_remaining_days,
                   count(*) over() as total_count
            from public.hr_leave_requests lr
            join public.hr_employees e on e.tenant_id = lr.tenant_id and e.id = lr.employee_id
            join public.hr_leave_types lt
              on lt.tenant_id = lr.tenant_id
             and lt.id = lr.leave_type_id
            left join public.hr_leave_balances b
              on b.tenant_id = lr.tenant_id
             and b.employee_id = lr.employee_id
             and b.leave_type_id = lr.leave_type_id
             and b.period_year = extract(year from lr.start_date)::int
             and coalesce(b.is_deleted, false) = false
            where {" and ".join(filters)}
            order by {sort} {direction}, lr.id desc
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


async def get_leave_request(
    session: AsyncSession,
    tenant_id: str,
    leave_request_id: str,
) -> dict[str, Any] | None:
    await ensure_hr_deepening_tables(session, leave_requests=True)
    result = await session.execute(
        text(
            """
            select lr.*, e.full_name as employee_name, e.employee_no,
                   lt.leave_type_name, lt.leave_type_key, lt.category, lt.paid
            from public.hr_leave_requests lr
            join public.hr_employees e on e.tenant_id = lr.tenant_id and e.id = lr.employee_id
            join public.hr_leave_types lt
              on lt.tenant_id = lr.tenant_id
             and lt.id = lr.leave_type_id
            where lr.tenant_id = :tenant_id
              and lr.id = :leave_request_id
              and coalesce(lr.is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "leave_request_id": leave_request_id},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def create_leave_request(
    session: AsyncSession,
    context: dict[str, Any],
    request: LeaveRequestCreateRequest,
) -> dict[str, Any]:
    await ensure_hr_deepening_tables(
        session, leave_requests=True, leave_types=True, leave_balances=True
    )
    employee = await _require_active_employee(session, context, request.employee_id)
    leave_type = await _require_active_leave_type(
        session, context, request.leave_type_id, employee["company_id"]
    )
    await _assert_leave_dates_available(
        session,
        context,
        str(employee["id"]),
        request.start_date,
        request.end_date,
    )
    if request.status != "draft":
        await _assert_leave_balance_available(
            session,
            context,
            employee,
            leave_type,
            float(request.total_days or 0),
            period_year=request.start_date.year,
        )
    request_no = await _next_request_no(session, context["tenant_id"])
    result = await session.execute(
        text(
            """
            insert into public.hr_leave_requests (
              tenant_id, company_id, employee_id, leave_type_id, request_no, start_date,
              end_date, start_half_day, end_half_day, total_days, reason, status,
              requested_by, approver_id, document_required, document_id, notes,
              created_by, updated_by
            )
            values (
              :tenant_id, :company_id, :employee_id, :leave_type_id, :request_no,
              :start_date, :end_date, :start_half_day, :end_half_day, :total_days,
              :reason, :status, :requested_by, :approver_id, :document_required,
              :document_id, :notes, :user_id, :user_id
            )
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "company_id": employee["company_id"],
            "request_no": request_no,
            "requested_by": context.get("user_id"),
            "document_required": leave_type.get("requires_document") is True,
            "user_id": context.get("user_id"),
            **request.model_dump(),
        },
    )
    row = row_to_dict(result.mappings().one())
    await refresh_balance_for_request(session, context, row)
    await record_hr_audit_best_effort(
        session,
        context,
        action_type="leave_requested",
        action_key="hr.leaveRequest.create",
        summary="Izin talebi olusturuldu.",
        entity_type="hr_leave_request",
        entity_id=str(row["id"]),
        new_values=row,
    )
    return _with_document_warning(row)


async def update_leave_request(
    session: AsyncSession,
    context: dict[str, Any],
    leave_request_id: str,
    request: LeaveRequestUpdateRequest,
) -> dict[str, Any]:
    current = await _require_leave_request(session, context, leave_request_id, write=True)
    if current["status"] not in LEAVE_MUTABLE_STATUSES:
        raise DomainError(
            "Yalnizca taslak izin talepleri duzenlenebilir.",
            "LEAVE_REQUEST_NOT_MUTABLE",
            status.HTTP_409_CONFLICT,
        )
    assert_version(current, request.base_version)
    payload = request.model_dump(exclude_unset=True, exclude={"base_version"})
    if not payload:
        return current
    next_values = {**current, **payload}
    if next_values["start_date"] > next_values["end_date"]:
        raise DomainError(
            "Izin baslangici bitisten sonra olamaz.",
            "LEAVE_DATE_RANGE_INVALID",
            status.HTTP_400_BAD_REQUEST,
        )
    await _assert_leave_dates_available(
        session,
        context,
        str(current["employee_id"]),
        next_values["start_date"],
        next_values["end_date"],
        exclude_id=leave_request_id,
    )
    assignments = [f"{key} = :{key}" for key in payload]
    assignments.extend(["updated_by = :user_id", "updated_at = now()", "version = version + 1"])
    result = await session.execute(
        text(
            f"""
            update public.hr_leave_requests
            set {", ".join(assignments)}
            where tenant_id = :tenant_id
              and id = :leave_request_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "leave_request_id": leave_request_id,
            "user_id": context.get("user_id"),
            **payload,
        },
    )
    updated = row_to_dict(result.mappings().one())
    await refresh_balance_for_request(session, context, updated)
    return updated


async def submit_leave_request(
    session: AsyncSession,
    context: dict[str, Any],
    leave_request_id: str,
) -> dict[str, Any]:
    current = await _require_leave_request(session, context, leave_request_id, write=True)
    if current["status"] not in {"draft", "submitted"}:
        raise DomainError(
            "Bu izin talebi gonderilemez.",
            "LEAVE_REQUEST_SUBMIT_INVALID_STATUS",
            status.HTTP_409_CONFLICT,
        )
    if current.get("document_required") and not current.get("document_id"):
        raise DomainError(
            "Bu izin turu icin belge yuklenmelidir.",
            "LEAVE_DOCUMENT_REQUIRED",
            status.HTTP_409_CONFLICT,
        )
    employee = await _require_active_employee(session, context, str(current["employee_id"]))
    leave_type = await _require_active_leave_type(
        session, context, str(current["leave_type_id"]), employee["company_id"]
    )
    await _assert_leave_dates_available(
        session,
        context,
        str(current["employee_id"]),
        current["start_date"],
        current["end_date"],
        exclude_id=leave_request_id,
    )
    await _assert_leave_balance_available(
        session,
        context,
        employee,
        leave_type,
        float(current["total_days"] or 0),
        period_year=current["start_date"].year,
    )
    next_status = "pending_approval" if leave_type.get("requires_approval") else "approved"
    result = await session.execute(
        text(
            """
            update public.hr_leave_requests
            set status = :status,
                approved_by = case when :status = 'approved' then :user_id else approved_by end,
                approved_at = case when :status = 'approved' then now() else approved_at end,
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id
              and id = :leave_request_id
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "leave_request_id": leave_request_id,
            "status": next_status,
            "user_id": context.get("user_id"),
        },
    )
    updated = row_to_dict(result.mappings().one())
    await refresh_balance_for_request(session, context, updated)
    if next_status == "approved":
        await _sync_attendance_for_approved_leave(session, context, updated, leave_type)
    await _notify_leave_submit(session, context, updated)
    await record_hr_audit_best_effort(
        session,
        context,
        action_type="leave_submitted",
        action_key="hr.leaveRequest.submit",
        summary="Izin talebi onaya gonderildi.",
        entity_type="hr_leave_request",
        entity_id=str(updated["id"]),
        old_values=current,
        new_values=updated,
    )
    return updated


async def approve_leave_request(
    session: AsyncSession,
    context: dict[str, Any],
    leave_request_id: str,
) -> dict[str, Any]:
    current = await _require_leave_request(session, context, leave_request_id, write=True)
    if current["status"] not in {"submitted", "pending_approval"}:
        raise DomainError(
            "Yalnizca onay bekleyen izin talepleri onaylanabilir.",
            "LEAVE_APPROVE_INVALID_STATUS",
            status.HTTP_409_CONFLICT,
        )
    employee = await _require_active_employee(session, context, str(current["employee_id"]))
    leave_type = await _require_active_leave_type(
        session, context, str(current["leave_type_id"]), employee["company_id"]
    )
    if current.get("document_required") and not current.get("document_id"):
        raise DomainError(
            "Bu izin turu icin belge yuklenmelidir.",
            "LEAVE_DOCUMENT_REQUIRED",
            status.HTTP_409_CONFLICT,
        )
    await _assert_leave_balance_available(
        session,
        context,
        employee,
        leave_type,
        float(current["total_days"] or 0),
        period_year=current["start_date"].year,
    )
    result = await session.execute(
        text(
            """
            update public.hr_leave_requests
            set status = 'approved',
                approved_by = :user_id,
                approved_at = now(),
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id
              and id = :leave_request_id
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "leave_request_id": leave_request_id,
            "user_id": context.get("user_id"),
        },
    )
    updated = row_to_dict(result.mappings().one())
    await refresh_balance_for_request(session, context, updated)
    await _sync_attendance_for_approved_leave(session, context, updated, leave_type)
    await _notify_leave_decision(session, context, updated, approved=True)
    await record_hr_audit_best_effort(
        session,
        context,
        action_type="leave_approved",
        action_key="hr.leaveRequest.approve",
        summary="Izin talebi onaylandi.",
        entity_type="hr_leave_request",
        entity_id=str(updated["id"]),
        old_values=current,
        new_values=updated,
    )
    return updated


async def reject_leave_request(
    session: AsyncSession,
    context: dict[str, Any],
    leave_request_id: str,
    request: LeaveRejectRequest,
) -> dict[str, Any]:
    current = await _require_leave_request(session, context, leave_request_id, write=True)
    if current["status"] in {"approved", "cancelled"}:
        raise DomainError(
            "Onaylanmis veya iptal izin reddedilemez.",
            "LEAVE_REJECT_INVALID_STATUS",
            status.HTTP_409_CONFLICT,
        )
    result = await session.execute(
        text(
            """
            update public.hr_leave_requests
            set status = 'rejected',
                rejected_by = :user_id,
                rejected_at = now(),
                rejection_reason = :rejection_reason,
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id
              and id = :leave_request_id
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "leave_request_id": leave_request_id,
            "user_id": context.get("user_id"),
            "rejection_reason": request.rejection_reason,
        },
    )
    updated = row_to_dict(result.mappings().one())
    await refresh_balance_for_request(session, context, updated)
    await _notify_leave_decision(session, context, updated, approved=False)
    await record_hr_audit_best_effort(
        session,
        context,
        action_type="leave_rejected",
        action_key="hr.leaveRequest.reject",
        summary="Izin talebi reddedildi.",
        entity_type="hr_leave_request",
        entity_id=str(updated["id"]),
        old_values=current,
        new_values=updated,
    )
    return updated


async def cancel_leave_request(
    session: AsyncSession,
    context: dict[str, Any],
    leave_request_id: str,
    request: LeaveCancelRequest,
) -> dict[str, Any]:
    current = await _require_leave_request(session, context, leave_request_id, write=True)
    if current["status"] in {"rejected", "cancelled"}:
        return current
    result = await session.execute(
        text(
            """
            update public.hr_leave_requests
            set status = 'cancelled',
                notes = coalesce(:notes, notes),
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id
              and id = :leave_request_id
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "leave_request_id": leave_request_id,
            "user_id": context.get("user_id"),
            "notes": request.notes,
        },
    )
    updated = row_to_dict(result.mappings().one())
    await refresh_balance_for_request(session, context, updated)
    await record_hr_audit_best_effort(
        session,
        context,
        action_type="leave_cancelled",
        action_key="hr.leaveRequest.cancel",
        summary="Izin talebi iptal edildi.",
        entity_type="hr_leave_request",
        entity_id=str(updated["id"]),
        old_values=current,
        new_values=updated,
    )
    return updated


async def _require_leave_request(
    session: AsyncSession,
    context: dict[str, Any],
    leave_request_id: str,
    *,
    write: bool = False,
) -> dict[str, Any]:
    row = await get_leave_request(session, context["tenant_id"], leave_request_id)
    if not row:
        raise DomainError(
            "Izin talebi bulunamadi.", "LEAVE_REQUEST_NOT_FOUND", status.HTTP_404_NOT_FOUND
        )
    assert_company_scope(context, str(row["company_id"]), write=write)
    return row


async def _require_active_employee(
    session: AsyncSession,
    context: dict[str, Any],
    employee_id: str,
) -> dict[str, Any]:
    employee = await require_employee(session, context, employee_id, write=True)
    if employee.get("employment_status") != "active":
        raise DomainError(
            "Izin talebi yalnizca aktif calisanlar icin olusturulabilir.",
            "LEAVE_EMPLOYEE_NOT_ACTIVE",
            status.HTTP_409_CONFLICT,
        )
    return employee


async def _require_active_leave_type(
    session: AsyncSession,
    context: dict[str, Any],
    leave_type_id: str,
    company_id: Any,
) -> dict[str, Any]:
    leave_type = await get_leave_type(session, context["tenant_id"], leave_type_id)
    if not leave_type or not leave_type.get("active"):
        raise DomainError(
            "Aktif izin turu bulunamadi.", "LEAVE_TYPE_NOT_ACTIVE", status.HTTP_404_NOT_FOUND
        )
    if leave_type.get("company_id") and str(leave_type["company_id"]) != str(company_id):
        raise DomainError(
            "Izin turu calisan sirketiyle uyumlu degil.",
            "LEAVE_TYPE_COMPANY_MISMATCH",
            status.HTTP_409_CONFLICT,
        )
    return leave_type


async def _assert_leave_dates_available(
    session: AsyncSession,
    context: dict[str, Any],
    employee_id: str,
    start_date: Any,
    end_date: Any,
    *,
    exclude_id: str | None = None,
) -> None:
    exclude = "and id <> :exclude_id" if exclude_id else ""
    result = await session.execute(
        text(
            f"""
            select id, request_no
            from public.hr_leave_requests
            where tenant_id = :tenant_id
              and employee_id = :employee_id
              and status in ('submitted', 'pending_approval', 'approved')
              and coalesce(is_deleted, false) = false
              and start_date <= :end_date
              and end_date >= :start_date
              {exclude}
            limit 1
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "employee_id": employee_id,
            "start_date": start_date,
            "end_date": end_date,
            "exclude_id": exclude_id,
        },
    )
    row = result.mappings().one_or_none()
    if row:
        raise DomainError(
            "Ayni tarih araliginda aktif izin talebi var.",
            "LEAVE_REQUEST_OVERLAP",
            status.HTTP_409_CONFLICT,
            {"request_no": row["request_no"]},
        )


async def _assert_leave_balance_available(
    session: AsyncSession,
    context: dict[str, Any],
    employee: dict[str, Any],
    leave_type: dict[str, Any],
    requested_days: float,
    *,
    period_year: int,
) -> None:
    if leave_type.get("negative_balance_allowed"):
        return
    balance = await recalculate_leave_balance(
        session,
        context,
        employee,
        leave_type,
        period_year=period_year,
    )
    remaining = float(balance.get("remaining_days") or 0)
    if remaining < requested_days:
        raise DomainError(
            "Izin bakiyesi yetersiz.",
            "LEAVE_BALANCE_INSUFFICIENT",
            status.HTTP_409_CONFLICT,
            {"remaining_days": remaining, "requested_days": requested_days},
        )


async def _sync_attendance_for_approved_leave(
    session: AsyncSession,
    context: dict[str, Any],
    leave_request: dict[str, Any],
    leave_type: dict[str, Any],
) -> None:
    if not leave_type.get("affects_attendance"):
        return
    from app.domains.hr.attendance import create_attendance_for_leave

    await create_attendance_for_leave(session, context, leave_request, leave_type)


async def _notify_leave_submit(
    session: AsyncSession,
    context: dict[str, Any],
    leave_request: dict[str, Any],
) -> None:
    await create_hr_notification_best_effort(
        session,
        context,
        user_id=str(leave_request.get("approver_id")) if leave_request.get("approver_id") else None,
        company_id=str(leave_request.get("company_id"))
        if leave_request.get("company_id")
        else None,
        notification_type="leave_pending_approval",
        title="Izin talebi onay bekliyor",
        message=f"{leave_request.get('request_no')} numarali izin talebi onay bekliyor.",
        priority="high",
        severity="warning",
        action_key="hr.leave.approve",
        action_label="Izinleri Ac",
        target_page="/app/ik/izinler",
        related_entity_type="leave_request",
        related_entity_id=str(leave_request.get("id")),
        related_record_label=str(leave_request.get("request_no")),
    )


async def _notify_leave_decision(
    session: AsyncSession,
    context: dict[str, Any],
    leave_request: dict[str, Any],
    *,
    approved: bool,
) -> None:
    await create_hr_notification_best_effort(
        session,
        context,
        user_id=str(leave_request.get("requested_by"))
        if leave_request.get("requested_by")
        else None,
        company_id=str(leave_request.get("company_id"))
        if leave_request.get("company_id")
        else None,
        notification_type="leave_approved" if approved else "leave_rejected",
        title="Izin onaylandi" if approved else "Izin reddedildi",
        message=(
            f"{leave_request.get('request_no')} numarali izin "
            f"{'onaylandi' if approved else 'reddedildi'}."
        ),
        priority="normal",
        severity="success" if approved else "warning",
        target_page="/app/ik/izinler",
        related_entity_type="leave_request",
        related_entity_id=str(leave_request.get("id")),
        related_record_label=str(leave_request.get("request_no")),
    )


async def _next_request_no(session: AsyncSession, tenant_id: str) -> str:
    result = await session.execute(
        text(
            """
            select count(*) + 1 as next_no
            from public.hr_leave_requests
            where tenant_id = :tenant_id
            """
        ),
        {"tenant_id": tenant_id},
    )
    return f"LV-{int(result.mappings().one()['next_no']):06d}"


def _with_document_warning(row: dict[str, Any]) -> dict[str, Any]:
    if row.get("document_required") and not row.get("document_id"):
        row["warnings"] = ["Bu izin turu belge gerektirir. Gondermeden once belge baglayin."]
    return row
