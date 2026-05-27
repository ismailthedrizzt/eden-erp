from __future__ import annotations

import pytest

from app.core.errors import DomainError
from app.domains.partners.schemas import PartnerCreateDraftRequest
from app.domains.partners.service import reject_operation_controlled_partner_patch


def test_partner_create_draft_schema_does_not_set_share_ratio() -> None:
    request = PartnerCreateDraftRequest(
        company_id="company-1",
        partner_type="person",
        first_name="Ali",
        last_name="Veli",
    )

    assert "share_ratio" not in request.model_dump()


def test_partner_patch_share_ratio_rejects() -> None:
    with pytest.raises(DomainError) as exc:
        reject_operation_controlled_partner_patch({"share_ratio": 25})

    assert exc.value.code == "OPERATION_CONTROLLED_FIELDS"


def test_partner_patch_current_ownership_rejects() -> None:
    with pytest.raises(DomainError) as exc:
        reject_operation_controlled_partner_patch({"current_ownership": {"share_ratio": 25}})

    assert exc.value.code == "OPERATION_CONTROLLED_FIELDS"
