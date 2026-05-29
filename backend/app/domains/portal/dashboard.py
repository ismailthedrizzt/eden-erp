# ruff: noqa: E501

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.after_sales.service import (
    ASSET_TABLE,
    RECORD_TABLE,
    REQUEST_TABLE,
    ensure_after_sales_tables,
)
from app.domains.portal.access import PortalAccessContext, customer_scope_values
from app.domains.portal.service import row_to_dict


async def portal_dashboard(session: AsyncSession, ctx: PortalAccessContext) -> dict[str, object]:
    await ensure_after_sales_tables(session, assets=True, requests=True, records=True)
    customer_values = customer_scope_values(ctx) or ["__none__"]
    result = await session.execute(
        text(
            f"""
            select
              (select count(*) from {ASSET_TABLE} a where a.tenant_id = :tenant_id and coalesce(a.is_deleted, false) = false and (a.customer_account_id::text = any(:customer_values) or a.customer_company_id::text = any(:customer_values))) as asset_count,
              (select count(*) from {REQUEST_TABLE} r where r.tenant_id = :tenant_id and coalesce(r.is_deleted, false) = false and r.status in ('new','triage','assigned','scheduled','in_progress','waiting_customer') and r.customer_account_id::text = any(:customer_values)) as open_request_count,
              (select count(*) from {ASSET_TABLE} a where a.tenant_id = :tenant_id and coalesce(a.is_deleted, false) = false and a.next_maintenance_date is not null and a.next_maintenance_date <= current_date + interval '30 days' and (a.customer_account_id::text = any(:customer_values) or a.customer_company_id::text = any(:customer_values))) as maintenance_due_count
            """
        ),
        {"tenant_id": ctx.tenant_id, "customer_values": customer_values},
    )
    counters = row_to_dict(result.mappings().one())
    records = await session.execute(
        text(
            f"""
            select sr.service_no, sr.service_type, sr.service_date, sr.status, sr.result, sr.work_performed
            from {RECORD_TABLE} sr
            left join {REQUEST_TABLE} req on req.tenant_id = sr.tenant_id and req.id = sr.service_request_id
            left join {ASSET_TABLE} a on a.tenant_id = sr.tenant_id and a.id = sr.installed_asset_id
            where sr.tenant_id = :tenant_id
              and coalesce(sr.is_deleted, false) = false
              and (
                req.customer_account_id::text = any(:customer_values)
                or a.customer_account_id::text = any(:customer_values)
                or a.customer_company_id::text = any(:customer_values)
              )
            order by sr.service_date desc, sr.created_at desc
            limit 5
            """
        ),
        {"tenant_id": ctx.tenant_id, "customer_values": customer_values},
    )
    return {
        "customer": ctx.stakeholder,
        "portal_role": ctx.portal_role,
        "asset_count": int(counters.get("asset_count") or 0),
        "open_service_request_count": int(counters.get("open_request_count") or 0),
        "maintenance_due_count": int(counters.get("maintenance_due_count") or 0),
        "pending_action_count": 0,
        "recent_service_records": [row_to_dict(row) for row in records.mappings()],
        "notifications": [],
    }
