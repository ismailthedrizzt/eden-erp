# ruff: noqa: E501

from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.after_sales.schemas import (
    ChecklistTemplateCreateRequest,
    ChecklistTemplateListQuery,
    ListResult,
    ServiceChecklistPatchRequest,
)
from app.domains.after_sales.service import (
    assert_company_scope,
    ensure_after_sales_deepening_tables,
    ensure_after_sales_tables,
    get_serviceable_product,
    json_dumps,
    json_list_dumps,
    list_meta,
    row_to_dict,
)
from app.domains.after_sales.service_records import get_service_record

CHECKLIST_SORT_COLUMNS = {
    "checklist_name": "checklist_name",
    "service_type": "service_type",
    "updated_at": "updated_at",
    "created_at": "created_at",
}


async def list_checklist_templates(session: AsyncSession, context: dict[str, Any], query: ChecklistTemplateListQuery) -> ListResult:
    await ensure_after_sales_deepening_tables(session, checklists=True)
    filters = ["tenant_id = :tenant_id", "coalesce(is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "limit": query.page_size, "offset": (query.page - 1) * query.page_size}
    if query.company_id:
        assert_company_scope(context, query.company_id)
        filters.append("company_id = :company_id")
        params["company_id"] = query.company_id
    for field in ["product_id", "service_type", "active"]:
        value = getattr(query, field)
        if value is not None:
            filters.append(f"{field} = :{field}")
            params[field] = value
    if query.search:
        filters.append("checklist_name ilike :search")
        params["search"] = f"%{query.search}%"
    sort = CHECKLIST_SORT_COLUMNS.get(query.sort, "updated_at")
    direction = "asc" if query.direction.lower() == "asc" else "desc"
    result = await session.execute(
        text(
            f"""
            select *, count(*) over() as total_count
            from public.after_sales_checklist_templates
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


async def create_checklist_template(session: AsyncSession, context: dict[str, Any], request: ChecklistTemplateCreateRequest) -> dict[str, Any]:
    await ensure_after_sales_deepening_tables(session, checklists=True)
    if request.company_id:
        assert_company_scope(context, request.company_id, write=True)
    if request.product_id:
        await get_serviceable_product(session, context["tenant_id"], request.product_id)
    payload = request.model_dump()
    result = await session.execute(
        text(
            """
            insert into public.after_sales_checklist_templates (
              tenant_id, company_id, product_id, service_type, checklist_name,
              items, active, metadata_json, created_by, updated_by
            )
            values (
              :tenant_id, :company_id, :product_id, :service_type, :checklist_name,
              cast(:items as jsonb), :active, cast(:metadata_json as jsonb), :user_id, :user_id
            )
            returning *
            """
        ),
        {"tenant_id": context["tenant_id"], "user_id": context.get("user_id"), **payload, "items": json_list_dumps(payload.get("items")), "metadata_json": json_dumps(payload.get("metadata_json"))},
    )
    return row_to_dict(result.mappings().one())


async def get_service_checklist(session: AsyncSession, context: dict[str, Any], service_id: str) -> dict[str, Any]:
    await ensure_after_sales_tables(session, records=True)
    await ensure_after_sales_deepening_tables(session, checklists=True)
    service_record = await get_service_record(session, context["tenant_id"], service_id)
    if not service_record:
        raise DomainError("Servis kaydi bulunamadi.", "SERVICE_RECORD_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    result = await session.execute(
        text(
            """
            select r.*, t.checklist_name, t.items
            from public.after_sales_service_checklist_results r
            join public.after_sales_checklist_templates t on t.tenant_id = r.tenant_id and t.id = r.checklist_template_id
            where r.tenant_id = :tenant_id and r.service_record_id = :service_id
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "service_id": service_id},
    )
    existing = result.mappings().one_or_none()
    template = await suggest_checklist_template(session, context, service_record)
    return {
        "service_record": service_record,
        "result": row_to_dict(existing) if existing else None,
        "suggested_template": template,
    }


async def patch_service_checklist(session: AsyncSession, context: dict[str, Any], service_id: str, request: ServiceChecklistPatchRequest) -> dict[str, Any]:
    await ensure_after_sales_deepening_tables(session, checklists=True)
    service_record = await get_service_record(session, context["tenant_id"], service_id)
    if not service_record:
        raise DomainError("Servis kaydi bulunamadi.", "SERVICE_RECORD_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    template = await get_checklist_template(session, context["tenant_id"], request.checklist_template_id)
    if not template:
        raise DomainError("Checklist sablonu bulunamadi.", "CHECKLIST_TEMPLATE_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    missing = missing_required_items(template.get("items") or [], request.results)
    completed = request.completed and not missing
    result = await session.execute(
        text(
            """
            insert into public.after_sales_service_checklist_results (
              tenant_id, service_record_id, checklist_template_id, results,
              completed, missing_required_items, updated_by
            )
            values (
              :tenant_id, :service_record_id, :checklist_template_id, cast(:results as jsonb),
              :completed, cast(:missing_required_items as jsonb), :user_id
            )
            on conflict (tenant_id, service_record_id)
            do update set
              checklist_template_id = excluded.checklist_template_id,
              results = excluded.results,
              completed = excluded.completed,
              missing_required_items = excluded.missing_required_items,
              updated_by = excluded.updated_by,
              updated_at = now()
            returning *
            """
        ),
        {"tenant_id": context["tenant_id"], "service_record_id": service_id, "checklist_template_id": request.checklist_template_id, "results": json_dumps(request.results), "completed": completed, "missing_required_items": json_list_dumps(missing), "user_id": context.get("user_id")},
    )
    row = row_to_dict(result.mappings().one())
    row["missing_required_items"] = missing
    return row


async def assert_service_checklist_complete(session: AsyncSession, context: dict[str, Any], service_record: dict[str, Any]) -> None:
    if not await _checklist_tables_available(session):
        return
    result = await session.execute(
        text(
            """
            select r.completed, r.missing_required_items
            from public.after_sales_service_checklist_results r
            where r.tenant_id = :tenant_id and r.service_record_id = :service_record_id
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "service_record_id": service_record["id"]},
    )
    row = result.mappings().one_or_none()
    if row:
        missing = row["missing_required_items"] or []
        if not row["completed"] or missing:
            raise DomainError("Zorunlu checklist maddeleri tamamlanmadan servis kapatilamaz.", "SERVICE_CHECKLIST_INCOMPLETE", status.HTTP_422_UNPROCESSABLE_ENTITY, {"missing_required_items": missing})
        return
    template = await suggest_checklist_template(session, context, service_record)
    if template and missing_required_items(template.get("items") or [], {}):
        raise DomainError("Bu servis icin checklist doldurulmalidir.", "SERVICE_CHECKLIST_REQUIRED", status.HTTP_422_UNPROCESSABLE_ENTITY, {"checklist_template_id": str(template["id"])})


async def suggest_checklist_template(session: AsyncSession, context: dict[str, Any], service_record: dict[str, Any]) -> dict[str, Any] | None:
    if not await _checklist_tables_available(session):
        return None
    result = await session.execute(
        text(
            """
            select *
            from public.after_sales_checklist_templates
            where tenant_id = :tenant_id
              and active = true
              and coalesce(is_deleted, false) = false
              and service_type = :service_type
              and (
                product_id = :product_id
                or product_id is null
              )
            order by case when product_id = :product_id then 0 else 1 end, updated_at desc
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "service_type": service_record.get("service_type"), "product_id": service_record.get("product_id")},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def get_checklist_template(session: AsyncSession, tenant_id: str, template_id: str) -> dict[str, Any] | None:
    result = await session.execute(
        text(
            """
            select *
            from public.after_sales_checklist_templates
            where tenant_id = :tenant_id and id = :template_id and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "template_id": template_id},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


def missing_required_items(items: list[dict[str, Any]], results: dict[str, Any]) -> list[str]:
    missing: list[str] = []
    for item in items:
        key = str(item.get("key") or "")
        if not key or not item.get("required"):
            continue
        value = results.get(key)
        if value in (None, "", [], {}):
            missing.append(key)
        elif item.get("type") == "checkbox" and value is not True:
            missing.append(key)
    return missing


async def _checklist_tables_available(session: AsyncSession) -> bool:
    from app.domains.operations.service import table_exists

    return await table_exists(session, "public.after_sales_checklist_templates") and await table_exists(session, "public.after_sales_service_checklist_results")
