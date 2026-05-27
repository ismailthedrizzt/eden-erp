from __future__ import annotations

from typing import Any

import pytest
from pydantic import ValidationError

from app.domains.company.capital_schemas import CapitalIncreaseRequest


def valid_payload() -> dict[str, Any]:
    return {
        "transaction_date": "2026-05-27",
        "registration_date": "2026-05-27",
        "old_capital_amount": 1000,
        "increase_amount": 500,
        "new_capital_amount": 1500,
        "currency": "TRY",
        "increase_reason": "Buyume",
        "distribution_method": "proportional",
        "participants": [],
    }


def test_increase_amount_must_be_positive() -> None:
    payload = valid_payload()
    payload["increase_amount"] = 0
    payload["new_capital_amount"] = 1000

    with pytest.raises(ValidationError) as exc:
        CapitalIncreaseRequest(**payload)

    assert "0'dan buyuk" in str(exc.value)


def test_new_capital_amount_mismatch_validation_error() -> None:
    payload = valid_payload()
    payload["new_capital_amount"] = 1600

    with pytest.raises(ValidationError) as exc:
        CapitalIncreaseRequest(**payload)

    assert "uyumlu" in str(exc.value)


def test_paid_amount_cannot_exceed_increase_amount() -> None:
    payload = valid_payload()
    payload["paid_amount"] = 600

    with pytest.raises(ValidationError) as exc:
        CapitalIncreaseRequest(**payload)

    assert "Odenen tutar" in str(exc.value)
