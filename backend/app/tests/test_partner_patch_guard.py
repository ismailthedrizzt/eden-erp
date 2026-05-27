from __future__ import annotations

import pytest

from app.core.errors import DomainError
from app.domains.partners.service import (
    assert_partner_card_status,
    is_partner_active,
    reject_operation_controlled_partner_patch,
)


def test_partner_patch_rejects_share_ratio() -> None:
    with pytest.raises(DomainError) as exc:
        reject_operation_controlled_partner_patch({"share_ratio": 10})

    assert exc.value.code == "OPERATION_CONTROLLED_FIELDS"
    assert exc.value.details is not None
    assert exc.value.details["fields"][0]["field"] == "share_ratio"


def test_partner_patch_rejects_current_ownership() -> None:
    with pytest.raises(DomainError) as exc:
        reject_operation_controlled_partner_patch({"current_ownership": {}})

    assert exc.value.code == "OPERATION_CONTROLLED_FIELDS"


def test_initial_partnership_requires_draft_partner_card() -> None:
    partner = {"record_status": "active", "status": "active"}

    with pytest.raises(DomainError) as exc:
        assert_partner_card_status(partner, {"draft"})

    assert exc.value.code == "PARTNER_STATUS_NOT_ALLOWED"


def test_active_partner_card_status_is_allowed() -> None:
    partner = {"record_status": "active", "status": "active"}

    assert is_partner_active(partner)
    assert_partner_card_status(partner, {"active"})
