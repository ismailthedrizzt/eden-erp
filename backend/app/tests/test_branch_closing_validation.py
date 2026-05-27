import pytest
from pydantic import ValidationError

from app.domains.branches.schemas import BranchClosingRequest


def valid_branch_closing_payload() -> dict[str, object]:
    return {
        "branch_id": "11111111-1111-4111-8111-111111111111",
        "closing_reason": "Operasyonel kapanış",
        "closing_decision_date": "2026-05-10",
        "organization_unit_action": "keep_open",
        "facility_action": "keep_open",
    }


def test_branch_closing_requires_branch_id() -> None:
    payload = valid_branch_closing_payload()
    payload["branch_id"] = ""

    with pytest.raises(ValidationError) as exc:
        BranchClosingRequest(**payload)

    assert "Kapatılacak şube seçilmelidir" in str(exc.value)


def test_branch_closing_reassign_requires_target_unit() -> None:
    payload = valid_branch_closing_payload()
    payload["organization_unit_action"] = "reassign"

    with pytest.raises(ValidationError) as exc:
        BranchClosingRequest(**payload)

    assert "hedef birim seçilmelidir" in str(exc.value)
