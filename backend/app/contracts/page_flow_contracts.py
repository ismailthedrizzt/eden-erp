from __future__ import annotations

from datetime import date, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ThemeManagementStatus(StrEnum):
    draft = "draft"
    inactive = "inactive"
    active = "active"


class RepresentativeAuthorityTransactionType(StrEnum):
    grant_authority = "grant_authority"
    update_authority = "update_authority"
    revoke_authority = "revoke_authority"


class CompanyCreateWizardPayloadContract(BaseModel):
    tenant_id: UUID | None = None
    company_id: UUID | None = None
    short_name: str
    legal_name: str
    company_type: str
    establishment_date: date | None = None
    base_updated_at: datetime | None = None


class RepresentativeCreatePayloadContract(BaseModel):
    tenant_id: UUID | None = None
    company_id: UUID
    representative_id: UUID | None = None
    person_id: UUID | None = None
    organization_id: UUID | None = None
    person_kind: str
    display_name: str
    base_updated_at: datetime | None = None


class RepresentativeAuthorityWizardPayloadContract(BaseModel):
    tenant_id: UUID | None = None
    company_id: UUID
    representative_id: UUID
    transaction_type: RepresentativeAuthorityTransactionType
    effective_date: date
    end_date: date | None = None
    base_updated_at: datetime | None = None


class PartnerCreatePayloadContract(BaseModel):
    tenant_id: UUID | None = None
    company_id: UUID
    partner_id: UUID | None = None
    partner_type: str
    share_percentage: float = Field(ge=0, le=100)
    capital_amount: float | None = Field(default=None, ge=0)
    start_date: date | None = None
    base_updated_at: datetime | None = None


class OwnershipTransactionPayloadContract(BaseModel):
    tenant_id: UUID | None = None
    company_id: UUID
    partner_id: UUID
    transaction_type: str
    decision_date: date | None = None
    effective_date: date
    share_percentage: float | None = Field(default=None, ge=0, le=100)
    capital_amount: float | None = Field(default=None, ge=0)
    base_updated_at: datetime | None = None


class BranchCreatePayloadContract(BaseModel):
    tenant_id: UUID | None = None
    company_id: UUID
    branch_id: UUID | None = None
    name: str
    branch_type: str
    opening_date: date | None = None
    closing_date: date | None = None
    base_updated_at: datetime | None = None


class DocumentUploadPayloadContract(BaseModel):
    tenant_id: UUID | None = None
    document_id: UUID | None = None
    entity_id: UUID
    document_type: str
    requirement_status: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class EmployeeCreatePayloadContract(BaseModel):
    tenant_id: UUID | None = None
    employee_id: UUID | None = None
    person_id: UUID | None = None
    first_name: str
    last_name: str
    start_date: date | None = None
    end_date: date | None = None
    base_updated_at: datetime | None = None


class ThemeManagementPayloadContract(BaseModel):
    tenant_id: UUID | None = None
    theme_key: str
    display_name: str
    status: ThemeManagementStatus
    theme_json: dict[str, Any]
    updated_at: datetime | None = None


class GenericLifecycleOperationPayloadContract(BaseModel):
    tenant_id: UUID | None = None
    operation_type: str
    entity_type: str
    entity_id: UUID
    lifecycle_state: str
    payload_json: dict[str, Any]
    base_updated_at: datetime | None = None


class PageFlowContractResponse(BaseModel):
    ok: bool = True
    id: UUID | None = None
    status: str = "accepted"
