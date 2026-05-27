from __future__ import annotations

from app.projections.query import enforce_projection_budget, safe_sort_field
from app.projections.registry import get_projection_definition
from app.projections.types import ProjectionQueryInput
from app.schemas.pagination import build_list_meta


def test_pagination_meta_calculates_total_pages() -> None:
    meta = build_list_meta(page=2, page_size=25, total=51)

    assert meta.page == 2
    assert meta.pageSize == 25
    assert meta.totalPages == 3


def test_unknown_sort_falls_back_to_default() -> None:
    definition = get_projection_definition("companyList")

    assert definition is not None
    assert safe_sort_field(definition, "unknown") == "trade_name"


def test_projection_definition_has_performance_budget() -> None:
    definition = get_projection_definition("companyList")

    assert definition is not None
    assert definition.performance_budget_ms == 500
    assert definition.max_page_size == 100


def test_projection_page_size_clamps_to_budget() -> None:
    definition = get_projection_definition("companyList")

    assert definition is not None
    query = enforce_projection_budget(
        definition,
        ProjectionQueryInput(tenant_id="tenant-1", page=0, page_size=500),
    )

    assert query.page == 1
    assert query.page_size == 100
