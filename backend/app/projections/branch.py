from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.operations.service import table_exists
from app.projections.fallback import address_summary, branch_summary_from_rows, zero_branch_summary
from app.projections.query import order_clause
from app.projections.registry import get_projection_definition
from app.projections.types import ProjectionDefinition, ProjectionQueryInput, ProjectionQueryResult
from app.schemas.pagination import build_list_meta


class BranchSummaryProjection(BaseModel):
    data: dict[str, Any]
    warnings: list[str] = Field(default_factory=list)


async def list_branch_projection(
    session: AsyncSession,
    query: ProjectionQueryInput,
) -> ProjectionQueryResult:
    definition = _definition("branchList")
    if not await table_exists(session, "public.company_branches"):
        raise DomainError(
            "Bu modulun kurulumu tamamlanmamis.",
            "BRANCH_PROJECTION_UNAVAILABLE",
            409,
            {"missing": "company_branches"},
        )

    join_sql = "left join companies c on c.id = b.company_id and c.tenant_id = b.tenant_id"
    org_join = ""
    facility_join = ""
    org_select = "null::text as organization_unit_name"
    facility_select = "null::text as facility_name"
    warnings: list[str] = []
    if await table_exists(session, "public.organization_units"):
        org_join = "left join organization_units ou on ou.id = b.organization_unit_id"
        org_select = "ou.name as organization_unit_name"
    else:
        warnings.append("ORGANIZATION_RELATION_MISSING_METADATA_FALLBACK_USED")
    if await table_exists(session, "public.facilities"):
        facility_join = "left join facilities f on f.id = b.facility_id"
        facility_select = "f.name as facility_name"
    else:
        warnings.append("FACILITY_RELATION_MISSING_METADATA_FALLBACK_USED")

    where, params = _branch_where(query)
    count_result = await session.execute(
        text(f"select count(*) from company_branches b {join_sql} where {where}"),
        params,
    )
    total = int(count_result.scalar_one() or 0)
    meta = build_list_meta(query.page, query.page_size, total)
    result = await session.execute(
        text(
            f"""
            select
              b.id, b.tenant_id, b.company_id, c.trade_name as company_name,
              b.organization_unit_id, {org_select},
              b.facility_id, {facility_select},
              b.branch_name, b.branch_short_name, b.branch_type,
              b.is_official_branch, b.country, b.city, b.district, b.neighborhood,
              b.address, b.postal_code, b.phone, b.email, b.trade_registry_number,
              b.trade_registry_office, b.tax_office, b.sgk_workplace_registry_no,
              b.opening_decision_date, b.opening_registration_date,
              b.closing_decision_date, b.closing_registration_date,
              b.status, b.record_status, b.start_date, b.end_date,
              b.responsible_person_id, null::text as responsible_person_name,
              b.metadata_json, b.created_at, b.updated_at, b.version, b.is_deleted
            from company_branches b
            {join_sql}
            {org_join}
            {facility_join}
            where {where}
            order by {order_clause(definition, query)}
            limit :limit offset :offset
            """
        ),
        {**params, "limit": meta.pageSize, "offset": (meta.page - 1) * meta.pageSize},
    )
    rows = [_normalize_branch_row(dict(row)) for row in result.mappings().all()]
    return ProjectionQueryResult(
        data=rows,
        meta=meta,
        projection=definition.meta(fallback_used=bool(warnings)),
        warnings=warnings,
    )


async def get_branch_projection(
    session: AsyncSession,
    tenant_id: str,
    branch_id: str,
) -> dict[str, Any]:
    query = ProjectionQueryInput(
        tenant_id=tenant_id,
        page=1,
        page_size=1,
        filters={"branch_id": branch_id},
    )
    result = await list_branch_projection(session, query)
    if not result.data:
        raise DomainError("Sube kaydi bulunamadi.", "BRANCH_NOT_FOUND", 404)
    return result.data[0]


async def get_branch_summary_for_company(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
) -> BranchSummaryProjection:
    if not await table_exists(session, "public.company_branches"):
        return BranchSummaryProjection(
            data=zero_branch_summary(),
            warnings=["BRANCH_VIEW_MISSING_FALLBACK_USED"],
        )
    result = await list_branch_projection(
        session,
        ProjectionQueryInput(
            tenant_id=tenant_id,
            company_id=company_id,
            page=1,
            page_size=200,
        ),
    )
    return BranchSummaryProjection(
        data=branch_summary_from_rows(result.data),
        warnings=result.warnings,
    )


def _branch_where(query: ProjectionQueryInput) -> tuple[str, dict[str, Any]]:
    where = ["b.tenant_id = :tenant_id", "coalesce(b.is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": query.tenant_id}
    company_id = query.company_id or query.filters.get("company_id")
    if company_id:
        where.append("b.company_id = :company_id")
        params["company_id"] = company_id
    if query.branch_id or query.filters.get("branch_id"):
        where.append("b.id = :branch_id")
        params["branch_id"] = query.branch_id or query.filters["branch_id"]
    if query.search:
        where.append(
            """
            (
              b.branch_name ilike :search
              or b.branch_short_name ilike :search
              or c.trade_name ilike :search
              or b.city ilike :search
              or b.district ilike :search
              or b.address ilike :search
              or b.trade_registry_number ilike :search
              or b.tax_office ilike :search
            )
            """
        )
        params["search"] = f"%{query.search}%"
    if query.statuses:
        where.append("lower(coalesce(b.record_status, b.status, '')) = any(:statuses)")
        params["statuses"] = [status.lower() for status in query.statuses]
    for key in ["branch_type", "city"]:
        if query.filters.get(key):
            where.append(f"b.{key} = :{key}")
            params[key] = query.filters[key]
    if query.filters.get("is_official_branch") is not None:
        where.append("b.is_official_branch = :is_official_branch")
        params["is_official_branch"] = bool(query.filters["is_official_branch"])
    return " and ".join(where), params


def _normalize_branch_row(row: dict[str, Any]) -> dict[str, Any]:
    row["address_summary"] = address_summary(row)
    row["branch_type_label"] = row.get("branch_type")
    row["last_operation"] = (row.get("metadata_json") or {}).get("last_operation")
    row["last_transaction_id"] = (row.get("metadata_json") or {}).get("last_transaction_id")
    row["warning_count"] = len((row.get("metadata_json") or {}).get("warnings") or [])
    row["document_count"] = len((row.get("metadata_json") or {}).get("document_files") or [])
    return row


def _definition(key: str) -> ProjectionDefinition:
    definition = get_projection_definition(key)
    if definition is None:
        raise DomainError("Projection tanimli degil.", "PROJECTION_NOT_FOUND", 500)
    return definition
