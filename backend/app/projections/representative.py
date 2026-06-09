from __future__ import annotations

import time
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.operations.service import table_exists
from app.projections.hydration import display_name_from_representative
from app.projections.query import enforce_projection_budget, observe_projection_query, order_clause
from app.projections.registry import get_projection_definition
from app.projections.types import ProjectionDefinition, ProjectionQueryInput, ProjectionQueryResult
from app.schemas.pagination import build_list_meta

_AUTHORITY_TOP_LEVEL_FIELDS = {
    "authority_status",
    "authority_record_status",
    "authority_status_label",
    "authority_types",
    "primary_authority_type",
    "signature_type",
    "transaction_limit",
    "payment_approval_limit",
    "purchase_approval_limit",
    "bank_transaction_limit",
    "contract_signature_limit",
    "currency",
    "limits",
    "scope",
    "scope_type",
    "branch_id",
    "organization_unit_id",
    "facility_id",
    "scope_label",
    "scope_notes",
    "requires_joint_signature",
    "can_approve_alone",
    "effective_date",
    "end_date",
    "warnings",
    "transaction_no",
    "transaction_type",
    "authority_effect_status",
    "bank_authority_level",
    "department_scope",
}


async def list_representative_projection(
    session: AsyncSession,
    query: ProjectionQueryInput,
) -> ProjectionQueryResult:
    started = time.perf_counter()
    definition = _definition("representativeList")
    query = enforce_projection_budget(definition, query)
    if not await table_exists(session, "public.company_representatives"):
        raise DomainError(
            "Bu modulun kurulumu tamamlanmamis.",
            "REPRESENTATIVE_PROJECTION_UNAVAILABLE",
            409,
            {"missing": "company_representatives"},
        )
    where, params = _representative_where(query)
    count_result = await session.execute(
        text(f"select count(*) from company_representatives r where {where}"),
        params,
    )
    total = int(count_result.scalar_one() or 0)
    meta = build_list_meta(query.page, query.page_size, total)
    result = await session.execute(
        text(
            f"""
            select r.*
            from company_representatives r
            where {where}
            order by {order_clause(definition, query)}
            limit :limit offset :offset
            """
        ),
        {**params, "limit": meta.pageSize, "offset": (meta.page - 1) * meta.pageSize},
    )
    rows = [dict(row) for row in result.mappings().all()]
    warnings = await _hydrate_authorities(session, query.tenant_id, rows)
    rows = [_normalize_representative_row(row) for row in rows]
    rows = _apply_scope_filters(rows, query)
    fallback_used = bool(warnings)
    observe_projection_query(
        definition,
        query,
        duration_ms=(time.perf_counter() - started) * 1000,
        row_count=len(rows),
        fallback_used=fallback_used,
    )
    return ProjectionQueryResult(
        data=rows,
        meta=meta.model_copy(update={"total": len(rows)}),
        projection=definition.meta(fallback_used=fallback_used),
        warnings=warnings,
    )


def _representative_where(query: ProjectionQueryInput) -> tuple[str, dict[str, Any]]:
    where = ["r.tenant_id = :tenant_id", "coalesce(r.is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": query.tenant_id}
    if query.company_id or query.filters.get("company_id"):
        where.append("r.company_id = :company_id")
        params["company_id"] = query.company_id or query.filters["company_id"]
    if query.search:
        where.append(
            """
            (
              r.display_name ilike :search
              or r.full_name ilike :search
              or r.job_title ilike :search
            )
            """
        )
        params["search"] = f"%{query.search}%"
    if query.statuses:
        where.append("lower(coalesce(r.record_status, r.status, '')) = any(:statuses)")
        params["statuses"] = [status.lower() for status in query.statuses]
    return " and ".join(where), params


async def _hydrate_authorities(
    session: AsyncSession,
    tenant_id: str,
    rows: list[dict[str, Any]],
) -> list[str]:
    if not rows:
        return []
    if not await table_exists(session, "public.v_current_representative_authorities"):
        return ["REPRESENTATIVE_AUTHORITY_VIEW_MISSING_SCOPE_FIELDS"]
    ids = [str(row["id"]) for row in rows if row.get("id")]
    result = await session.execute(
        text(
            """
            select *
            from v_current_representative_authorities
            where tenant_id = :tenant_id
              and representative_id = any(:representative_ids)
            """
        ),
        {"tenant_id": tenant_id, "representative_ids": ids},
    )
    authority_by_rep = {
        str(row["representative_id"]): dict(row)
        for row in result.mappings().all()
        if row.get("representative_id")
    }
    for row in rows:
        authority = authority_by_rep.get(str(row.get("id")))
        if not authority:
            continue
        _merge_current_authority(row, authority)
    return []


def _merge_current_authority(
    representative: dict[str, Any],
    authority: dict[str, Any],
) -> None:
    current_authority = _current_authority_payload(authority)
    representative["current_authority"] = current_authority
    for key in _AUTHORITY_TOP_LEVEL_FIELDS:
        if key in current_authority:
            representative[key] = current_authority[key]


def _current_authority_payload(authority: dict[str, Any]) -> dict[str, Any]:
    payload = {
        key: value
        for key, value in authority.items()
        if key != "representative_id"
    }
    authority_record_status = payload.get("authority_record_status") or payload.get(
        "authority_status"
    )
    authority_status = payload.get("authority_status") or authority_record_status
    if authority_record_status is not None:
        payload["authority_record_status"] = authority_record_status
    if authority_status is not None:
        payload["authority_status"] = authority_status
    if payload.get("warnings") is None:
        payload["warnings"] = []
    scope = {
        key: payload.get(key)
        for key in ["scope_type", "branch_id", "organization_unit_id", "facility_id"]
        if payload.get(key) is not None
    }
    if scope and not isinstance(payload.get("scope"), dict):
        payload["scope"] = scope
    return payload


def _normalize_representative_row(row: dict[str, Any]) -> dict[str, Any]:
    row["display_name"] = display_name_from_representative(row)
    row["authority_status"] = row.get("authority_status")
    row["authority_record_status"] = row.get("authority_record_status")
    row["warning_count"] = len(row.get("warnings") or [])
    return row


def _apply_scope_filters(
    rows: list[dict[str, Any]],
    query: ProjectionQueryInput,
) -> list[dict[str, Any]]:
    branch_id = query.filters.get("branch_id")
    include_company_wide = bool(query.filters.get("include_company_wide_for_branch"))
    if branch_id:
        rows = [
            row
            for row in rows
            if row.get("branch_id") == branch_id
            or (include_company_wide and row.get("scope_type") == "company_wide")
        ]
    for key in ["scope_type", "organization_unit_id", "facility_id"]:
        if query.filters.get(key):
            rows = [row for row in rows if row.get(key) == query.filters[key]]
    authority_statuses = query.filters.get("authority_statuses")
    if authority_statuses:
        allowed = {str(status).lower() for status in authority_statuses}
        rows = [
            row
            for row in rows
            if str(row.get("authority_status") or "").lower() in allowed
        ]
    return rows


def _definition(key: str) -> ProjectionDefinition:
    definition = get_projection_definition(key)
    if definition is None:
        raise DomainError("Projection tanimli degil.", "PROJECTION_NOT_FOUND", 500)
    return definition
