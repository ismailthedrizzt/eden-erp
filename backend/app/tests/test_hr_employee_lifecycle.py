import pytest

from app.core.errors import DomainError
from app.domains.hr.employment import assert_identity_ready
from app.domains.hr.schemas import EmployeeCreateRequest
from app.domains.hr.service import reject_controlled_employee_patch
from app.policies.permissions import permission_exists, resolve_permission_with_fallback
from app.setup.readiness_registry import get_readiness_definition


def test_employee_create_derives_full_name() -> None:
    request = EmployeeCreateRequest(company_id="company-1", first_name="Ada", last_name="Lovelace")
    assert request.full_name == "Ada Lovelace"
    assert request.record_status == "draft"


def test_employee_card_rejects_employment_controlled_patch() -> None:
    with pytest.raises(DomainError) as exc_info:
        reject_controlled_employee_patch({"position_id": "position-1"})

    assert exc_info.value.code == "HR_EMPLOYMENT_FIELD_LOCKED"
    assert exc_info.value.details == {"fields": ["position_id"]}


def test_hr_permissions_are_registered_with_fallbacks() -> None:
    assert permission_exists("hr.employmentStart")
    assert "hr.edit" in resolve_permission_with_fallback("hr.employmentStart")
    assert "companies.edit" in resolve_permission_with_fallback("hr.employmentStart")


def test_hr_readiness_contract_includes_employee_lifecycle_tables() -> None:
    definition = get_readiness_definition("hr")
    assert definition is not None
    assert "hr_employees" in definition.required_tables
    assert "hr_employment_records" in definition.required_tables
    assert "hr_employment_transactions" in definition.required_tables


def test_turkish_employee_requires_identity_number_for_start() -> None:
    with pytest.raises(DomainError) as exc_info:
        assert_identity_ready({"nationality": "TR", "passport_no": "P123"})

    assert exc_info.value.code == "IDENTITY_NUMBER_REQUIRED"
