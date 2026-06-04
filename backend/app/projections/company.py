from __future__ import annotations

import time
from typing import Any

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.company.service import get_company_by_id, get_company_context
from app.domains.operations.service import table_exists
from app.projections.branch import get_branch_summary_for_company
from app.projections.current_ownership import current_ownership_projection
from app.projections.query import enforce_projection_budget, observe_projection_query, order_clause
from app.projections.registry import get_projection_definition
from app.projections.types import ProjectionDefinition, ProjectionQueryInput, ProjectionQueryResult
from app.schemas.pagination import build_list_meta

COMPANY_COLUMNS = """
id, organization_id, short_name, trade_name, tax_number, tax_office, company_type,
city, district, address, phone, email, record_status, company_status,
committed_capital_amount, paid_capital_amount,
coalesce(logo_url, (
  select coalesce(img->>'thumbnailUrl', img->>'thumbnail_url', img->>'previewUrl', img->>'preview_url', img->>'url')
  from jsonb_array_elements(coalesce(hero_images, '[]'::jsonb)) img
  where coalesce(img->>'slotId', img->>'slot_id') in ('light_mode_avatar', 'logo_primary', 'document_logo')
  limit 1
)) as logo_url,
(
  select coalesce(img->>'thumbnailUrl', img->>'thumbnail_url', img->>'previewUrl', img->>'preview_url', img->>'url')
  from jsonb_array_elements(coalesce(hero_images, '[]'::jsonb)) img
  where coalesce(img->>'slotId', img->>'slot_id') = 'light_mode_avatar'
  limit 1
) as logo_url_light,
(
  select coalesce(img->>'thumbnailUrl', img->>'thumbnail_url', img->>'previewUrl', img->>'preview_url', img->>'url')
  from jsonb_array_elements(coalesce(hero_images, '[]'::jsonb)) img
  where coalesce(img->>'slotId', img->>'slot_id') = 'dark_mode_avatar'
  limit 1
) as logo_url_dark,
country, website, created_at, updated_at, version, is_deleted
"""


async def list_company_projection(
    session: AsyncSession,
    query: ProjectionQueryInput,
) -> ProjectionQueryResult:
    started = time.perf_counter()
    definition = _definition("companyList")
    query = enforce_projection_budget(definition, query)
    if not await table_exists(session, "public.companies"):
        raise DomainError(
            "Bu modulun kurulumu tamamlanmamis.",
            "COMPANY_PROJECTION_UNAVAILABLE",
            409,
            {"missing": "companies"},
        )

    where = ["tenant_id = :tenant_id", "coalesce(is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": query.tenant_id}
    if query.search:
        where.append(
            """
            (
              trade_name ilike :search
              or short_name ilike :search
              or tax_number ilike :search
              or tax_office ilike :search
              or city ilike :search
            )
            """
        )
        params["search"] = f"%{query.search}%"
    if query.statuses:
        where.append("lower(coalesce(record_status, company_status, '')) = any(:statuses)")
        params["statuses"] = [status.lower() for status in query.statuses]

    where_sql = " and ".join(where)
    count_result = await session.execute(
        text(f"select count(*) from companies where {where_sql}"),
        params,
    )
    total = int(count_result.scalar_one() or 0)
    meta = build_list_meta(query.page, query.page_size, total)
    result = await session.execute(
        text(
            f"""
            select {COMPANY_COLUMNS}
            from companies
            where {where_sql}
            order by {order_clause(definition, query)}
            limit :limit offset :offset
            """
        ),
        {**params, "limit": meta.pageSize, "offset": (meta.page - 1) * meta.pageSize},
    )
    rows = [dict(row) for row in result.mappings().all()]
    observe_projection_query(
        definition,
        query,
        duration_ms=(time.perf_counter() - started) * 1000,
        row_count=len(rows),
    )
    return ProjectionQueryResult(
        data=rows,
        meta=meta,
        projection=definition.meta(),
        warnings=[],
    )


async def build_company_detail_read_model(
    session: AsyncSession,
    *,
    tenant_id: str,
    company_id: str,
) -> dict[str, Any]:
    warnings: list[str] = []
    company = await get_company_by_id(session, tenant_id, company_id)
    if not company:
        raise DomainError("Sirket kaydi bulunamadi.", "COMPANY_NOT_FOUND", 404)

    context = await get_company_context(session, tenant_id, company_id)
    branch_summary = await get_branch_summary_for_company(session, tenant_id, company_id)
    warnings.extend(branch_summary.warnings)
    ownership = await _current_ownership_or_warning(session, tenant_id, company_id, warnings)

    return {
        "company": company,
        "public_tax": context.get("public_tax"),
        "public_sgk": context.get("public_sgk"),
        "public_registry": context.get("public_registry"),
        "public_channels": context.get("public_channels"),
        "current_ownership": ownership,
        "company_nace_codes": [],
        "lifecycle_events": [],
        "branches": branch_summary.data.get("branches", []),
        "branch_summary": {
            key: value
            for key, value in branch_summary.data.items()
            if key != "branches"
        },
        "warnings": warnings,
    }


async def _current_ownership_or_warning(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
    warnings: list[str],
) -> list[dict[str, Any]]:
    try:
        projection = await current_ownership_projection(session, tenant_id, company_id)
        warnings.extend(projection.warnings)
        return projection.data
    except (DomainError, SQLAlchemyError):
        warnings.append("CURRENT_OWNERSHIP_VIEW_MISSING_FALLBACK_USED")
        return []


def _definition(key: str) -> ProjectionDefinition:
    definition = get_projection_definition(key)
    if definition is None:
        raise DomainError("Projection tanimli degil.", "PROJECTION_NOT_FOUND", 500)
    return definition
