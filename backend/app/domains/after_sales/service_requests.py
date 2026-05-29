# ruff: noqa: E501, I001

from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.after_sales.assets import get_asset
from app.domains.after_sales.schemas import ListResult, ServiceRequestAssignRequest, ServiceRequestCloseRequest, ServiceRequestCreateRequest, ServiceRequestListQuery, ServiceRequestUpdateRequest
from app.domains.after_sales.service import assert_company_exists, assert_company_scope, assert_version, create_project_task_for_service, ensure_after_sales_tables, get_serviceable_product, json_dumps, json_list_dumps, list_meta, row_to_dict

REQUEST_SORT_COLUMNS = {
    "request_no": "request_no",
    "priority": "priority",
    "status": "status",
    "reported_at": "reported_at",
    "due_date": "due_date",
    "updated_at": "updated_at",
    "created_at": "created_at",
}
OPEN_REQUEST_STATUSES = {"new", "triage", "assigned", "scheduled", "in_progress", "waiting_customer", "waiting_parts"}


async def list_service_requests(session: AsyncSession, context: dict[str, Any], query: ServiceRequestListQuery) -> ListResult:
    await ensure_after_sales_tables(session, requests=True)
    filters = ["tenant_id = :tenant_id", "coalesce(is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "limit": query.page_size, "offset": (query.page - 1) * query.page_size}
    if query.company_id:
        assert_company_scope(context, query.company_id)
        filters.append("company_id = :company_id")
        params["company_id"] = query.company_id
    for field in ["customer_account_id", "installed_asset_id", "product_id", "status", "priority", "assigned_user_id", "assigned_employee_id", "source"]:
        value = getattr(query, field)
        if value:
            filters.append(f"{field} = :{field}")
            params[field] = value
    if query.due_from:
        filters.append("due_date >= :due_from")
        params["due_from"] = query.due_from
    if query.due_to:
        filters.append("due_date <= :due_to")
        params["due_to"] = query.due_to
    if query.search:
        filters.append("(request_no ilike :search or subject ilike :search or customer_name ilike :search)")
        params["search"] = f"%{query.search}%"
    sort = REQUEST_SORT_COLUMNS.get(query.sort, "updated_at")
    direction = "asc" if query.direction.lower() == "asc" else "desc"
    result = await session.execute(
        text(
            f"""
            select *, count(*) over() as total_count
            from public.after_sales_service_requests
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


async def get_service_request(session: AsyncSession, tenant_id: str, request_id: str) -> dict[str, Any] | None:
    await ensure_after_sales_tables(session, requests=True)
    result = await session.execute(
        text(
            """
            select *
            from public.after_sales_service_requests
            where tenant_id = :tenant_id and id = :request_id and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "request_id": request_id},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def create_service_request(session: AsyncSession, context: dict[str, Any], request: ServiceRequestCreateRequest) -> dict[str, Any]:
    await ensure_after_sales_tables(session, requests=True)
    assert_company_scope(context, request.company_id, write=True)
    await assert_company_exists(session, context, request.company_id)
    asset = await get_asset(session, context["tenant_id"], request.installed_asset_id) if request.installed_asset_id else None
    product_id = request.product_id or (str(asset["product_id"]) if asset else None)
    if product_id:
        await get_serviceable_product(session, context["tenant_id"], product_id)
    request_no = request.request_no or await next_request_no(session, context["tenant_id"])
    status_value = request.status
    if request.status == "new" and (request.assigned_user_id or request.assigned_employee_id):
        status_value = "scheduled" if request.schedule_date else "assigned"
    payload = request.model_dump(exclude={"request_no", "create_project_task"})
    payload["request_no"] = request_no
    payload["status"] = status_value
    payload["product_id"] = product_id
    result = await session.execute(
        text(
            """
            insert into public.after_sales_service_requests (
              tenant_id, company_id, customer_account_id, customer_name, installed_asset_id, product_id,
              request_no, request_type, priority, status, subject, description, reported_at,
              requested_date, due_date, contact_person, contact_phone, contact_email, location,
              assigned_user_id, assigned_employee_id, schedule_date, warranty_check_result,
              estimated_duration_minutes, required_skills, suggested_technician_user_id,
              suggested_technician_employee_id, required_parts_preview, customer_availability,
              project_task_id, source, document_files, notes, metadata_json, created_by, updated_by
            )
            values (
              :tenant_id, :company_id, :customer_account_id, :customer_name, :installed_asset_id, :product_id,
              :request_no, :request_type, :priority, :status, :subject, :description, coalesce(:reported_at, now()),
              :requested_date, :due_date, :contact_person, :contact_phone, :contact_email, :location,
              :assigned_user_id, :assigned_employee_id, :schedule_date, :warranty_check_result,
              :estimated_duration_minutes, cast(:required_skills as jsonb), :suggested_technician_user_id,
              :suggested_technician_employee_id, cast(:required_parts_preview as jsonb), :customer_availability,
              :project_task_id, :source, cast(:document_files as jsonb), :notes, cast(:metadata_json as jsonb), :user_id, :user_id
            )
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "user_id": context.get("user_id"),
            **payload,
            "required_skills": json_list_dumps(payload.get("required_skills")),
            "required_parts_preview": json_list_dumps(payload.get("required_parts_preview")),
            "document_files": json_list_dumps(payload.get("document_files")),
            "metadata_json": json_dumps(payload.get("metadata_json")),
        },
    )
    created = row_to_dict(result.mappings().one())
    if request.create_project_task:
        task = await create_project_task_for_service(
            session,
            context,
            company_id=request.company_id,
            title=f"Servis: {request.subject}",
            description=request.description,
            priority=request.priority,
            assignee_user_id=request.assigned_user_id,
            assignee_employee_id=request.assigned_employee_id,
            related_entity_type="service_request",
            related_entity_id=str(created["id"]),
            due_date=request.due_date,
        )
        if task:
            created = await set_request_task(session, context["tenant_id"], str(created["id"]), str(task["id"]))
            created["project_task"] = task
    return created


async def update_service_request(session: AsyncSession, context: dict[str, Any], request_id: str, request: ServiceRequestUpdateRequest) -> dict[str, Any]:
    current = await get_service_request(session, context["tenant_id"], request_id)
    if not current:
        raise DomainError("Servis talebi bulunamadi.", "SERVICE_REQUEST_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    assert_version(current, request.base_version)
    data = request.model_dump(exclude_unset=True, exclude={"base_version"})
    if "installed_asset_id" in data and data["installed_asset_id"]:
        await get_asset(session, context["tenant_id"], data["installed_asset_id"])
    if "product_id" in data and data["product_id"]:
        await get_serviceable_product(session, context["tenant_id"], data["product_id"])
    if not data:
        return current
    json_fields = {"document_files": json_list_dumps, "metadata_json": json_dumps, "required_skills": json_list_dumps, "required_parts_preview": json_list_dumps}
    set_parts: list[str] = []
    params = {"tenant_id": context["tenant_id"], "request_id": request_id, "user_id": context.get("user_id")}
    for key, value in data.items():
        if key in json_fields:
            set_parts.append(f"{key} = cast(:{key} as jsonb)")
            params[key] = json_fields[key](value)
        else:
            set_parts.append(f"{key} = :{key}")
            params[key] = value
    set_parts.extend(["updated_by = :user_id", "updated_at = now()", "version = version + 1"])
    result = await session.execute(
        text(
            f"""
            update public.after_sales_service_requests
            set {", ".join(set_parts)}
            where tenant_id = :tenant_id and id = :request_id and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        params,
    )
    return row_to_dict(result.mappings().one())


async def assign_service_request(session: AsyncSession, context: dict[str, Any], request_id: str, request: ServiceRequestAssignRequest) -> dict[str, Any]:
    current = await get_service_request(session, context["tenant_id"], request_id)
    if not current:
        raise DomainError("Servis talebi bulunamadi.", "SERVICE_REQUEST_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    status_value = "assigned" if str(current.get("status")) in {"new", "triage"} else current.get("status")
    result = await session.execute(
        text(
            """
            update public.after_sales_service_requests
            set assigned_user_id = :assigned_user_id,
                assigned_employee_id = :assigned_employee_id,
                status = :status,
                notes = coalesce(:notes, notes),
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :request_id
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "request_id": request_id,
            "assigned_user_id": request.assigned_user_id,
            "assigned_employee_id": request.assigned_employee_id,
            "status": status_value,
            "notes": request.notes,
            "user_id": context.get("user_id"),
        },
    )
    updated = row_to_dict(result.mappings().one())
    if request.create_project_task and not updated.get("project_task_id"):
        task = await create_project_task_for_service(
            session,
            context,
            company_id=str(updated["company_id"]),
            title=f"Servis: {updated['subject']}",
            description=updated.get("description"),
            priority=str(updated.get("priority") or "medium"),
            assignee_user_id=request.assigned_user_id,
            assignee_employee_id=request.assigned_employee_id,
            related_entity_type="service_request",
            related_entity_id=request_id,
            due_date=updated.get("due_date"),
        )
        if task:
            updated = await set_request_task(session, context["tenant_id"], request_id, str(task["id"]))
            updated["project_task"] = task
    return updated


async def close_service_request(session: AsyncSession, context: dict[str, Any], request_id: str, request: ServiceRequestCloseRequest) -> dict[str, Any]:
    current = await get_service_request(session, context["tenant_id"], request_id)
    if not current:
        raise DomainError("Servis talebi bulunamadi.", "SERVICE_REQUEST_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    result = await session.execute(
        text(
            """
            update public.after_sales_service_requests
            set status = :status, notes = coalesce(:notes, notes), updated_by = :user_id, updated_at = now(), version = version + 1
            where tenant_id = :tenant_id and id = :request_id
            returning *
            """
        ),
        {"tenant_id": context["tenant_id"], "request_id": request_id, "status": request.status, "notes": request.notes, "user_id": context.get("user_id")},
    )
    return row_to_dict(result.mappings().one())


async def set_request_task(session: AsyncSession, tenant_id: str, request_id: str, task_id: str) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            update public.after_sales_service_requests
            set project_task_id = :task_id, updated_at = now(), version = version + 1
            where tenant_id = :tenant_id and id = :request_id
            returning *
            """
        ),
        {"tenant_id": tenant_id, "request_id": request_id, "task_id": task_id},
    )
    return row_to_dict(result.mappings().one())


async def next_request_no(session: AsyncSession, tenant_id: str) -> str:
    result = await session.execute(text("select count(*) + 1 as next_no from public.after_sales_service_requests where tenant_id = :tenant_id"), {"tenant_id": tenant_id})
    return f"SR-{int(result.mappings().one()['next_no']):06d}"
