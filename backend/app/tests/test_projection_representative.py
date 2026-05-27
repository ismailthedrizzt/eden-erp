from __future__ import annotations

from typing import Any

from app.projections.representative import _apply_scope_filters
from app.projections.types import ProjectionQueryInput


def test_representative_record_and_authority_status_are_separate() -> None:
    rows: list[dict[str, Any]] = [
        {
            "id": "r1",
            "record_status": "active",
            "authority_status": "suspended",
            "scope_type": "company_wide",
        }
    ]

    assert rows[0]["record_status"] == "active"
    assert rows[0]["authority_status"] == "suspended"


def test_branch_filter_includes_company_wide_when_requested() -> None:
    rows: list[dict[str, Any]] = [
        {"id": "r1", "branch_id": "branch-1", "scope_type": "branch"},
        {"id": "r2", "branch_id": None, "scope_type": "company_wide"},
        {"id": "r3", "branch_id": "branch-2", "scope_type": "branch"},
    ]
    query = ProjectionQueryInput(
        tenant_id="tenant-1",
        filters={"branch_id": "branch-1", "include_company_wide_for_branch": True},
    )

    filtered = _apply_scope_filters(rows, query)

    assert [row["id"] for row in filtered] == ["r1", "r2"]
