from __future__ import annotations

import pytest

from app.core.errors import DomainError
from app.domains.representatives.schemas import RepresentativeCreateDraftRequest
from app.domains.representatives.service import guard_representative_card_patch


def test_representative_create_draft_schema_does_not_set_authority_types() -> None:
    request = RepresentativeCreateDraftRequest(
        company_id="company-1",
        person_kind="person",
        first_name="Ayse",
        last_name="Yilmaz",
    )

    assert "authority_types" not in request.model_dump()


def test_representative_patch_authority_types_rejects() -> None:
    with pytest.raises(DomainError) as exc:
        guard_representative_card_patch({"authority_types": ["signature"]})

    assert exc.value.code == "OPERATION_CONTROLLED_FIELDS"


def test_representative_patch_job_title_rejects() -> None:
    with pytest.raises(DomainError) as exc:
        guard_representative_card_patch({"job_title": "Mudur"})

    assert exc.value.code == "OPERATION_CONTROLLED_FIELDS"
