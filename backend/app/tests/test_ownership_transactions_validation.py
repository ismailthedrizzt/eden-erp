from __future__ import annotations

from typing import Any

import pytest
from fastapi import status
from pydantic import ValidationError

from app.core.errors import DomainError
from app.domains.ownership.schemas import CurrentOwnershipRow, OwnershipTransactionRequest
from app.domains.ownership.transactions import _positive_number, _rights_next_values


def base_payload() -> dict[str, Any]:
    return {
        "transaction_type": "initial_partnership_entry",
        "company_id": "company-1",
        "partner_id": "partner-1",
        "effective_date": "2026-05-27",
    }


def test_turkish_transaction_type_alias_maps_to_canonical_type() -> None:
    payload = base_payload()
    payload["transaction_type"] = "Pay Devri"
    payload["source_partner_id"] = "partner-1"
    payload["target_partner_id"] = "partner-2"

    request = OwnershipTransactionRequest(**payload)

    assert request.transaction_type == "share_transfer"


def test_unsupported_transaction_type_is_rejected() -> None:
    payload = base_payload()
    payload["transaction_type"] = "legacy_partner_patch"

    with pytest.raises(ValidationError):
        OwnershipTransactionRequest(**payload)


def test_transaction_date_or_effective_date_is_required() -> None:
    payload = base_payload()
    payload.pop("effective_date")

    with pytest.raises(ValidationError):
        OwnershipTransactionRequest(**payload)


def test_initial_partnership_share_ratio_must_be_positive() -> None:
    with pytest.raises(DomainError) as exc:
        _positive_number(0, "SHARE_RATIO_REQUIRED", "Pay orani zorunludur.")

    assert exc.value.code == "SHARE_RATIO_REQUIRED"
    assert exc.value.status_code == status.HTTP_400_BAD_REQUEST


def test_rights_change_requires_changed_field() -> None:
    current = CurrentOwnershipRow(
        company_id="company-1",
        partner_id="partner-1",
        current_share_ratio=60,
        current_voting_ratio=60,
        current_profit_ratio=60,
    )
    request = OwnershipTransactionRequest(
        transaction_type="voting_ratio_change",
        company_id="company-1",
        partner_id="partner-1",
        effective_date="2026-05-27",
        voting_ratio_after=65,
    )

    values = _rights_next_values(request, current)

    assert values == {"voting_ratio": 65}
