# ruff: noqa: E501, I001

from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.after_sales.schemas import (
    FieldAssignmentListQuery,
    FieldAssignmentRejectRequest,
    FieldAssignmentStatusRequest,
    ListResult,
    ServiceRecordCreateRequest,
    ServiceRequestAssignTechnicianRequest,
)
from app.domains.after_sales.service import (
    assert_company_scope,
    create_notification_best_effort,
    create_project_task_for_service,
    ensure_after_sales_deepening_tables,
    ensure_after_sales_tables,
    list_meta,
    row_to_dict,
)
from app.domains.after_sales.service_records import create_service_record, get_service_record
from app.domains.after_sales.service_requests import get_service_request

ASSIGNMENT_SORT_COLUMNS = {
    "scheduled_start": "a.scheduled_start",
    "status": "a.status",
    "assigned_at": "a.assigned_at",
    "updated_at": "a.updated_at",
    "created_at": "a.created_at",
}


async def list_field_assignments(session: AsyncSession, context: dict[str, Any], query: FieldAssignmentListQuery) -> ListResult:
    await ensure_after_sales_deepening_tables(session, assignments=True)
    filters = ["a.tenant_id = :tenant_id", "coalesce(a.is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "limit": query.page_size, "offset": (query.page - 1) * query.page_size}
    if query.company_id:
        assert_company_scope(context, query.company_id)
        filters.append("a.company_id = :company_id")
        params["company_id"] = query.company_id
    for field in ["service_request_id", "service_record_id", "installed_asset_id", "technician_user_id", "technician_employee_id", "status"]:
        value = getattr(query, field)
        if value:
            filters.append(f"a.{field} = :{field}")
            params[field] = value
    if query.mine and context.get("user_id"):
        filters.append("a.technician_user_id = :current_user_id")
        params["current_user_id"] = context["user_id"]
    if query.scheduled_from:
        filters.append("a.scheduled_start >= :scheduled_from")
        params["scheduled_from"] = query.scheduled_from
    if query.scheduled_to:
        filters.append("a.scheduled_start <= :scheduled_to")
        params["scheduled_to"] = query.scheduled_to
    sort = ASSIGNMENT_SORT_COLUMNS.get(query.sort, "a.scheduled_start")
    direction = "desc" if query.direction.lower() == "desc" else "asc"
    result = await session.execute(
        text(
            f"""
            select a.*,
              r.request_no, r.subject, r.priority, r.status as service_request_status,
              r.customer_name, r.location, r.due_date,
              s.service_no, s.status as service_record_status,
              asset.product_name, asset.serial_no, asset.address, asset.city, asset.district
            from public.after_sales_field_assignments a
            left join public.after_sales_service_requests r on r.tenant_id = a.tenant_id and r.id = a.service_request_id
            left join public.after_sales_service_records s on s.tenant_id = a.tenant_id and s.id = a.service_record_id
            left join public.after_sales_installed_assets asset on asset.tenant_id = a.tenant_id and asset.id = a.installed_asset_id
            where {" and ".join(filters)}
            order by {sort} {direction} nulls last, a.id desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    rows = [row_to_dict(row) for row in result.mappings()]
    count_result = await session.execute(text(f"select count(*) from public.after_sales_field_assignments a where {' and '.join(filters)}"), params)
    total = int(count_result.scalar_one() or 0)
    return ListResult(data=rows, meta=list_meta(query.page, query.page_size, total))


async def get_field_assignment(session: AsyncSession, tenant_id: str, assignment_id: str) -> dict[str, Any] | None:
    await ensure_after_sales_deepening_tables(session, assignments=True)
    result = await session.execute(
        text(
            """
            select a.*,
              r.request_no, r.subject, r.priority, r.customer_name, r.description,
              r.location, r.contact_person, r.contact_phone, r.contact_email, r.due_date,
              asset.product_name, asset.product_code, asset.serial_no, asset.asset_tag,
              asset.warranty_start_date, asset.warranty_end_date, asset.warranty_status,
              asset.address, asset.city, asset.district
            from public.after_sales_field_assignments a
            left join public.after_sales_service_requests r on r.tenant_id = a.tenant_id and r.id = a.service_request_id
            left join public.after_sales_installed_assets asset on asset.tenant_id = a.tenant_id and asset.id = a.installed_asset_id
            where a.tenant_id = :tenant_id and a.id = :assignment_id and coalesce(a.is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "assignment_id": assignment_id},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def assign_technician(session: AsyncSession, context: dict[str, Any], request_id: str, request: ServiceRequestAssignTechnicianRequest) -> dict[str, Any]:
    await ensure_after_sales_tables(session, requests=True, records=True)
    await ensure_after_sales_deepening_tables(session, assignments=True)
    if not request.technician_user_id and not request.technician_employee_id:
        raise DomainError("Teknisyen user veya calisan bilgisi zorunludur.", "TECHNICIAN_REQUIRED", status.HTTP_422_UNPROCESSABLE_ENTITY)
    service_request = await get_service_request(session, context["tenant_id"], request_id)
    if not service_request:
        raise DomainError("Servis talebi bulunamadi.", "SERVICE_REQUEST_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    assert_company_scope(context, str(service_request["company_id"]), write=True)
    status_value = "scheduled" if request.scheduled_start else "assigned"
    await session.execute(
        text(
            """
            update public.after_sales_service_requests
            set assigned_user_id = coalesce(:technician_user_id, assigned_user_id),
                assigned_employee_id = coalesce(:technician_employee_id, assigned_employee_id),
                suggested_technician_user_id = coalesce(:technician_user_id, suggested_technician_user_id),
                suggested_technician_employee_id = coalesce(:technician_employee_id, suggested_technician_employee_id),
                schedule_date = coalesce(:scheduled_start, schedule_date),
                status = :status,
                notes = coalesce(:notes, notes),
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :request_id
            """
        ),
        {"tenant_id": context["tenant_id"], "request_id": request_id, "technician_user_id": request.technician_user_id, "technician_employee_id": request.technician_employee_id, "scheduled_start": request.scheduled_start, "status": status_value, "notes": request.notes, "user_id": context.get("user_id")},
    )
    inserted = await session.execute(
        text(
            """
            insert into public.after_sales_field_assignments (
              tenant_id, company_id, service_request_id, installed_asset_id,
              technician_user_id, technician_employee_id, assigned_by,
              scheduled_start, scheduled_end, status, notes, created_by, updated_by
            )
            values (
              :tenant_id, :company_id, :service_request_id, :installed_asset_id,
              :technician_user_id, :technician_employee_id, :assigned_by,
              :scheduled_start, :scheduled_end, 'assigned', :notes, :assigned_by, :assigned_by
            )
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "company_id": service_request["company_id"],
            "service_request_id": request_id,
            "installed_asset_id": service_request.get("installed_asset_id"),
            "technician_user_id": request.technician_user_id,
            "technician_employee_id": request.technician_employee_id,
            "assigned_by": context.get("user_id"),
            "scheduled_start": request.scheduled_start,
            "scheduled_end": request.scheduled_end,
            "notes": request.notes,
        },
    )
    assignment = row_to_dict(inserted.mappings().one())
    if request.create_project_task:
        task = await create_project_task_for_service(
            session,
            context,
            company_id=str(service_request["company_id"]),
            title=f"Saha servis: {service_request['subject']}",
            description=service_request.get("description") or request.notes,
            priority=str(service_request.get("priority") or "medium"),
            assignee_user_id=request.technician_user_id,
            assignee_employee_id=request.technician_employee_id,
            related_entity_type="field_assignment",
            related_entity_id=str(assignment["id"]),
            due_date=request.scheduled_start.date() if request.scheduled_start else service_request.get("due_date"),
        )
        if task:
            assignment["project_task"] = task
    await create_notification_best_effort(
        session,
        context,
        user_id=request.technician_user_id,
        company_id=str(service_request["company_id"]),
        notification_type="field_assignment_assigned",
        title="Saha servis gorevi atandi",
        message=f"{service_request.get('customer_name') or 'Musteri'} icin {service_request.get('subject') or 'servis'} gorevi atandi.",
        priority="high" if service_request.get("priority") in {"high", "urgent"} else "normal",
        severity="warning" if service_request.get("priority") == "urgent" else "info",
        action_key="afterSales.fieldAssignment.open",
        action_label="Gorevi Ac",
        target_page=f"/app/satis-sonrasi/mobil-servis/{assignment['id']}",
        related_entity_type="field_assignment",
        related_entity_id=str(assignment["id"]),
        related_record_label=service_request.get("request_no"),
        due_at=request.scheduled_start,
    )
    return assignment


async def accept_field_assignment(session: AsyncSession, context: dict[str, Any], assignment_id: str) -> dict[str, Any]:
    return await _update_assignment_status(session, context, assignment_id, "accepted", None, None)


async def reject_field_assignment(session: AsyncSession, context: dict[str, Any], assignment_id: str, request: FieldAssignmentRejectRequest) -> dict[str, Any]:
    return await _update_assignment_status(session, context, assignment_id, "rejected", request.rejection_reason, None)


async def set_field_assignment_status(session: AsyncSession, context: dict[str, Any], assignment_id: str, request: FieldAssignmentStatusRequest) -> dict[str, Any]:
    service_record_id = request.service_record_id
    if request.status == "in_progress":
        assignment = await get_field_assignment(session, context["tenant_id"], assignment_id)
        if not assignment:
            raise DomainError("Saha gorevi bulunamadi.", "FIELD_ASSIGNMENT_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        service_record_id = service_record_id or assignment.get("service_record_id")
        if not service_record_id:
            record = await ensure_service_record_for_assignment(session, context, assignment)
            service_record_id = str(record["id"])
    updated = await _update_assignment_status(session, context, assignment_id, request.status, None, service_record_id, notes=request.notes)
    return updated


async def ensure_service_record_for_assignment(session: AsyncSession, context: dict[str, Any], assignment: dict[str, Any]) -> dict[str, Any]:
    if assignment.get("service_record_id"):
        existing = await get_service_record(session, context["tenant_id"], str(assignment["service_record_id"]))
        if existing:
            return existing
    record = await create_service_record(
        session,
        context,
        ServiceRecordCreateRequest(
            company_id=str(assignment["company_id"]),
            service_request_id=str(assignment["service_request_id"]),
            installed_asset_id=str(assignment["installed_asset_id"]) if assignment.get("installed_asset_id") else None,
            service_type="maintenance",
            service_date=date.today(),
            technician_user_id=str(assignment["technician_user_id"]) if assignment.get("technician_user_id") else None,
            technician_employee_id=str(assignment["technician_employee_id"]) if assignment.get("technician_employee_id") else None,
            status="planned",
            fault_description=assignment.get("description"),
        ),
    )
    await session.execute(
        text(
            """
            update public.after_sales_field_assignments
            set service_record_id = :service_record_id, updated_at = now(), version = version + 1
            where tenant_id = :tenant_id and id = :assignment_id
            """
        ),
        {"tenant_id": context["tenant_id"], "assignment_id": assignment["id"], "service_record_id": record["id"]},
    )
    return record


async def complete_assignments_for_service_record(session: AsyncSession, context: dict[str, Any], service_record: dict[str, Any]) -> None:
    if not service_record.get("id"):
        return
    if not await _assignments_table_exists(session):
        return
    await session.execute(
        text(
            """
            update public.after_sales_field_assignments
            set status = 'completed',
                service_record_id = coalesce(service_record_id, :service_record_id),
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id
              and coalesce(is_deleted, false) = false
              and status <> 'cancelled'
              and (
                service_record_id = :service_record_id
                or (:service_request_id is not null and service_request_id = :service_request_id)
              )
            """
        ),
        {"tenant_id": context["tenant_id"], "service_record_id": service_record.get("id"), "service_request_id": service_record.get("service_request_id"), "user_id": context.get("user_id")},
    )


async def _update_assignment_status(session: AsyncSession, context: dict[str, Any], assignment_id: str, next_status: str, rejection_reason: str | None, service_record_id: str | None, *, notes: str | None = None) -> dict[str, Any]:
    assignment = await get_field_assignment(session, context["tenant_id"], assignment_id)
    if not assignment:
        raise DomainError("Saha gorevi bulunamadi.", "FIELD_ASSIGNMENT_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    if assignment.get("technician_user_id") and context.get("user_id") and str(assignment["technician_user_id"]) != str(context["user_id"]):
        permissions = set(context.get("permissions") or [])
        if not permissions.intersection({"__eden_demo_allow_all__", "afterSales.fieldServiceAssign", "afterSales.admin"}):
            raise DomainError("Bu saha gorevine erisim yetkiniz bulunmuyor.", "FIELD_ASSIGNMENT_SCOPE_DENIED", status.HTTP_403_FORBIDDEN)
    result = await session.execute(
        text(
            """
            update public.after_sales_field_assignments
            set status = :status,
                rejection_reason = coalesce(:rejection_reason, rejection_reason),
                service_record_id = coalesce(:service_record_id, service_record_id),
                notes = coalesce(:notes, notes),
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :assignment_id and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        {"tenant_id": context["tenant_id"], "assignment_id": assignment_id, "status": next_status, "rejection_reason": rejection_reason, "service_record_id": service_record_id, "notes": notes, "user_id": context.get("user_id")},
    )
    updated = row_to_dict(result.mappings().one())
    if next_status == "in_progress":
        await session.execute(
            text(
                """
                update public.after_sales_service_requests
                set status = 'in_progress', updated_by = :user_id, updated_at = now(), version = version + 1
                where tenant_id = :tenant_id and id = :request_id
                """
            ),
            {"tenant_id": context["tenant_id"], "request_id": updated["service_request_id"], "user_id": context.get("user_id")},
        )
    return updated


async def _assignments_table_exists(session: AsyncSession) -> bool:
    from app.domains.operations.service import table_exists

    return await table_exists(session, "public.after_sales_field_assignments")
