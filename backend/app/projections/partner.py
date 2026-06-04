from __future__ import annotations

import time
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.operations.service import table_exists
from app.projections.hydration import display_name_from_partner
from app.projections.query import enforce_projection_budget, observe_projection_query, order_clause
from app.projections.registry import get_projection_definition
from app.projections.types import ProjectionDefinition, ProjectionQueryInput, ProjectionQueryResult
from app.schemas.pagination import build_list_meta


async def list_partner_projection(
    session: AsyncSession,
    query: ProjectionQueryInput,
) -> ProjectionQueryResult:
    started = time.perf_counter()
    definition = _definition("partnerList")
    query = enforce_projection_budget(definition, query)
    if not await table_exists(session, "public.company_partners"):
        raise DomainError(
            "Bu modulun kurulumu tamamlanmamis.",
            "PARTNER_PROJECTION_UNAVAILABLE",
            409,
            {"missing": "company_partners"},
        )
    where, params = _partner_where(query)
    count_result = await session.execute(
        text(f"select count(*) from company_partners p where {where}"),
        params,
    )
    total = int(count_result.scalar_one() or 0)
    meta = build_list_meta(query.page, query.page_size, total)
    result = await session.execute(
        text(
            f"""
            select p.*
            from company_partners p
            where {where}
            order by {order_clause(definition, query)}
            limit :limit offset :offset
            """
        ),
        {**params, "limit": meta.pageSize, "offset": (meta.page - 1) * meta.pageSize},
    )
    rows = [dict(row) for row in result.mappings().all()]
    warnings = await _hydrate_current_ownership(session, query.tenant_id, rows)
    normalized_rows = [_normalize_partner_row(row) for row in rows]
    fallback_used = bool(warnings)
    observe_projection_query(
        definition,
        query,
        duration_ms=(time.perf_counter() - started) * 1000,
        row_count=len(normalized_rows),
        fallback_used=fallback_used,
    )
    return ProjectionQueryResult(
        data=normalized_rows,
        meta=meta,
        projection=definition.meta(fallback_used=fallback_used),
        warnings=warnings,
    )


def _partner_where(query: ProjectionQueryInput) -> tuple[str, dict[str, Any]]:
    where = ["p.tenant_id = :tenant_id", "coalesce(p.is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": query.tenant_id}
    if query.company_id or query.filters.get("company_id"):
        where.append("p.company_id = :company_id")
        params["company_id"] = query.company_id or query.filters["company_id"]
    if query.search:
        where.append(
            """
            (
              p.display_name ilike :search
              or p.trade_name ilike :search
              or p.first_name ilike :search
              or p.last_name ilike :search
            )
            """
        )
        params["search"] = f"%{query.search}%"
    if query.statuses:
        where.append("lower(coalesce(p.record_status, p.status, '')) = any(:statuses)")
        params["statuses"] = [status.lower() for status in query.statuses]
    if query.filters.get("owner_kind"):
        where.append("coalesce(p.owner_kind, p.partner_type) = :owner_kind")
        params["owner_kind"] = query.filters["owner_kind"]
    return " and ".join(where), params


async def _hydrate_current_ownership(
    session: AsyncSession,
    tenant_id: str,
    rows: list[dict[str, Any]],
) -> list[str]:
    if not rows:
        return []
    if not await table_exists(session, "public.v_current_ownership"):
        return ["CURRENT_OWNERSHIP_VIEW_MISSING_FALLBACK_USED"]
    company_ids = sorted({str(row["company_id"]) for row in rows if row.get("company_id")})
    result = await session.execute(
        text(
            """
            select *
            from v_current_ownership
            where tenant_id = :tenant_id
              and company_id = any(:company_ids)
            """
        ),
        {"tenant_id": tenant_id, "company_ids": company_ids},
    )
    ownership_by_partner = {
        str(row["partner_id"]): dict(row)
        for row in result.mappings().all()
        if row.get("partner_id")
    }
    for row in rows:
        ownership = ownership_by_partner.get(str(row.get("id")))
        if not ownership:
            continue
        for key in [
            "current_share_ratio",
            "current_voting_ratio",
            "current_profit_ratio",
            "current_capital_amount",
            "committed_capital_amount",
            "paid_capital_amount",
            "current_share_units",
            "has_control_right",
            "control_type",
            "has_veto_right",
            "has_board_nomination_right",
            "has_privileged_share",
            "is_beneficial_owner",
            "beneficial_ratio",
            "warnings",
        ]:
            row[key] = ownership.get(key)
    return []


def _normalize_partner_row(row: dict[str, Any]) -> dict[str, Any]:
    row["display_name"] = display_name_from_partner(row)
    row["owner_kind"] = row.get("owner_kind") or row.get("partner_type")
    return row


def _definition(key: str) -> ProjectionDefinition:
    definition = get_projection_definition(key)
    if definition is None:
        raise DomainError("Projection tanimli degil.", "PROJECTION_NOT_FOUND", 500)
    return definition
