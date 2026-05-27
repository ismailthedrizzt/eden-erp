from __future__ import annotations

from app.projections.query import safe_sort_field
from app.projections.registry import get_projection_definition
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
