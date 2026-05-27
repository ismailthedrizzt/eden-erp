from __future__ import annotations

import pytest

from app.core.errors import DomainError
from app.domains.company.service import normalize_company_card_patch


def test_company_active_patch_trade_name_rejects() -> None:
    with pytest.raises(DomainError) as exc:
        normalize_company_card_patch(
            {"trade_name": "Yeni Unvan"},
            {"id": "company-1", "record_status": "active", "company_status": "active"},
        )

    assert exc.value.code == "OPERATION_CONTROLLED_FIELDS"


def test_company_draft_patch_allowed_draft_fields_works() -> None:
    patch = normalize_company_card_patch(
        {"trade_name": "Taslak A.S.", "phone": "0212 000 00 00"},
        {"id": "company-1", "record_status": "draft", "company_status": "draft"},
    )

    assert patch == {"trade_name": "Taslak A.S.", "phone": "0212 000 00 00"}


def test_company_patch_committed_capital_rejects() -> None:
    with pytest.raises(DomainError) as exc:
        normalize_company_card_patch(
            {"committed_capital_amount": 1000},
            {"id": "company-1", "record_status": "draft", "company_status": "draft"},
        )

    assert exc.value.code == "OPERATION_CONTROLLED_FIELDS"
