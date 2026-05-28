# ruff: noqa: E501

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

MasterEntityType = Literal["person", "organization"]
StakeholderType = Literal[
    "customer",
    "supplier",
    "customer_supplier",
    "dealer",
    "distributor",
    "accounting_firm",
    "external_consultant",
    "public_institution",
    "logistics_partner",
    "service_partner",
    "investor",
    "lead",
    "other",
]
RelationshipStatus = Literal["draft", "active", "passive", "blocked", "archived"]
CustomerStatus = Literal["lead", "prospect", "active_customer", "inactive_customer"]
SupplierStatus = Literal["candidate", "active_supplier", "passive_supplier"]
LeadStatus = Literal["new", "contacted", "qualified", "proposal", "won", "lost"]
InteractionType = Literal[
    "note",
    "phone_call",
    "email",
    "meeting",
    "visit",
    "proposal_sent",
    "complaint",
    "service_contact",
    "other",
]


class ListResult(BaseModel):
    data: list[dict[str, Any]]
    meta: dict[str, int]


class MasterPersonSearchQuery(BaseModel):
    nationality: str | None = None
    identity_number: str | None = None
    passport_no: str | None = None
    full_name: str | None = None
    phone: str | None = None
    email: str | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 20


class MasterOrganizationSearchQuery(BaseModel):
    country: str | None = None
    tax_number: str | None = None
    registry_number: str | None = None
    trade_name: str | None = None
    city: str | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 20


class MasterPersonCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    nationality: str | None = Field(default="TR", max_length=80)
    identity_number: str | None = Field(default=None, max_length=32)
    passport_no: str | None = Field(default=None, max_length=64)
    first_name: str = Field(min_length=1, max_length=120)
    last_name: str = Field(min_length=1, max_length=120)
    full_name: str | None = Field(default=None, max_length=260)
    birth_date: date | None = None
    gender: str | None = Field(default=None, max_length=40)
    phone: str | None = Field(default=None, max_length=80)
    email: str | None = Field(default=None, max_length=254)
    address: str | None = None
    city: str | None = Field(default=None, max_length=120)
    district: str | None = Field(default=None, max_length=120)
    country: str | None = Field(default="TR", max_length=80)
    notes: str | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def ensure_full_name(self) -> MasterPersonCreateRequest:
        if not self.full_name:
            self.full_name = " ".join(part for part in [self.first_name, self.last_name] if part).strip()
        return self


class MasterOrganizationCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    country: str | None = Field(default="TR", max_length=80)
    tax_number: str | None = Field(default=None, max_length=32)
    trade_name: str = Field(min_length=1, max_length=300)
    short_name: str | None = Field(default=None, max_length=160)
    tax_office: str | None = Field(default=None, max_length=160)
    mersis_number: str | None = Field(default=None, max_length=64)
    registry_number: str | None = Field(default=None, max_length=64)
    phone: str | None = Field(default=None, max_length=80)
    email: str | None = Field(default=None, max_length=254)
    website: str | None = Field(default=None, max_length=260)
    address: str | None = None
    city: str | None = Field(default=None, max_length=120)
    district: str | None = Field(default=None, max_length=120)
    notes: str | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class StakeholderListQuery(BaseModel):
    company_id: str | None = None
    stakeholder_type: str | None = None
    relationship_status: str | None = None
    customer_status: str | None = None
    supplier_status: str | None = None
    city: str | None = None
    sector: str | None = None
    owner_user_id: str | None = None
    has_cari_account: bool | None = None
    tag: str | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50
    sort: str = "updated_at"
    direction: str = "desc"


class StakeholderCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str
    master_entity_type: MasterEntityType
    master_entity_id: str | None = None
    master_person: MasterPersonCreateRequest | None = None
    master_organization: MasterOrganizationCreateRequest | None = None
    display_name: str | None = Field(default=None, max_length=300)
    stakeholder_type: StakeholderType
    relationship_status: RelationshipStatus = "draft"
    customer_status: CustomerStatus | None = None
    supplier_status: SupplierStatus | None = None
    related_cari_account_id: str | None = None
    primary_contact_person_id: str | None = None
    assigned_owner_user_id: str | None = None
    source: str | None = Field(default="manual", max_length=80)
    sector: str | None = Field(default=None, max_length=160)
    tags: list[str] = Field(default_factory=list)
    lead_status: LeadStatus | None = None
    lead_source: str | None = Field(default=None, max_length=120)
    potential_value: Decimal | None = Field(default=None, ge=0)
    expected_close_date: date | None = None
    next_followup_date: date | None = None
    lost_reason: str | None = None
    notes: str | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def ensure_master_source(self) -> StakeholderCreateRequest:
        if self.master_entity_id:
            return self
        if self.master_entity_type == "person" and self.master_person:
            return self
        if self.master_entity_type == "organization" and self.master_organization:
            return self
        raise ValueError("Master kayit secilmeli veya yeni master kayit bilgisi girilmelidir.")


class StakeholderUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    display_name: str | None = Field(default=None, min_length=1, max_length=300)
    stakeholder_type: StakeholderType | None = None
    relationship_status: RelationshipStatus | None = None
    customer_status: CustomerStatus | None = None
    supplier_status: SupplierStatus | None = None
    related_cari_account_id: str | None = None
    primary_contact_person_id: str | None = None
    assigned_owner_user_id: str | None = None
    source: str | None = Field(default=None, max_length=80)
    sector: str | None = Field(default=None, max_length=160)
    tags: list[str] | None = None
    lead_status: LeadStatus | None = None
    lead_source: str | None = Field(default=None, max_length=120)
    potential_value: Decimal | None = Field(default=None, ge=0)
    expected_close_date: date | None = None
    next_followup_date: date | None = None
    lost_reason: str | None = None
    notes: str | None = None
    metadata_json: dict[str, Any] | None = None
    base_version: int | None = None


class InteractionCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    interaction_type: InteractionType = "note"
    subject: str = Field(min_length=1, max_length=300)
    body: str | None = None
    interaction_date: datetime | None = None
    next_followup_date: date | None = None
    related_task_id: str | None = None
    attachments: list[dict[str, Any]] = Field(default_factory=list)


class CreateCariAccountFromStakeholderRequest(BaseModel):
    currency: str = Field(default="TRY", min_length=3, max_length=3)
    opening_balance: Decimal = Decimal("0")
    risk_limit: Decimal | None = None
    payment_terms: str | None = None
    account_code: str | None = None

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.upper()


class CreateFollowupTaskRequest(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    description: str | None = None
    priority: Literal["lowest", "low", "medium", "high", "highest", "urgent"] = "medium"
    assignee_user_id: str | None = None
    assignee_employee_id: str | None = None
    due_date: date | None = None


class StakeholderSummary(BaseModel):
    interaction_count: int = 0
    open_task_count: int = 0
    completed_task_count: int = 0
    overdue_task_count: int = 0
    cari_account_linked: bool = False
    installed_asset_count: int = 0
    open_service_request_count: int = 0
    related_partner_count: int = 0
    related_representative_count: int = 0
    related_employee_count: int = 0
