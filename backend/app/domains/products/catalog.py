# ruff: noqa: E501, I001

from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.operations.service import table_exists
from app.domains.products.schemas import ListResult, ProductCreateRequest, ProductListQuery, ProductSummary, ProductUpdateRequest
from app.domains.products.service import assert_company_exists, assert_company_scope, assert_version, ensure_product_table, json_dumps, json_list_dumps, list_meta, row_to_dict

PRODUCT_SORT_COLUMNS = {
    "product_code": "product_code",
    "product_name": "product_name",
    "product_type": "product_type",
    "category": "category",
    "brand": "brand",
    "updated_at": "updated_at",
    "created_at": "created_at",
}


async def list_products(session: AsyncSession, context: dict[str, Any], query: ProductListQuery) -> ListResult:
    await ensure_product_table(session)
    filters = ["tenant_id = :tenant_id", "coalesce(is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "limit": query.page_size, "offset": (query.page - 1) * query.page_size}
    if query.company_id:
        assert_company_scope(context, query.company_id)
        filters.append("(company_id = :company_id or company_id is null)")
        params["company_id"] = query.company_id
    for field in ["product_type", "category", "brand"]:
        value = getattr(query, field)
        if value:
            filters.append(f"{field} = :{field}")
            params[field] = value
    for field in ["active", "after_sales_enabled", "maintenance_required"]:
        value = getattr(query, field)
        if value is not None:
            filters.append(f"{field} = :{field}")
            params[field] = value
    if query.search:
        filters.append("(product_code ilike :search or product_name ilike :search or coalesce(brand, '') ilike :search or coalesce(model, '') ilike :search)")
        params["search"] = f"%{query.search}%"
    sort = PRODUCT_SORT_COLUMNS.get(query.sort, "updated_at")
    direction = "asc" if query.direction.lower() == "asc" else "desc"
    result = await session.execute(
        text(
            f"""
            select *, count(*) over() as total_count
            from public.product_catalog
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


async def get_product(session: AsyncSession, tenant_id: str, product_id: str) -> dict[str, Any] | None:
    await ensure_product_table(session)
    result = await session.execute(
        text(
            """
            select *
            from public.product_catalog
            where tenant_id = :tenant_id and id = :product_id and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "product_id": product_id},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def create_product(session: AsyncSession, context: dict[str, Any], request: ProductCreateRequest) -> dict[str, Any]:
    await ensure_product_table(session)
    assert_company_scope(context, request.company_id, write=True)
    await assert_company_exists(session, context, request.company_id)
    code = request.product_code or await next_product_code(session, context["tenant_id"])
    await assert_product_code_available(session, context["tenant_id"], code, exclude_id=None)
    payload = request.model_dump()
    payload["product_code"] = code
    result = await session.execute(
        text(
            """
            insert into public.product_catalog (
              tenant_id, company_id, product_code, product_name, product_type, category, brand, model,
              description, unit, serial_required, warranty_months, maintenance_required,
              maintenance_period_days, serviceable, active, sale_enabled, after_sales_enabled,
              default_currency, default_price, technical_specs, document_files, notes,
              metadata_json, created_by, updated_by
            )
            values (
              :tenant_id, :company_id, :product_code, :product_name, :product_type, :category, :brand, :model,
              :description, :unit, :serial_required, :warranty_months, :maintenance_required,
              :maintenance_period_days, :serviceable, :active, :sale_enabled, :after_sales_enabled,
              :default_currency, :default_price, cast(:technical_specs as jsonb), cast(:document_files as jsonb),
              :notes, cast(:metadata_json as jsonb), :user_id, :user_id
            )
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "user_id": context.get("user_id"),
            **payload,
            "technical_specs": json_dumps(payload.get("technical_specs")),
            "document_files": json_list_dumps(payload.get("document_files")),
            "metadata_json": json_dumps(payload.get("metadata_json")),
        },
    )
    return row_to_dict(result.mappings().one())


async def update_product(session: AsyncSession, context: dict[str, Any], product_id: str, request: ProductUpdateRequest) -> dict[str, Any]:
    current = await get_product(session, context["tenant_id"], product_id)
    if not current:
        raise DomainError("Urun/Hizmet kaydi bulunamadi.", "PRODUCT_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    assert_version(current, request.base_version)
    data = request.model_dump(exclude_unset=True, exclude={"base_version"})
    if "company_id" in data:
        assert_company_scope(context, data["company_id"], write=True)
        await assert_company_exists(session, context, data["company_id"])
    if "product_code" in data and data["product_code"]:
        await assert_product_code_available(session, context["tenant_id"], data["product_code"], exclude_id=product_id)
    if not data:
        return current
    json_fields = {"technical_specs": json_dumps, "metadata_json": json_dumps, "document_files": json_list_dumps}
    set_parts: list[str] = []
    params = {"tenant_id": context["tenant_id"], "product_id": product_id, "user_id": context.get("user_id")}
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
            update public.product_catalog
            set {", ".join(set_parts)}
            where tenant_id = :tenant_id and id = :product_id and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        params,
    )
    return row_to_dict(result.mappings().one())


async def delete_product(session: AsyncSession, context: dict[str, Any], product_id: str) -> dict[str, Any]:
    current = await get_product(session, context["tenant_id"], product_id)
    if not current:
        raise DomainError("Urun/Hizmet kaydi bulunamadi.", "PRODUCT_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    if await table_exists(session, "public.after_sales_installed_assets"):
        result = await session.execute(
            text(
                """
                select count(*) as total
                from public.after_sales_installed_assets
                where tenant_id = :tenant_id and product_id = :product_id and coalesce(is_deleted, false) = false
                """
            ),
            {"tenant_id": context["tenant_id"], "product_id": product_id},
        )
        if int(result.mappings().one()["total"] or 0) > 0:
            raise DomainError("Kurulu urun kaydi olan katalog kaydi silinemez.", "PRODUCT_HAS_INSTALLED_ASSETS", status.HTTP_409_CONFLICT)
    result = await session.execute(
        text(
            """
            update public.product_catalog
            set is_deleted = true, updated_by = :user_id, updated_at = now(), version = version + 1
            where tenant_id = :tenant_id and id = :product_id
            returning id
            """
        ),
        {"tenant_id": context["tenant_id"], "product_id": product_id, "user_id": context.get("user_id")},
    )
    return row_to_dict(result.mappings().one())


async def get_product_summary(session: AsyncSession, context: dict[str, Any]) -> ProductSummary:
    await ensure_product_table(session)
    result = await session.execute(
        text(
            """
            select
              count(*) as total_products,
              count(*) filter (where active) as active_products,
              count(*) filter (where after_sales_enabled) as after_sales_enabled,
              count(*) filter (where maintenance_required) as maintenance_required
            from public.product_catalog
            where tenant_id = :tenant_id and coalesce(is_deleted, false) = false
            """
        ),
        {"tenant_id": context["tenant_id"]},
    )
    row = result.mappings().one()
    by_type_result = await session.execute(
        text(
            """
            select product_type, count(*) as total
            from public.product_catalog
            where tenant_id = :tenant_id and coalesce(is_deleted, false) = false
            group by product_type
            """
        ),
        {"tenant_id": context["tenant_id"]},
    )
    return ProductSummary(
        total_products=int(row["total_products"] or 0),
        active_products=int(row["active_products"] or 0),
        after_sales_enabled=int(row["after_sales_enabled"] or 0),
        maintenance_required=int(row["maintenance_required"] or 0),
        by_type={str(item["product_type"]): int(item["total"] or 0) for item in by_type_result.mappings()},
    )


async def next_product_code(session: AsyncSession, tenant_id: str) -> str:
    result = await session.execute(
        text(
            """
            select count(*) + 1 as next_no
            from public.product_catalog
            where tenant_id = :tenant_id
            """
        ),
        {"tenant_id": tenant_id},
    )
    return f"PRD-{int(result.mappings().one()['next_no']):06d}"


async def assert_product_code_available(session: AsyncSession, tenant_id: str, product_code: str, *, exclude_id: str | None) -> None:
    result = await session.execute(
        text(
            """
            select id
            from public.product_catalog
            where tenant_id = :tenant_id
              and product_code = :product_code
              and coalesce(is_deleted, false) = false
              and (:exclude_id is null or id::text <> :exclude_id)
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "product_code": product_code, "exclude_id": exclude_id},
    )
    if result.mappings().one_or_none():
        raise DomainError("Bu urun/hizmet kodu zaten kullaniliyor.", "PRODUCT_CODE_DUPLICATE", status.HTTP_409_CONFLICT)
