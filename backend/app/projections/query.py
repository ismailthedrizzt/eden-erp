from __future__ import annotations

from typing import Any, Literal

from app.core.logging import log_info
from app.core.metrics import record_projection
from app.projections.types import ProjectionDefinition, ProjectionQueryInput
from app.schemas.pagination import ListMeta, build_list_meta


def projection_query_from_params(
    *,
    tenant_id: str,
    company_id: str | None = None,
    branch_id: str | None = None,
    page: int = 1,
    page_size: int = 50,
    search: str | None = None,
    sort: str | None = None,
    direction: str = "asc",
    statuses: str | None = None,
    filters: dict[str, Any] | None = None,
) -> ProjectionQueryInput:
    safe_direction: Literal["asc", "desc"] = "desc" if direction == "desc" else "asc"
    return ProjectionQueryInput(
        tenant_id=tenant_id,
        company_id=company_id,
        branch_id=branch_id,
        page=page,
        page_size=page_size,
        search=search,
        sort=sort,
        direction=safe_direction,
        statuses=[item.strip() for item in (statuses or "").split(",") if item.strip()],
        filters=filters or {},
    )


def apply_in_memory_filters(
    rows: list[dict[str, Any]],
    definition: ProjectionDefinition,
    query: ProjectionQueryInput,
) -> list[dict[str, Any]]:
    filtered = rows
    if query.search:
        needle = query.search.lower()
        fields = definition.searchable_fields
        filtered = [
            row
            for row in filtered
            if any(needle in str(row.get(field) or "").lower() for field in fields)
        ]
    if query.statuses and definition.status_field:
        allowed = {status.lower() for status in query.statuses}
        filtered = [
            row
            for row in filtered
            if str(row.get(definition.status_field) or "").lower() in allowed
        ]
    sort_field = safe_sort_field(definition, query.sort)
    if sort_field:
        filtered = sorted(
            filtered,
            key=lambda row: str(row.get(sort_field) or "").lower(),
            reverse=query.direction == "desc",
        )
    return filtered


def paginate_rows(
    rows: list[dict[str, Any]],
    query: ProjectionQueryInput,
) -> tuple[list[dict[str, Any]], ListMeta]:
    meta = build_list_meta(query.page, query.page_size, len(rows))
    start = (meta.page - 1) * meta.pageSize
    end = start + meta.pageSize
    return rows[start:end], meta


def safe_sort_field(definition: ProjectionDefinition, requested: str | None) -> str | None:
    if requested and requested in definition.sortable_fields:
        return requested
    if definition.sortable_fields:
        return definition.sortable_fields[0]
    return None


def order_clause(definition: ProjectionDefinition, query: ProjectionQueryInput) -> str:
    field = safe_sort_field(definition, query.sort) or "created_at"
    direction = "desc" if query.direction == "desc" else "asc"
    return f"{field} {direction}"


def observe_projection_query(
    definition: ProjectionDefinition,
    query: ProjectionQueryInput,
    *,
    duration_ms: float,
    row_count: int,
    fallback_used: bool = False,
) -> None:
    record_projection(definition.key, duration_ms=duration_ms, fallback_used=fallback_used)
    log_info(
        "Projection query completed.",
        logger_name="eden.projection",
        module_key=definition.key,
        duration_ms=round(duration_ms, 2),
        row_count=row_count,
        page=query.page,
        page_size=query.page_size,
        fallback_used=fallback_used,
    )
