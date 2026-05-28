# ruff: noqa: E501, I001

from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.after_sales.schemas import InstalledAssetCreateRequest, InstalledAssetListQuery, InstalledAssetUpdateRequest, ListResult
from app.domains.after_sales.service import assert_branch_valid, assert_company_exists, assert_company_scope, assert_facility_valid, assert_version, derive_warranty, ensure_after_sales_tables, get_serviceable_product, json_dumps, json_list_dumps, list_meta, row_to_dict

ASSET_SORT_COLUMNS = {
    "customer_name": "customer_name",
    "product_name": "product_name",
    "serial_no": "serial_no",
    "warranty_end_date": "warranty_end_date",
    "next_maintenance_date": "next_maintenance_date",
    "updated_at": "updated_at",
    "created_at": "created_at",
}


async def list_assets(session: AsyncSession, context: dict[str, Any], query: InstalledAssetListQuery) -> ListResult:
    await ensure_after_sales_tables(session, assets=True, requests=True, records=True)
    filters = ["a.tenant_id = :tenant_id", "coalesce(a.is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "limit": query.page_size, "offset": (query.page - 1) * query.page_size}
    if query.company_id:
        assert_company_scope(context, query.company_id)
        filters.append("a.owning_company_id = :company_id")
        params["company_id"] = query.company_id
    for field in ["customer_account_id", "product_id", "warranty_status", "status", "serial_no"]:
        value = getattr(query, field)
        if value:
            filters.append(f"a.{field} = :{field}")
            params[field] = value
    if query.maintenance_due_until:
        filters.append("a.next_maintenance_date <= :maintenance_due_until")
        params["maintenance_due_until"] = query.maintenance_due_until
    if query.search:
        filters.append("(a.customer_name ilike :search or a.product_name ilike :search or coalesce(a.serial_no, '') ilike :search or coalesce(a.asset_tag, '') ilike :search)")
        params["search"] = f"%{query.search}%"
    sort = ASSET_SORT_COLUMNS.get(query.sort, "updated_at")
    direction = "asc" if query.direction.lower() == "asc" else "desc"
    result = await session.execute(
        text(
            f"""
            select a.*,
              count(sr.id) filter (where coalesce(sr.is_deleted, false) = false) as service_count,
              count(req.id) filter (where coalesce(req.is_deleted, false) = false and req.status in ('new','triage','assigned','in_progress','waiting_customer')) as open_request_count,
              count(*) over() as total_count
            from public.after_sales_installed_assets a
            left join public.after_sales_service_records sr on sr.tenant_id = a.tenant_id and sr.installed_asset_id = a.id
            left join public.after_sales_service_requests req on req.tenant_id = a.tenant_id and req.installed_asset_id = a.id
            where {" and ".join(filters)}
            group by a.id
            order by a.{sort} {direction}, a.id desc
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


async def get_asset(session: AsyncSession, tenant_id: str, asset_id: str) -> dict[str, Any] | None:
    await ensure_after_sales_tables(session, assets=True)
    result = await session.execute(
        text(
            """
            select *
            from public.after_sales_installed_assets
            where tenant_id = :tenant_id and id = :asset_id and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "asset_id": asset_id},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def create_asset(session: AsyncSession, context: dict[str, Any], request: InstalledAssetCreateRequest) -> dict[str, Any]:
    await ensure_after_sales_tables(session, assets=True)
    assert_company_scope(context, request.owning_company_id, write=True)
    await assert_company_exists(session, context, request.owning_company_id)
    await assert_branch_valid(session, context, request.branch_id, request.owning_company_id)
    await assert_facility_valid(session, context, request.facility_id, request.owning_company_id)
    product = await get_serviceable_product(session, context["tenant_id"], request.product_id, require_after_sales=True)
    if product.get("serial_required") and not request.serial_no:
        raise DomainError("Bu urun icin seri numarasi zorunludur.", "SERIAL_NO_REQUIRED", status.HTTP_422_UNPROCESSABLE_ENTITY)
    warranty_start, warranty_end, warranty_status = derive_warranty(product, request.installation_date, request.warranty_start_date, request.warranty_end_date, request.warranty_status)
    maintenance_required = request.maintenance_required if request.maintenance_required is not None else bool(product.get("maintenance_required"))
    result = await session.execute(
        text(
            """
            insert into public.after_sales_installed_assets (
              tenant_id, owning_company_id, customer_account_id, customer_company_id, customer_name,
              product_id, product_code, product_name, serial_no, asset_tag, installation_date,
              warranty_start_date, warranty_end_date, warranty_status, maintenance_required,
              next_maintenance_date, facility_id, branch_id, address, city, district, contact_person,
              contact_phone, status, notes, document_files, metadata_json, created_by, updated_by
            )
            values (
              :tenant_id, :owning_company_id, :customer_account_id, :customer_company_id, :customer_name,
              :product_id, :product_code, :product_name, :serial_no, :asset_tag, :installation_date,
              :warranty_start_date, :warranty_end_date, :warranty_status, :maintenance_required,
              :next_maintenance_date, :facility_id, :branch_id, :address, :city, :district, :contact_person,
              :contact_phone, :status, :notes, cast(:document_files as jsonb), cast(:metadata_json as jsonb), :user_id, :user_id
            )
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "user_id": context.get("user_id"),
            **request.model_dump(exclude={"warranty_start_date", "warranty_end_date", "warranty_status", "maintenance_required"}),
            "product_code": product.get("product_code"),
            "product_name": product.get("product_name"),
            "warranty_start_date": warranty_start,
            "warranty_end_date": warranty_end,
            "warranty_status": warranty_status,
            "maintenance_required": maintenance_required,
            "document_files": json_list_dumps(request.document_files),
            "metadata_json": json_dumps(request.metadata_json),
        },
    )
    return row_to_dict(result.mappings().one())


async def update_asset(session: AsyncSession, context: dict[str, Any], asset_id: str, request: InstalledAssetUpdateRequest) -> dict[str, Any]:
    current = await get_asset(session, context["tenant_id"], asset_id)
    if not current:
        raise DomainError("Kurulu urun kaydi bulunamadi.", "INSTALLED_ASSET_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    assert_version(current, request.base_version)
    data = request.model_dump(exclude_unset=True, exclude={"base_version"})
    if "branch_id" in data:
        await assert_branch_valid(session, context, data["branch_id"], str(current["owning_company_id"]))
    if "facility_id" in data:
        await assert_facility_valid(session, context, data["facility_id"], str(current["owning_company_id"]))
    if not data:
        return current
    json_fields = {"document_files": json_list_dumps, "metadata_json": json_dumps}
    set_parts: list[str] = []
    params = {"tenant_id": context["tenant_id"], "asset_id": asset_id, "user_id": context.get("user_id")}
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
            update public.after_sales_installed_assets
            set {", ".join(set_parts)}
            where tenant_id = :tenant_id and id = :asset_id and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        params,
    )
    return row_to_dict(result.mappings().one())


async def delete_asset(session: AsyncSession, context: dict[str, Any], asset_id: str) -> dict[str, Any]:
    current = await get_asset(session, context["tenant_id"], asset_id)
    if not current:
        raise DomainError("Kurulu urun kaydi bulunamadi.", "INSTALLED_ASSET_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    result = await session.execute(
        text(
            """
            update public.after_sales_installed_assets
            set is_deleted = true, updated_by = :user_id, updated_at = now(), version = version + 1
            where tenant_id = :tenant_id and id = :asset_id
            returning id
            """
        ),
        {"tenant_id": context["tenant_id"], "asset_id": asset_id, "user_id": context.get("user_id")},
    )
    return row_to_dict(result.mappings().one())


async def service_history(session: AsyncSession, context: dict[str, Any], asset_id: str) -> list[dict[str, Any]]:
    await ensure_after_sales_tables(session, assets=True, records=True)
    if not await get_asset(session, context["tenant_id"], asset_id):
        raise DomainError("Kurulu urun kaydi bulunamadi.", "INSTALLED_ASSET_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    result = await session.execute(
        text(
            """
            select *
            from public.after_sales_service_records
            where tenant_id = :tenant_id and installed_asset_id = :asset_id and coalesce(is_deleted, false) = false
            order by service_date desc, created_at desc
            """
        ),
        {"tenant_id": context["tenant_id"], "asset_id": asset_id},
    )
    return [row_to_dict(row) for row in result.mappings()]


async def maintenance_due(session: AsyncSession, context: dict[str, Any], *, until: Any = None, limit: int = 100) -> list[dict[str, Any]]:
    await ensure_after_sales_tables(session, assets=True)
    result = await session.execute(
        text(
            """
            select *
            from public.after_sales_installed_assets
            where tenant_id = :tenant_id
              and coalesce(is_deleted, false) = false
              and maintenance_required = true
              and next_maintenance_date is not null
              and (:until_date is null or next_maintenance_date <= :until_date)
            order by next_maintenance_date asc
            limit :limit
            """
        ),
        {"tenant_id": context["tenant_id"], "until_date": until, "limit": limit},
    )
    return [row_to_dict(row) for row in result.mappings()]
