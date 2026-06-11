from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.contracts.page_flow_contracts import (
    BranchCreatePayloadContract,
    CompanyCreateWizardPayloadContract,
    DocumentUploadPayloadContract,
    EmployeeCreatePayloadContract,
    GenericLifecycleOperationPayloadContract,
    OwnershipTransactionPayloadContract,
    PartnerCreatePayloadContract,
    RepresentativeAuthorityWizardPayloadContract,
    RepresentativeCreatePayloadContract,
    ThemeManagementPayloadContract,
)

TENANT_ID = "11111111-1111-4111-8111-111111111111"
COMPANY_ID = "22222222-2222-4222-8222-222222222222"
PERSON_ID = "33333333-3333-4333-8333-333333333333"


def test_company_create_wizard_backend_contract() -> None:
    payload = CompanyCreateWizardPayloadContract.model_validate({
        "tenant_id": TENANT_ID,
        "short_name": "Eden",
        "legal_name": "Eden Teknoloji A.S.",
        "company_type": "limited",
        "establishment_date": "2026-06-11",
        "base_updated_at": "2026-06-11T10:00:00Z",
    })
    assert payload.company_type == "limited"
    assert payload.base_updated_at is not None


def test_representative_create_backend_contract() -> None:
    payload = RepresentativeCreatePayloadContract.model_validate({
        "tenant_id": TENANT_ID,
        "company_id": COMPANY_ID,
        "person_id": PERSON_ID,
        "person_kind": "person",
        "display_name": "Ismail ILGAR",
    })
    assert str(payload.company_id) == COMPANY_ID


def test_representative_authority_wizard_backend_contract() -> None:
    payload = RepresentativeAuthorityWizardPayloadContract.model_validate({
        "tenant_id": TENANT_ID,
        "company_id": COMPANY_ID,
        "representative_id": PERSON_ID,
        "transaction_type": "grant_authority",
        "effective_date": "2026-06-11",
        "base_updated_at": "2026-06-11T10:00:00Z",
    })
    assert payload.transaction_type.value == "grant_authority"


def test_partner_create_backend_contract() -> None:
    payload = PartnerCreatePayloadContract.model_validate({
        "tenant_id": TENANT_ID,
        "company_id": COMPANY_ID,
        "partner_type": "person",
        "share_percentage": 25,
        "capital_amount": 1000,
    })
    assert payload.share_percentage == 25


def test_ownership_transaction_backend_contract() -> None:
    payload = OwnershipTransactionPayloadContract.model_validate({
        "tenant_id": TENANT_ID,
        "company_id": COMPANY_ID,
        "partner_id": PERSON_ID,
        "transaction_type": "share_transfer",
        "effective_date": "2026-06-11",
        "share_percentage": 10,
    })
    assert payload.transaction_type == "share_transfer"


def test_branch_create_backend_contract() -> None:
    payload = BranchCreatePayloadContract.model_validate({
        "tenant_id": TENANT_ID,
        "company_id": COMPANY_ID,
        "name": "Ankara",
        "branch_type": "registered",
        "opening_date": "2026-06-11",
    })
    assert payload.name == "Ankara"


def test_document_upload_backend_contract() -> None:
    payload = DocumentUploadPayloadContract.model_validate({
        "tenant_id": TENANT_ID,
        "entity_id": COMPANY_ID,
        "document_type": "signature_circular",
        "created_at": "2026-06-11T10:00:00Z",
    })
    assert payload.document_type == "signature_circular"


def test_employee_create_backend_contract() -> None:
    payload = EmployeeCreatePayloadContract.model_validate({
        "tenant_id": TENANT_ID,
        "person_id": PERSON_ID,
        "first_name": "Ismail",
        "last_name": "ILGAR",
        "start_date": "2026-06-11",
    })
    assert payload.first_name == "Ismail"


def test_themes_management_backend_contract() -> None:
    payload = ThemeManagementPayloadContract.model_validate({
        "tenant_id": TENANT_ID,
        "theme_key": "hikmet",
        "display_name": "Hikmet",
        "status": "draft",
        "theme_json": {"meta": {"scope": "system"}},
    })
    assert payload.status.value == "draft"


def test_generic_lifecycle_operations_backend_contract() -> None:
    payload = GenericLifecycleOperationPayloadContract.model_validate({
        "tenant_id": TENANT_ID,
        "operation_type": "representative_authority",
        "entity_type": "representative",
        "entity_id": PERSON_ID,
        "lifecycle_state": "submitted",
        "payload_json": {"company_id": COMPANY_ID},
        "base_updated_at": "2026-06-11T10:00:00Z",
    })
    assert payload.base_updated_at is not None


def test_page_flow_contract_rejects_invalid_uuid() -> None:
    with pytest.raises(ValidationError):
        RepresentativeCreatePayloadContract.model_validate({
            "tenant_id": TENANT_ID,
            "company_id": "not-a-uuid",
            "person_kind": "person",
            "display_name": "Invalid",
        })
