from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.core.errors import DomainError
from app.domains.company.nace import validate_nace_selection
from app.domains.company.schemas import NaceChangeRequest


def test_nace_change_activity_subject_changes_requires_other_operation() -> None:
    with pytest.raises(ValidationError) as error:
        NaceChangeRequest(activity_subject_changes=True, effective_date="2026-01-01")
    assert "ACTIVITY_SUBJECT_CHANGE_REQUIRED" in str(error.value)


def test_nace_selection_no_primary() -> None:
    with pytest.raises(DomainError) as error:
        validate_nace_selection([{"nace_code_id": "nace-1", "is_primary": False}])
    assert error.value.code == "PRIMARY_NACE_REQUIRED"


def test_nace_selection_duplicate() -> None:
    with pytest.raises(DomainError) as error:
        validate_nace_selection(
            [
                {"nace_code_id": "nace-1", "is_primary": True},
                {"nace_code_id": "nace-1", "is_primary": False},
            ]
        )
    assert error.value.code == "NACE_DUPLICATE"
