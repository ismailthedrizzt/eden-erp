from __future__ import annotations

import pytest

from app.core.errors import DomainError
from app.domains.representatives.authority import validate_transaction_allowed
from app.domains.representatives.service import guard_representative_card_patch


def draft_representative() -> dict[str, object]:
    return {"id": "rep-1", "company_id": "company-1", "record_status": "draft"}


def active_representative() -> dict[str, object]:
    return {"id": "rep-1", "company_id": "company-1", "record_status": "active"}


def active_authority() -> dict[str, object]:
    return {"authority_record_status": "active", "authority_status": "active"}


def suspended_authority() -> dict[str, object]:
    return {"authority_record_status": "suspended", "authority_status": "suspended"}


def test_start_authority_requires_draft_representative() -> None:
    with pytest.raises(DomainError) as exc:
        validate_transaction_allowed(
            active_representative(),
            None,
            "Temsilcilik Başlatma",
        )

    assert exc.value.code == "REPRESENTATIVE_START_REQUIRES_DRAFT"


def test_suspend_requires_active_authority() -> None:
    with pytest.raises(DomainError) as exc:
        validate_transaction_allowed(
            active_representative(),
            suspended_authority(),
            "Askıya Alma",
        )

    assert exc.value.code == "REPRESENTATIVE_SUSPEND_REQUIRES_ACTIVE"


def test_terminate_accepts_suspended_authority() -> None:
    validate_transaction_allowed(
        active_representative(),
        suspended_authority(),
        "Sonlandırma",
    )


def test_limit_change_requires_active_authority() -> None:
    with pytest.raises(DomainError) as exc:
        validate_transaction_allowed(
            active_representative(),
            suspended_authority(),
            "Limit Değişikliği",
        )

    assert exc.value.code == "REPRESENTATIVE_AUTHORITY_ACTIVE_REQUIRED"


def test_card_update_rejects_authority_fields() -> None:
    with pytest.raises(DomainError) as exc:
        guard_representative_card_patch({"display_name": "Ali", "authority_types": ["sign"]})

    assert exc.value.code == "OPERATION_CONTROLLED_FIELDS"
    assert exc.value.details is not None
    assert any(field["field"] == "authority_types" for field in exc.value.details["fields"])
