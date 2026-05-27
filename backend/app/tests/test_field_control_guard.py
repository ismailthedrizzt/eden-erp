from __future__ import annotations

import pytest

from app.core.errors import DomainError
from app.policies.field_control import reject_operation_controlled_patch


def test_field_control_returns_operation_field_details() -> None:
    with pytest.raises(DomainError) as exc:
        reject_operation_controlled_patch("company_partner", {"share_ratio": 10})

    assert exc.value.code == "OPERATION_CONTROLLED_FIELDS"
    assert exc.value.details is not None
    assert exc.value.details["fields"] == [
        {
            "field": "share_ratio",
            "label": "Pay orani",
            "operation": "Ortaklik Islemi",
        }
    ]


def test_company_draft_identity_field_is_allowed() -> None:
    reject_operation_controlled_patch(
        "company",
        {"trade_name": "Taslak A.S."},
        {"record_status": "draft", "company_status": "draft"},
    )


def test_company_draft_capital_field_is_rejected() -> None:
    with pytest.raises(DomainError) as exc:
        reject_operation_controlled_patch(
            "company",
            {"committed_capital_amount": 1000},
            {"record_status": "draft", "company_status": "draft"},
        )

    assert exc.value.code == "OPERATION_CONTROLLED_FIELDS"
