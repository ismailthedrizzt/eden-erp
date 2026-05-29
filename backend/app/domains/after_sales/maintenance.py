# ruff: noqa: E501, I001

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, cast

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.after_sales.assets import get_asset
from app.domains.after_sales.schemas import (
    ListResult,
    MaintenanceDueCreateServiceRequest,
    MaintenanceDueListQuery,
    MaintenanceDueSkipRequest,
    MaintenancePlanCreateRequest,
    MaintenancePlanListQuery,
    MaintenancePlanUpdateRequest,
    ServicePriority,
    ServiceRequestCreateRequest,
)
from app.domains.after_sales.service import (
    assert_company_exists,
    assert_company_scope,
    assert_version,
    ensure_after_sales_deepening_tables,
    ensure_after_sales_tables,
    get_serviceable_product,
    json_dumps,
    list_meta,
    row_to_dict,
)
from app.domains.after_sales.service_requests import create_service_request, get_service_request
from app.domains.products.service import add_months

PLAN_SORT_COLUMNS = {
    "plan_name": "plan_name",
    "maintenance_type": "maintenance_type",
    "next_run_date": "next_run_date",
    "updated_at": "updated_at",
    "created_at": "created_at",
}

DUE_OPEN_STATUSES = {"scheduled", "due_soon", "overdue", "service_request_created"}


def is_maintenance_due(next_maintenance_date: date | None, today: date | None = None) -> bool:
    if not next_maintenance_date:
        return False
    return next_maintenance_date <= (today or date.today())


async def list_maintenance_plans(session: AsyncSession, context: dict[str, Any], query: MaintenancePlanListQuery) -> ListResult:
    await ensure_after_sales_deepening_tables(session, maintenance_plans=True)
    filters = ["tenant_id = :tenant_id", "coalesce(is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "limit": query.page_size, "offset": (query.page - 1) * query.page_size}
    if query.company_id:
        assert_company_scope(context, query.company_id)
        filters.append("company_id = :company_id")
        params["company_id"] = query.company_id
    for field in ["product_id", "installed_asset_id", "active"]:
        value = getattr(query, field)
        if value is not None:
            filters.append(f"{field} = :{field}")
            params[field] = value
    if query.search:
        filters.append("(plan_name ilike :search or coalesce(notes, '') ilike :search)")
        params["search"] = f"%{query.search}%"
    sort = PLAN_SORT_COLUMNS.get(query.sort, "updated_at")
    direction = "asc" if query.direction.lower() == "asc" else "desc"
    result = await session.execute(
        text(
            f"""
            select *, count(*) over() as total_count
            from public.after_sales_maintenance_plans
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


async def get_maintenance_plan(session: AsyncSession, tenant_id: str, plan_id: str) -> dict[str, Any] | None:
    await ensure_after_sales_deepening_tables(session, maintenance_plans=True)
    result = await session.execute(
        text(
            """
            select *
            from public.after_sales_maintenance_plans
            where tenant_id = :tenant_id and id = :plan_id and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "plan_id": plan_id},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def create_maintenance_plan(session: AsyncSession, context: dict[str, Any], request: MaintenancePlanCreateRequest) -> dict[str, Any]:
    await ensure_after_sales_tables(session, assets=True)
    await ensure_after_sales_deepening_tables(session, maintenance_plans=True, maintenance_due=True)
    company_id = await _resolve_plan_company(session, context, request.company_id, request.installed_asset_id, request.product_id)
    if company_id:
        assert_company_scope(context, company_id, write=True)
        await assert_company_exists(session, context, company_id)
    payload = request.model_dump()
    payload["company_id"] = company_id
    result = await session.execute(
        text(
            """
            insert into public.after_sales_maintenance_plans (
              tenant_id, company_id, product_id, installed_asset_id, plan_name, maintenance_type,
              interval_type, interval_value, checklist_template_id, active, next_run_date,
              last_run_date, assigned_team_id, default_priority, notes, metadata_json,
              created_by, updated_by
            )
            values (
              :tenant_id, :company_id, :product_id, :installed_asset_id, :plan_name, :maintenance_type,
              :interval_type, :interval_value, :checklist_template_id, :active, :next_run_date,
              :last_run_date, :assigned_team_id, :default_priority, :notes, cast(:metadata_json as jsonb),
              :user_id, :user_id
            )
            returning *
            """
        ),
        {"tenant_id": context["tenant_id"], "user_id": context.get("user_id"), **payload, "metadata_json": json_dumps(payload.get("metadata_json"))},
    )
    plan = row_to_dict(result.mappings().one())
    if plan.get("next_run_date"):
        await generate_due_items_for_plan(session, context, plan, until=plan["next_run_date"])
    return plan


async def update_maintenance_plan(session: AsyncSession, context: dict[str, Any], plan_id: str, request: MaintenancePlanUpdateRequest) -> dict[str, Any]:
    current = await get_maintenance_plan(session, context["tenant_id"], plan_id)
    if not current:
        raise DomainError("Bakim plani bulunamadi.", "MAINTENANCE_PLAN_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    assert_version(current, request.base_version)
    data = request.model_dump(exclude_unset=True, exclude={"base_version"})
    if not data:
        return current
    if any(key in data for key in {"company_id", "installed_asset_id", "product_id"}):
        data["company_id"] = await _resolve_plan_company(
            session,
            context,
            data.get("company_id", current.get("company_id")),
            data.get("installed_asset_id", current.get("installed_asset_id")),
            data.get("product_id", current.get("product_id")),
        )
    if data.get("company_id"):
        assert_company_scope(context, str(data["company_id"]), write=True)
    set_parts: list[str] = []
    params = {"tenant_id": context["tenant_id"], "plan_id": plan_id, "user_id": context.get("user_id")}
    for key, value in data.items():
        if key == "metadata_json":
            set_parts.append("metadata_json = cast(:metadata_json as jsonb)")
            params[key] = json_dumps(value)
        else:
            set_parts.append(f"{key} = :{key}")
            params[key] = value
    set_parts.extend(["updated_by = :user_id", "updated_at = now()", "version = version + 1"])
    result = await session.execute(
        text(
            f"""
            update public.after_sales_maintenance_plans
            set {", ".join(set_parts)}
            where tenant_id = :tenant_id and id = :plan_id and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        params,
    )
    plan = row_to_dict(result.mappings().one())
    if plan.get("active") and plan.get("next_run_date"):
        await generate_due_items_for_plan(session, context, plan, until=plan["next_run_date"])
    return plan


async def list_maintenance_due(session: AsyncSession, context: dict[str, Any], query: MaintenanceDueListQuery) -> list[dict[str, Any]]:
    await ensure_after_sales_tables(session, assets=True, requests=True)
    await ensure_after_sales_deepening_tables(session, maintenance_plans=True, maintenance_due=True)
    await generate_due_items(session, context, until=query.due_until)
    await refresh_due_statuses(session, context["tenant_id"])
    filters = ["d.tenant_id = :tenant_id", "coalesce(d.is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "limit": query.limit}
    if query.company_id:
        assert_company_scope(context, query.company_id)
        filters.append("d.company_id = :company_id")
        params["company_id"] = query.company_id
    for field in ["maintenance_plan_id", "installed_asset_id", "status", "assigned_user_id"]:
        value = getattr(query, field)
        if value:
            filters.append(f"d.{field} = :{field}")
            params[field] = value
    if query.due_from:
        filters.append("d.due_date >= :due_from")
        params["due_from"] = query.due_from
    if query.due_until:
        filters.append("d.due_date <= :due_until")
        params["due_until"] = query.due_until
    result = await session.execute(
        text(
            f"""
            select d.*,
              p.plan_name, p.maintenance_type, p.default_priority,
              a.customer_name, a.product_id, a.product_code, a.product_name, a.serial_no,
              a.asset_tag, a.warranty_status, a.next_maintenance_date, a.address, a.city,
              a.district, a.contact_person, a.contact_phone, a.status as asset_status
            from public.after_sales_maintenance_due_items d
            join public.after_sales_maintenance_plans p on p.tenant_id = d.tenant_id and p.id = d.maintenance_plan_id
            join public.after_sales_installed_assets a on a.tenant_id = d.tenant_id and a.id = d.installed_asset_id
            where {" and ".join(filters)}
            order by d.due_date asc, d.created_at asc
            limit :limit
            """
        ),
        params,
    )
    return [_decorate_due_row(row_to_dict(row)) for row in result.mappings()]


async def create_service_request_from_due(session: AsyncSession, context: dict[str, Any], due_id: str, request: MaintenanceDueCreateServiceRequest) -> dict[str, Any]:
    due = await get_due_item(session, context["tenant_id"], due_id)
    if not due:
        raise DomainError("Bakim takvimi kaydi bulunamadi.", "MAINTENANCE_DUE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    assert_company_scope(context, str(due["company_id"]), write=True)
    if due.get("generated_service_request_id"):
        existing = await get_service_request(session, context["tenant_id"], str(due["generated_service_request_id"]))
        return {"due_item": due, "service_request": existing}
    priority = str(due.get("default_priority") or "medium")
    service_request = await create_service_request(
        session,
        context,
        ServiceRequestCreateRequest(
            company_id=str(due["company_id"]),
            customer_name=str(due.get("customer_name") or "Musteri"),
            installed_asset_id=str(due["installed_asset_id"]),
            product_id=str(due.get("product_id")) if due.get("product_id") else None,
            request_type="maintenance",
            priority=cast(ServicePriority, priority),
            subject=f"{due.get('plan_name') or 'Periyodik bakim'} - {due.get('product_name') or ''}".strip(),
            description=request.notes or due.get("notes"),
            due_date=due.get("due_date"),
            contact_person=due.get("contact_person"),
            contact_phone=due.get("contact_phone"),
            location=", ".join(str(item) for item in [due.get("address"), due.get("district"), due.get("city")] if item) or None,
            assigned_user_id=request.assigned_user_id or due.get("assigned_user_id"),
            assigned_employee_id=request.assigned_employee_id,
            create_project_task=request.create_project_task,
            source="internal",
            metadata_json={"source": "maintenance_due", "maintenance_due_item_id": due_id, "maintenance_plan_id": str(due["maintenance_plan_id"])},
        ),
    )
    result = await session.execute(
        text(
            """
            update public.after_sales_maintenance_due_items
            set status = 'service_request_created',
                generated_service_request_id = :request_id,
                assigned_user_id = coalesce(:assigned_user_id, assigned_user_id),
                notes = coalesce(:notes, notes),
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :due_id
            returning *
            """
        ),
        {"tenant_id": context["tenant_id"], "due_id": due_id, "request_id": service_request["id"], "assigned_user_id": request.assigned_user_id, "notes": request.notes, "user_id": context.get("user_id")},
    )
    updated = row_to_dict(result.mappings().one())
    return {"due_item": updated, "service_request": service_request}


async def skip_due_item(session: AsyncSession, context: dict[str, Any], due_id: str, request: MaintenanceDueSkipRequest) -> dict[str, Any]:
    due = await get_due_item(session, context["tenant_id"], due_id)
    if not due:
        raise DomainError("Bakim takvimi kaydi bulunamadi.", "MAINTENANCE_DUE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    assert_company_scope(context, str(due["company_id"]), write=True)
    result = await session.execute(
        text(
            """
            update public.after_sales_maintenance_due_items
            set status = 'skipped',
                notes = coalesce(:notes, notes),
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :due_id
            returning *
            """
        ),
        {"tenant_id": context["tenant_id"], "due_id": due_id, "notes": request.notes, "user_id": context.get("user_id")},
    )
    return row_to_dict(result.mappings().one())


async def get_due_item(session: AsyncSession, tenant_id: str, due_id: str) -> dict[str, Any] | None:
    await ensure_after_sales_deepening_tables(session, maintenance_due=True)
    result = await session.execute(
        text(
            """
            select d.*, p.plan_name, p.maintenance_type, p.default_priority,
                   a.customer_name, a.product_id, a.product_code, a.product_name, a.serial_no,
                   a.asset_tag, a.warranty_status, a.next_maintenance_date, a.address, a.city,
                   a.district, a.contact_person, a.contact_phone
            from public.after_sales_maintenance_due_items d
            join public.after_sales_maintenance_plans p on p.tenant_id = d.tenant_id and p.id = d.maintenance_plan_id
            join public.after_sales_installed_assets a on a.tenant_id = d.tenant_id and a.id = d.installed_asset_id
            where d.tenant_id = :tenant_id and d.id = :due_id and coalesce(d.is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "due_id": due_id},
    )
    row = result.mappings().one_or_none()
    return _decorate_due_row(row_to_dict(row)) if row else None


async def generate_due_items(session: AsyncSession, context: dict[str, Any], *, until: date | None = None) -> None:
    target_until = until or date.today() + timedelta(days=30)
    result = await session.execute(
        text(
            """
            select *
            from public.after_sales_maintenance_plans
            where tenant_id = :tenant_id
              and active = true
              and coalesce(is_deleted, false) = false
              and next_run_date is not null
              and next_run_date <= :until_date
            """
        ),
        {"tenant_id": context["tenant_id"], "until_date": target_until},
    )
    for plan in [row_to_dict(row) for row in result.mappings()]:
        await generate_due_items_for_plan(session, context, plan, until=target_until)


async def generate_due_items_for_plan(session: AsyncSession, context: dict[str, Any], plan: dict[str, Any], *, until: date | None = None) -> None:
    due_date = plan.get("next_run_date")
    if not due_date or (until and due_date > until):
        return
    assets = await _assets_for_plan(session, context["tenant_id"], plan)
    for asset in assets:
        company_id = str(plan.get("company_id") or asset["owning_company_id"])
        await session.execute(
            text(
                """
                insert into public.after_sales_maintenance_due_items (
                  tenant_id, company_id, maintenance_plan_id, installed_asset_id,
                  due_date, status, created_by, updated_by
                )
                values (
                  :tenant_id, :company_id, :plan_id, :asset_id, :due_date,
                  case when :due_date < current_date then 'overdue'
                       when :due_date <= current_date + interval '14 days' then 'due_soon'
                       else 'scheduled' end,
                  :user_id, :user_id
                )
                on conflict do nothing
                """
            ),
            {"tenant_id": context["tenant_id"], "company_id": company_id, "plan_id": plan["id"], "asset_id": asset["id"], "due_date": due_date, "user_id": context.get("user_id")},
        )


async def refresh_due_statuses(session: AsyncSession, tenant_id: str) -> None:
    await session.execute(
        text(
            """
            update public.after_sales_maintenance_due_items
            set status = case
                  when due_date < current_date then 'overdue'
                  when due_date <= current_date + interval '14 days' then 'due_soon'
                  else 'scheduled'
                end,
                updated_at = now()
            where tenant_id = :tenant_id
              and coalesce(is_deleted, false) = false
              and status in ('scheduled', 'due_soon', 'overdue')
            """
        ),
        {"tenant_id": tenant_id},
    )


async def complete_due_for_service_record(session: AsyncSession, context: dict[str, Any], service_record: dict[str, Any]) -> None:
    await ensure_after_sales_deepening_tables(session, maintenance_due=True, maintenance_plans=True)
    service_request_id = service_record.get("service_request_id")
    asset_id = service_record.get("installed_asset_id")
    if not service_request_id and not asset_id:
        return
    filters = ["tenant_id = :tenant_id", "coalesce(is_deleted, false) = false", "status in ('scheduled','due_soon','overdue','service_request_created')"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "record_id": service_record["id"], "service_date": service_record.get("service_date") or date.today(), "user_id": context.get("user_id")}
    if service_request_id:
        filters.append("generated_service_request_id = :service_request_id")
        params["service_request_id"] = service_request_id
    elif asset_id:
        filters.append("installed_asset_id = :asset_id")
        params["asset_id"] = asset_id
    result = await session.execute(
        text(
            f"""
            update public.after_sales_maintenance_due_items
            set status = 'completed',
                generated_service_record_id = :record_id,
                updated_by = :user_id,
                updated_at = now(),
                version = version + 1
            where {" and ".join(filters)}
            returning *
            """
        ),
        params,
    )
    completed_due_items = [row_to_dict(row) for row in result.mappings()]
    for due in completed_due_items:
        plan = await get_maintenance_plan(session, context["tenant_id"], str(due["maintenance_plan_id"]))
        if not plan:
            continue
        next_date = next_run_date(plan, params["service_date"])
        await session.execute(
            text(
                """
                update public.after_sales_maintenance_plans
                set last_run_date = :service_date,
                    next_run_date = :next_run_date,
                    updated_by = :user_id,
                    updated_at = now(),
                    version = version + 1
                where tenant_id = :tenant_id and id = :plan_id
                """
            ),
            {"tenant_id": context["tenant_id"], "plan_id": plan["id"], "service_date": params["service_date"], "next_run_date": next_date, "user_id": context.get("user_id")},
        )


def next_run_date(plan: dict[str, Any], base_date: date | None) -> date | None:
    if not base_date:
        return None
    interval_type = str(plan.get("interval_type") or "days")
    interval_value = int(plan.get("interval_value") or 0)
    if interval_value <= 0:
        return None
    if interval_type == "days":
        return base_date + timedelta(days=interval_value)
    if interval_type == "weeks":
        return base_date + timedelta(weeks=interval_value)
    if interval_type == "months":
        return add_months(base_date, interval_value)
    return None


async def _resolve_plan_company(session: AsyncSession, context: dict[str, Any], company_id: str | None, installed_asset_id: str | None, product_id: str | None) -> str | None:
    if installed_asset_id:
        asset = await get_asset(session, context["tenant_id"], installed_asset_id)
        if not asset:
            raise DomainError("Kurulu urun kaydi bulunamadi.", "INSTALLED_ASSET_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return str(asset["owning_company_id"])
    if product_id:
        await get_serviceable_product(session, context["tenant_id"], product_id)
    return company_id


async def _assets_for_plan(session: AsyncSession, tenant_id: str, plan: dict[str, Any]) -> list[dict[str, Any]]:
    filters = ["tenant_id = :tenant_id", "coalesce(is_deleted, false) = false", "status = 'active'"]
    params: dict[str, Any] = {"tenant_id": tenant_id}
    if plan.get("installed_asset_id"):
        filters.append("id = :installed_asset_id")
        params["installed_asset_id"] = plan["installed_asset_id"]
    elif plan.get("product_id"):
        filters.append("product_id = :product_id")
        params["product_id"] = plan["product_id"]
    else:
        filters.append("maintenance_required = true")
    if plan.get("company_id"):
        filters.append("owning_company_id = :company_id")
        params["company_id"] = plan["company_id"]
    result = await session.execute(
        text(
            f"""
            select *
            from public.after_sales_installed_assets
            where {" and ".join(filters)}
            """
        ),
        params,
    )
    return [row_to_dict(row) for row in result.mappings()]


def _decorate_due_row(row: dict[str, Any]) -> dict[str, Any]:
    row["id"] = str(row["id"])
    row["owning_company_id"] = row.get("company_id")
    row["maintenance_due_item_id"] = row["id"]
    row["maintenance_plan_name"] = row.get("plan_name")
    row["next_maintenance_date"] = row.get("due_date")
    return row
