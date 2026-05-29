# ruff: noqa: E501

from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.after_sales.service import (
    ASSET_TABLE,
    RECORD_TABLE,
    REQUEST_TABLE,
    ensure_after_sales_tables,
)
from app.domains.portal.access import (
    PortalAccessContext,
    allowed_asset_ids,
    customer_scope_values,
    ensure_scope_allowed,
)
from app.domains.portal.service import list_meta, record_portal_activity, row_to_dict


def _asset_filters(ctx: PortalAccessContext, alias: str = "a") -> tuple[list[str], dict[str, Any]]:
    allowed = allowed_asset_ids(ctx)
    customer_values = customer_scope_values(ctx)
    filters = [f"{alias}.tenant_id = :tenant_id", f"coalesce({alias}.is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": ctx.tenant_id}
    if allowed:
        filters.append(f"{alias}.id::text = any(:allowed_asset_ids)")
        params["allowed_asset_ids"] = allowed
    else:
        filters.append(f"({alias}.customer_account_id::text = any(:customer_values) or {alias}.customer_company_id::text = any(:customer_values))")
        params["customer_values"] = customer_values or ["__none__"]
    return filters, params


async def list_portal_products(session: AsyncSession, ctx: PortalAccessContext, *, page: int = 1, page_size: int = 50, maintenance_due_until: date | None = None) -> dict[str, Any]:
    await ensure_after_sales_tables(session, assets=True, requests=True, records=True)
    filters, params = _asset_filters(ctx)
    params.update({"limit": page_size, "offset": (page - 1) * page_size})
    if maintenance_due_until:
        filters.append("a.next_maintenance_date <= :maintenance_due_until")
        params["maintenance_due_until"] = maintenance_due_until
    result = await session.execute(
        text(
            f"""
            select a.*,
                   count(sr.id) filter (where coalesce(sr.is_deleted, false) = false) as service_count,
                   count(req.id) filter (where coalesce(req.is_deleted, false) = false and req.status in ('new','triage','assigned','scheduled','in_progress','waiting_customer')) as open_request_count,
                   count(*) over() as total_count
            from {ASSET_TABLE} a
            left join {RECORD_TABLE} sr on sr.tenant_id = a.tenant_id and sr.installed_asset_id = a.id
            left join {REQUEST_TABLE} req on req.tenant_id = a.tenant_id and req.installed_asset_id = a.id
            where {" and ".join(filters)}
            group by a.id
            order by a.updated_at desc, a.id desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    rows = [public_asset(row_to_dict(row)) for row in result.mappings()]
    total = int(rows[0].pop("total_count")) if rows else 0
    for row in rows[1:]:
        row.pop("total_count", None)
    return {"data": rows, "meta": list_meta(page, page_size, total)}


async def get_portal_product(session: AsyncSession, ctx: PortalAccessContext, asset_id: str) -> dict[str, Any]:
    asset = await load_scoped_asset(session, ctx, asset_id)
    history = await session.execute(
        text(
            f"""
            select service_no, service_type, service_date, status, result, work_performed, warranty_covered, service_report_file
            from {RECORD_TABLE}
            where tenant_id = :tenant_id
              and installed_asset_id = :asset_id
              and coalesce(is_deleted, false) = false
            order by service_date desc, created_at desc
            limit 20
            """
        ),
        {"tenant_id": ctx.tenant_id, "asset_id": asset_id},
    )
    payload = public_asset(asset)
    payload["service_history"] = [row_to_dict(row) for row in history.mappings()]
    await record_portal_activity(session, ctx, action_type="portal_view_asset", entity_type="installed_asset", entity_id=asset_id)
    return payload


async def load_scoped_asset(session: AsyncSession, ctx: PortalAccessContext, asset_id: str) -> dict[str, Any]:
    await ensure_after_sales_tables(session, assets=True)
    filters, params = _asset_filters(ctx)
    filters.append("a.id = :asset_id")
    params["asset_id"] = asset_id
    result = await session.execute(text(f"select a.* from {ASSET_TABLE} a where {' and '.join(filters)} limit 1"), params)
    row = row_to_dict(result.mappings().one_or_none())
    ensure_scope_allowed(bool(row), entity_type="installed_asset", entity_id=asset_id)
    return row


def public_asset(row: dict[str, Any]) -> dict[str, Any]:
    hidden = {"notes", "metadata_json", "created_by", "updated_by", "is_deleted"}
    return {key: value for key, value in row.items() if key not in hidden}
