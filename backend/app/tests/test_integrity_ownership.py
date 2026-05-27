from __future__ import annotations

from app.integrity.checks.ownership import (
    current_ownership_available_result,
    ownership_distribution_result,
)


def test_current_ownership_empty_blocks() -> None:
    result = current_ownership_available_result([])

    assert result.ok is False
    assert result.severity == "blocking"
    assert result.key == "current_ownership_available"


def test_ownership_distribution_total_share_must_be_100() -> None:
    result = ownership_distribution_result(
        [
            {"partner_id": "p1", "current_share_ratio": 60},
            {"partner_id": "p2", "current_share_ratio": 30},
        ]
    )

    assert result.ok is False
    assert result.severity == "blocking"
    assert result.metadata["total_share_ratio"] == "90"
