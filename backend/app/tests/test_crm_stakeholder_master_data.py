import pytest
from pydantic import ValidationError

from app.domains.crm.schemas import MasterPersonCreateRequest, StakeholderCreateRequest
from app.domains.crm.service import mask_identity, stakeholder_account_type, stakeholder_cari_role
from app.policies.permissions import PERMISSIONS
from app.setup.readiness_registry import get_readiness_definition


def test_master_person_full_name_is_derived() -> None:
    request = MasterPersonCreateRequest(first_name="Ahmet", last_name="Yilmaz")

    assert request.full_name == "Ahmet Yilmaz"


def test_stakeholder_create_requires_master_source() -> None:
    with pytest.raises(ValidationError):
        StakeholderCreateRequest(
            company_id="00000000-0000-0000-0000-000000000001",
            master_entity_type="organization",
            stakeholder_type="customer",
        )


def test_cari_role_mapping_matches_stakeholder_type() -> None:
    assert stakeholder_cari_role("customer") == "customer"
    assert stakeholder_cari_role("supplier") == "supplier"
    assert stakeholder_cari_role("customer_supplier") == "both"
    assert stakeholder_cari_role("lead") == "stakeholder"
    assert stakeholder_account_type("lead") == "stakeholder"


def test_identity_number_is_masked() -> None:
    assert mask_identity("12345678901") == "12*******01"
    assert mask_identity(None) is None


def test_crm_permissions_and_readiness_are_registered() -> None:
    assert "crm.view" in PERMISSIONS
    definition = get_readiness_definition("crm")

    assert definition is not None
    assert "crm_stakeholders" in definition.required_tables
    assert "companies" in definition.required_dependencies
