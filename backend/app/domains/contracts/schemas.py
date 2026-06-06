from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

ContractStatus = Literal[
    "draft", "under_review", "approval_pending", "approved", "ready_for_signature",
    "signed", "active", "renewal_pending", "amendment_pending", "suspended",
    "termination_pending", "terminated", "expired", "archived", "cancelled",
]
ContractType = Literal[
    "sales_contract", "purchase_contract", "supplier_contract", "service_contract",
    "maintenance_contract", "warranty_extension_contract", "project_contract",
    "employment_contract", "lease_contract", "nda", "partnership_contract",
    "dealer_contract", "framework_agreement", "other",
]
RiskLevel = Literal["low", "medium", "high", "critical"]
BillingFrequency = Literal["one_time", "monthly", "quarterly", "yearly", "milestone", "custom"]


class ListResult(BaseModel):
    data: list[dict[str, Any]]
    meta: dict[str, int]


class ContractListQuery(BaseModel):
    company_id: str | None = None
    contract_type: str | None = None
    status: str | None = None
    counterparty: str | None = None
    risk_level: str | None = None
    owner_user_id: str | None = None
    expiring_within_days: int | None = None
    renewal_due: bool | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50
    sort: str = "updated_at"
    direction: str = "desc"


class ContractCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    company_id: str | None = None
    contract_no: str | None = Field(default=None, max_length=80)
    contract_title: str = Field(min_length=1, max_length=300)
    contract_type: ContractType = "other"
    contract_category: str | None = None
    primary_party_type: str | None = None
    primary_party_entity_type: str | None = None
    primary_party_entity_id: str | None = None
    counterparty_name: str | None = None
    counterparty_tax_number: str | None = None
    counterparty_contact_name: str | None = None
    counterparty_email: str | None = None
    counterparty_phone: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    signed_date: date | None = None
    effective_date: date | None = None
    renewal_date: date | None = None
    notice_period_days: int | None = Field(default=None, ge=0)
    auto_renewal: bool = False
    contract_value: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, max_length=8)
    payment_terms: str | None = None
    billing_frequency: BillingFrequency | None = None
    owner_user_id: str | None = None
    responsible_department: str | None = None
    related_company_id: str | None = None
    related_branch_id: str | None = None
    related_facility_id: str | None = None
    related_project_id: str | None = None
    related_customer_id: str | None = None
    related_supplier_id: str | None = None
    related_employee_id: str | None = None
    related_asset_id: str | None = None
    risk_level: RiskLevel = "medium"
    description: str | None = None
    notes: str | None = None
    tags: list[str] = Field(default_factory=list)
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class ContractUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    contract_title: str | None = Field(default=None, min_length=1, max_length=300)
    description: str | None = None
    owner_user_id: str | None = None
    responsible_department: str | None = None
    notes: str | None = None
    tags: list[str] | None = None
    counterparty_contact_name: str | None = None
    counterparty_email: str | None = None
    counterparty_phone: str | None = None
    risk_level: RiskLevel | None = None
    metadata_json: dict[str, Any] | None = None
    base_version: int | None = None
    status: ContractStatus | None = None
    signed_date: date | None = None
    effective_date: date | None = None
    start_date: date | None = None
    end_date: date | None = None
    renewal_date: date | None = None
    termination_date: date | None = None
    contract_value: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, max_length=8)
    payment_terms: str | None = None
    auto_renewal: bool | None = None
    counterparty_name: str | None = None
    primary_party_type: str | None = None
    primary_party_entity_type: str | None = None
    primary_party_entity_id: str | None = None


class ContractRelationCreateRequest(BaseModel):
    module_key: str
    entity_type: str
    entity_id: str
    relation_type: str = "related_document"
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class ContractObligationCreateRequest(BaseModel):
    obligation_type: str = "other"
    title: str = Field(min_length=1, max_length=260)
    description: str | None = None
    due_date: date | None = None
    recurrence_rule: str | None = None
    responsible_user_id: str | None = None
    status: str = "open"


class ContractObligationUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=260)
    description: str | None = None
    due_date: date | None = None
    recurrence_rule: str | None = None
    responsible_user_id: str | None = None
    status: str | None = None


class ContractLifecycleRequest(BaseModel):
    effective_date: date | None = None
    start_date: date | None = None
    end_date: date | None = None
    renewal_date: date | None = None
    termination_date: date | None = None
    contract_value: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, max_length=8)
    payment_terms: str | None = None
    reason: str | None = None
    notes: str | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)
