from __future__ import annotations

from app.domains.ownership.current import (
    ownership_row_by_partner,
    total_capital_amount,
    total_profit_ratio,
    total_share_ratio,
    total_voting_ratio,
    validate_current_ownership_distribution,
)
from app.domains.ownership.schemas import CurrentOwnershipRow


def ownership_rows() -> list[CurrentOwnershipRow]:
    return [
        CurrentOwnershipRow(
            company_id="company-1",
            partner_id="partner-1",
            current_share_ratio=70,
            current_voting_ratio=70,
            current_profit_ratio=70,
            current_capital_amount=700,
        ),
        CurrentOwnershipRow(
            company_id="company-1",
            partner_id="partner-2",
            current_share_ratio=30,
            current_voting_ratio=30,
            current_profit_ratio=30,
            current_capital_amount=300,
        ),
    ]


def test_current_ownership_totals_are_calculated() -> None:
    rows = ownership_rows()

    assert total_share_ratio(rows) == 100
    assert total_voting_ratio(rows) == 100
    assert total_profit_ratio(rows) == 100
    assert total_capital_amount(rows) == 1000


def test_ownership_row_by_partner_returns_matching_row() -> None:
    row = ownership_row_by_partner(ownership_rows(), "partner-2")

    assert row is not None
    assert row.current_share_ratio == 30


def test_distribution_warning_when_total_share_is_not_100() -> None:
    rows = ownership_rows()
    rows[1].current_share_ratio = 20

    warnings = validate_current_ownership_distribution(rows)

    assert "Toplam hisse orani %100 degil." in warnings
