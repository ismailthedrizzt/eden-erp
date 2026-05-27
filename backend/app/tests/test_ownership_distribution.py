from __future__ import annotations

import pytest

from app.core.errors import DomainError
from app.domains.ownership.schemas import (
    CapitalIncreaseDistributionRow,
    CurrentOwnershipRow,
)
from app.domains.ownership.service import (
    build_proportional_capital_distribution,
    validate_current_ownership_for_capital_increase,
    validate_manual_capital_distribution,
)


def ownership_rows() -> list[CurrentOwnershipRow]:
    return [
        CurrentOwnershipRow(
            company_id="company-1",
            partner_id="partner-1",
            display_name="A Ortak",
            current_share_ratio=60,
            current_voting_ratio=60,
            current_profit_ratio=60,
            current_capital_amount=600,
        ),
        CurrentOwnershipRow(
            company_id="company-1",
            partner_id="partner-2",
            display_name="B Ortak",
            current_share_ratio=40,
            current_voting_ratio=40,
            current_profit_ratio=40,
            current_capital_amount=400,
        ),
    ]


def test_proportional_distribution_sums_increase_amount() -> None:
    rows = build_proportional_capital_distribution(ownership_rows(), 500, 1500)

    assert sum(row.increase_amount for row in rows) == pytest.approx(500)
    assert sum(row.new_capital_amount for row in rows) == pytest.approx(1500)


def test_proportional_distribution_preserves_share_ratios() -> None:
    rows = build_proportional_capital_distribution(ownership_rows(), 500, 1500)

    assert [row.new_share_ratio for row in rows] == [60, 40]


def test_manual_distribution_total_increase_mismatch_error() -> None:
    rows = [
        CapitalIncreaseDistributionRow(
            partner_id="partner-1",
            previous_capital_amount=600,
            increase_amount=100,
            new_capital_amount=700,
            new_share_ratio=50,
        ),
        CapitalIncreaseDistributionRow(
            partner_id="partner-2",
            previous_capital_amount=400,
            increase_amount=100,
            new_capital_amount=800,
            new_share_ratio=50,
        ),
    ]

    summary = validate_manual_capital_distribution(rows, 1000, 500, 1500, ownership_rows())

    assert not summary.ok
    assert any("artirim tutari" in reason for reason in summary.blocking_reasons)


def test_manual_distribution_total_share_mismatch_error() -> None:
    rows = [
        CapitalIncreaseDistributionRow(
            partner_id="partner-1",
            previous_capital_amount=600,
            increase_amount=300,
            new_capital_amount=900,
            new_share_ratio=70,
        ),
        CapitalIncreaseDistributionRow(
            partner_id="partner-2",
            previous_capital_amount=400,
            increase_amount=200,
            new_capital_amount=600,
            new_share_ratio=20,
        ),
    ]

    summary = validate_manual_capital_distribution(rows, 1000, 500, 1500, ownership_rows())

    assert not summary.ok
    assert any("%100" in reason for reason in summary.blocking_reasons)


def test_manual_distribution_unknown_partner_error() -> None:
    rows = [
        CapitalIncreaseDistributionRow(
            partner_id="partner-1",
            previous_capital_amount=600,
            increase_amount=300,
            new_capital_amount=900,
            new_share_ratio=60,
        ),
        CapitalIncreaseDistributionRow(
            partner_id="other",
            previous_capital_amount=400,
            increase_amount=200,
            new_capital_amount=600,
            new_share_ratio=40,
        ),
    ]

    summary = validate_manual_capital_distribution(rows, 1000, 500, 1500, ownership_rows())

    assert not summary.ok
    assert any("ait olmayan ortak" in reason for reason in summary.blocking_reasons)


def test_current_ownership_empty_blocks_capital_increase() -> None:
    with pytest.raises(DomainError) as exc:
        validate_current_ownership_for_capital_increase([])

    assert exc.value.code == "CURRENT_OWNERSHIP_INVALID"


def test_current_ownership_total_share_invalid_blocks_capital_increase() -> None:
    rows = ownership_rows()
    rows[0].current_share_ratio = 50

    with pytest.raises(DomainError) as exc:
        validate_current_ownership_for_capital_increase(rows)

    assert exc.value.code == "CURRENT_OWNERSHIP_INVALID"
