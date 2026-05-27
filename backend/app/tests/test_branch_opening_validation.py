from typing import Any

import pytest
from pydantic import ValidationError

from app.domains.branches.schemas import BranchOpeningRequest


def valid_branch_opening_payload() -> dict[str, Any]:
    return {
        "branch_name": "Istanbul Sube",
        "branch_type": "official_branch",
        "is_official_branch": True,
        "country": "Turkiye",
        "city": "Istanbul",
        "district": "Kadikoy",
        "address": "Acik adres",
        "opening_decision_date": "2026-05-01",
        "opening_registration_date": "2026-05-02",
        "document_files": [{"name": "karar.pdf"}],
    }


def test_branch_opening_requires_branch_name() -> None:
    payload = valid_branch_opening_payload()
    payload["branch_name"] = ""

    with pytest.raises(ValidationError) as exc:
        BranchOpeningRequest(**payload)

    assert "Şube adı zorunludur" in str(exc.value)


def test_official_branch_requires_dates() -> None:
    payload = valid_branch_opening_payload()
    payload["opening_decision_date"] = None
    payload["opening_registration_date"] = None

    with pytest.raises(ValidationError) as exc:
        BranchOpeningRequest(**payload)

    assert "karar ve tescil tarihi zorunludur" in str(exc.value)
