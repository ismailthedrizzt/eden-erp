from __future__ import annotations

from app.projections.fallback import address_summary, branch_summary_from_rows


def test_branch_summary_empty_returns_zero_counts() -> None:
    summary = branch_summary_from_rows([])

    assert summary["total_branch_count"] == 0
    assert summary["active_branch_count"] == 0
    assert summary["branches"] == []


def test_branch_summary_counts_active_and_closed() -> None:
    summary = branch_summary_from_rows(
        [
            {"id": "b1", "record_status": "active", "is_official_branch": True},
            {"id": "b2", "record_status": "closed", "branch_type": "operation_point"},
        ]
    )

    assert summary["total_branch_count"] == 2
    assert summary["active_branch_count"] == 1
    assert summary["closed_branch_count"] == 1
    assert summary["official_branch_count"] == 1
    assert summary["operation_point_count"] == 1


def test_branch_address_summary_fallback() -> None:
    summary = address_summary({"city": "Istanbul", "district": "Kadikoy", "address": "Rasim"})

    assert summary == "Kadikoy, Istanbul, Rasim"
