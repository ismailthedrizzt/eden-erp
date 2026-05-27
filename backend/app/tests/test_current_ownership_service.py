from __future__ import annotations

from app.domains.ownership.schemas import CurrentOwnershipRow
from app.domains.ownership.service import validate_ownership_distribution


def test_validate_ownership_distribution_ok_for_full_share() -> None:
    summary = validate_ownership_distribution(
        [
            CurrentOwnershipRow(
                company_id="company-1",
                partner_id="partner-1",
                current_share_ratio=70,
                current_capital_amount=700,
            ),
            CurrentOwnershipRow(
                company_id="company-1",
                partner_id="partner-2",
                current_share_ratio=30,
                current_capital_amount=300,
            ),
        ]
    )

    assert summary.ok
    assert summary.total_share_ratio == 100
    assert summary.total_capital_amount == 1000
