# ruff: noqa: E501, I001

from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.after_sales.assets import get_asset
from app.domains.after_sales.schemas import AfterSalesSummary, ListResult, ServiceRecordCompleteRequest, ServiceRecordCreateRequest, ServiceRecordListQuery, ServiceRecordUpdateRequest
from app.domains.after_sales.service import assert_company_exists, assert_company_scope, assert_version, create_project_task_for_service, ensure_after_sales_tables, get_serviceable_product, json_dumps, json_list_dumps, list_meta, row_to_dict
from app.domains.after_sales.service_requests import get_service_request

RECORD_SORT_COLUMNS = {
    "service_no": "service_no",
    "service_type": "service_type",
    "service_date": "service_date",
    "status": "status",
    "result": "result",
    "updated_at": "updated_at",
    "created_at": "created_at",
}


async def list_service_records(session: AsyncSession, context: dict[str, Any], query: ServiceRecordListQuery) -> ListResult:
    await ensure_after_sales_tables(session, records=True)
    filters = ["tenant_id = :tenant_id", "coalesce(is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "limit": query.page_size, "offset": (query.page - 1) * query.page_size}
    if query.company_id:
        assert_company_scope(context, query.company_id)
        filters.append("company_id = :company_id")
        params["company_id"] = query.company_id
    for field in ["service_request_id", "installed_asset_id", "product_id", "service_type", "status", "result", "technician_user_id", "technician_employee_id"]:
        value = getattr(query, field)
        if value:
            filters.append(f"{field} = :{field}")
            params[field] = value
    if query.date_from:
        filters.append("service_date >= :date_from")
        params["date_from"] = query.date_from
    if query.date_to:
        filters.append("service_date <= :date_to")
        params["date_to"] = query.date_to
    if query.search:
        filters.append("(service_no ilike :search or coalesce(fault_description, '') ilike :search or coalesce(work_performed, '') ilike :search)")
        params["search"] = f"%{query.search}%"
    sort = RECORD_SORT_COLUMNS.get(query.sort, "service_date")
    direction = "asc" if query.direction.lower() == "asc" else "desc"
    result = await session.execute(
        text(
            f"""
            select *, count(*) over() as total_count
            from public.after_sales_service_records
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


async def get_service_record(session: AsyncSession, tenant_id: str, service_id: str) -> dict[str, Any] | None:
    await ensure_after_sales_tables(session, records=True)
    result = await session.execute(
        text(
            """
            select *
            from public.after_sales_service_records
            where tenant_id = :tenant_id and id = :service_id and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "service_id": service_id},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def create_service_record(session: AsyncSession, context: dict[str, Any], request: ServiceRecordCreateRequest) -> dict[str, Any]:
    await ensure_after_sales_tables(session, records=True)
    assert_company_scope(context, request.company_id, write=True)
    await assert_company_exists(session, context, request.company_id)
    if request.service_request_id and not await get_service_request(session, context["tenant_id"], request.service_request_id):
        raise DomainError("Servis talebi bulunamadi.", "SERVICE_REQUEST_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    asset = await get_asset(session, context["tenant_id"], request.installed_asset_id) if request.installed_asset_id else None
    product_id = request.product_id or (str(asset["product_id"]) if asset else None)
    if product_id:
        await get_serviceable_product(session, context["tenant_id"], product_id)
    service_no = request.service_no or await next_service_no(session, context["tenant_id"])
    payload = request.model_dump(exclude={"service_no"})
    payload["service_no"] = service_no
    payload["product_id"] = product_id
    result = await session.execute(
        text(
            """
            insert into public.after_sales_service_records (
              tenant_id, company_id, service_request_id, installed_asset_id, product_id, service_no,
              service_type, service_date, technician_user_id, technician_employee_id, start_time,
              end_time, duration_minutes, status, fault_description, work_performed, parts_used,
              result, warranty_covered, customer_signature_file, service_report_file, photos,
              next_action, next_service_date, notes, metadata_json, created_by, updated_by
            )
            values (
              :tenant_id, :company_id, :service_request_id, :installed_asset_id, :product_id, :service_no,
              :service_type, :service_date, :technician_user_id, :technician_employee_id, :start_time,
              :end_time, :duration_minutes, :status, :fault_description, :work_performed, cast(:parts_used as jsonb),
              :result, :warranty_covered, cast(:customer_signature_file as jsonb), cast(:service_report_file as jsonb), cast(:photos as jsonb),
              :next_action, :next_service_date, :notes, cast(:metadata_json as jsonb), :user_id, :user_id
            )
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "user_id": context.get("user_id"),
            **payload,
            "parts_used": json_list_dumps(payload.get("parts_used")),
            "customer_signature_file": json_dumps(payload.get("customer_signature_file")),
            "service_report_file": json_dumps(payload.get("service_report_file")),
            "photos": json_list_dumps(payload.get("photos")),
            "metadata_json": json_dumps(payload.get("metadata_json")),
        },
    )
    return row_to_dict(result.mappings().one())


async def update_service_record(session: AsyncSession, context: dict[str, Any], service_id: str, request: ServiceRecordUpdateRequest) -> dict[str, Any]:
    current = await get_service_record(session, context["tenant_id"], service_id)
    if not current:
        raise DomainError("Servis kaydi bulunamadi.", "SERVICE_RECORD_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    assert_version(current, request.base_version)
    data = request.model_dump(exclude_unset=True, exclude={"base_version"})
    if not data:
        return current
    json_fields = {"parts_used": json_list_dumps, "photos": json_list_dumps, "metadata_json": json_dumps, "customer_signature_file": json_dumps, "service_report_file": json_dumps}
    set_parts: list[str] = []
    params = {"tenant_id": context["tenant_id"], "service_id": service_id, "user_id": context.get("user_id")}
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
            update public.after_sales_service_records
            set {", ".join(set_parts)}
            where tenant_id = :tenant_id and id = :service_id and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        params,
    )
    return row_to_dict(result.mappings().one())


async def complete_service_record(session: AsyncSession, context: dict[str, Any], service_id: str, request: ServiceRecordCompleteRequest) -> dict[str, Any]:
    current = await get_service_record(session, context["tenant_id"], service_id)
    if not current:
        raise DomainError("Servis kaydi bulunamadi.", "SERVICE_RECORD_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    result = await session.execute(
        text(
            """
            update public.after_sales_service_records
            set status = 'completed',
                result = :result,
                work_performed = coalesce(:work_performed, work_performed),
                warranty_covered = :warranty_covered,
                end_time = coalesce(:end_time, end_time, now()),
                duration_minutes = coalesce(:duration_minutes, duration_minutes),
                next_action = coalesce(:next_action, next_action),
                next_service_date = coalesce(:next_service_date, next_service_date),
                notes = coalesce(:notes, notes),
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :service_id
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "service_id": service_id,
            "result": request.result,
            "work_performed": request.work_performed,
            "warranty_covered": request.warranty_covered,
            "end_time": request.end_time,
            "duration_minutes": request.duration_minutes,
            "next_action": request.next_action,
            "next_service_date": request.next_service_date,
            "notes": request.notes,
            "user_id": context.get("user_id"),
        },
    )
    completed = row_to_dict(result.mappings().one())
    if completed.get("installed_asset_id"):
        await session.execute(
            text(
                """
                update public.after_sales_installed_assets
                set last_service_date = :service_date,
                    next_maintenance_date = coalesce(:next_service_date, next_maintenance_date),
                    updated_at = now(),
                    version = version + 1
                where tenant_id = :tenant_id and id = :asset_id
                """
            ),
            {"tenant_id": context["tenant_id"], "asset_id": completed["installed_asset_id"], "service_date": completed["service_date"], "next_service_date": request.next_service_date},
        )
    if completed.get("service_request_id"):
        await session.execute(
            text(
                """
                update public.after_sales_service_requests
                set status = case when :result = 'resolved' then 'resolved' else status end,
                    updated_at = now(),
                    version = version + 1
                where tenant_id = :tenant_id and id = :request_id
                """
            ),
            {"tenant_id": context["tenant_id"], "request_id": completed["service_request_id"], "result": request.result},
        )
    if request.create_followup_task or request.result == "follow_up_required":
        task = await create_project_task_for_service(
            session,
            context,
            company_id=str(completed["company_id"]),
            title=f"Servis takip: {completed['service_no']}",
            description=request.next_action or completed.get("next_action") or completed.get("work_performed"),
            priority="medium",
            assignee_user_id=request.followup_assignee_user_id or completed.get("technician_user_id"),
            assignee_employee_id=request.followup_assignee_employee_id or completed.get("technician_employee_id"),
            related_entity_type="service_record",
            related_entity_id=service_id,
            due_date=request.next_service_date,
        )
        if task:
            completed["follow_up_task"] = task
    return completed


async def after_sales_summary(session: AsyncSession, context: dict[str, Any], company_id: str | None = None) -> AfterSalesSummary:
    await ensure_after_sales_tables(session, assets=True, requests=True, records=True)
    params = {"tenant_id": context["tenant_id"], "company_id": company_id}
    company_filter_asset = "and (:company_id is null or owning_company_id = :company_id)"
    company_filter = "and (:company_id is null or company_id = :company_id)"
    assets = await session.execute(text(f"select count(*) as total from public.after_sales_installed_assets where tenant_id = :tenant_id and coalesce(is_deleted, false) = false {company_filter_asset}"), params)
    requests = await session.execute(text(f"select count(*) filter (where status in ('new','triage','assigned','in_progress','waiting_customer')) as open_total, count(*) filter (where due_date < current_date and status in ('new','triage','assigned','in_progress','waiting_customer')) as overdue from public.after_sales_service_requests where tenant_id = :tenant_id and coalesce(is_deleted, false) = false {company_filter}"), params)
    maintenance = await session.execute(text(f"select count(*) as total from public.after_sales_installed_assets where tenant_id = :tenant_id and coalesce(is_deleted, false) = false and maintenance_required = true and next_maintenance_date <= current_date {company_filter_asset}"), params)
    services = await session.execute(text(f"select count(*) as total from public.after_sales_service_records where tenant_id = :tenant_id and coalesce(is_deleted, false) = false and status = 'completed' {company_filter}"), params)
    status_rows = await session.execute(text(f"select status, count(*) as total from public.after_sales_service_requests where tenant_id = :tenant_id and coalesce(is_deleted, false) = false {company_filter} group by status"), params)
    request_row = requests.mappings().one()
    return AfterSalesSummary(
        installed_assets=int(assets.mappings().one()["total"] or 0),
        open_service_requests=int(request_row["open_total"] or 0),
        overdue_service_requests=int(request_row["overdue"] or 0),
        maintenance_due=int(maintenance.mappings().one()["total"] or 0),
        completed_services=int(services.mappings().one()["total"] or 0),
        by_request_status={str(row["status"]): int(row["total"] or 0) for row in status_rows.mappings()},
    )


async def next_service_no(session: AsyncSession, tenant_id: str) -> str:
    result = await session.execute(text("select count(*) + 1 as next_no from public.after_sales_service_records where tenant_id = :tenant_id"), {"tenant_id": tenant_id})
    return f"SVC-{int(result.mappings().one()['next_no']):06d}"
