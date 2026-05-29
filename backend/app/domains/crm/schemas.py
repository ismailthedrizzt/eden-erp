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
LeadStatus = Literal["new", "contacted", "qualified", "unqualified", "converted", "proposal", "won", "lost"]
InteractionType = Literal[
    "note",
    "phone_call",
    "email",
    "meeting",
    "video_call",
    "visit",
    "proposal_sent",
    "proposal_reviewed",
    "demo_done",
    "negotiation",
    "complaint",
    "service_contact",
    "followup_completed",
    "other",
]
LeadSource = Literal["manual", "website", "referral", "event", "exhibition", "phone", "email", "social_media", "partner", "import", "other"]
OpportunityStatus = Literal["open", "won", "lost", "cancelled"]
StageType = Literal["open", "won", "lost"]
ProposalStatus = Literal["not_started", "draft", "sent", "accepted", "rejected"]
InteractionDirection = Literal["inbound", "outbound", "internal"]


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

    stakeholder_id: str | None = None
    lead_id: str | None = None
    opportunity_id: str | None = None
    interaction_type: InteractionType = "note"
    subject: str = Field(min_length=1, max_length=300)
    body: str | None = None
    interaction_date: datetime | None = None
    direction: InteractionDirection = "outbound"
    contact_person: str | None = Field(default=None, max_length=240)
    next_followup_date: date | None = None
    related_task_id: str | None = None
    related_document_id: str | None = None
    attachments: list[dict[str, Any]] = Field(default_factory=list)
    outcome: str | None = None


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


class LeadListQuery(BaseModel):
    company_id: str | None = None
    lead_status: str | None = None
    source: str | None = None
    assigned_owner_user_id: str | None = None
    next_followup_before: date | None = None
    tag: str | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50
    sort: str = "updated_at"
    direction: str = "desc"


class LeadCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str
    stakeholder_id: str | None = None
    master_entity_type: MasterEntityType | None = None
    master_entity_id: str | None = None
    lead_name: str = Field(min_length=1, max_length=300)
    contact_name: str | None = Field(default=None, max_length=240)
    phone: str | None = Field(default=None, max_length=80)
    email: str | None = Field(default=None, max_length=254)
    company_name: str | None = Field(default=None, max_length=300)
    sector: str | None = Field(default=None, max_length=160)
    source: LeadSource = "manual"
    lead_status: LeadStatus = "new"
    qualification_score: Decimal | None = Field(default=None, ge=0, le=100)
    interest_area: str | None = Field(default=None, max_length=240)
    product_interest: str | None = Field(default=None, max_length=300)
    estimated_value: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default="TRY", min_length=3, max_length=3)
    expected_close_date: date | None = None
    assigned_owner_user_id: str | None = None
    next_followup_date: date | None = None
    lost_reason: str | None = None
    notes: str | None = None
    tags: list[str] = Field(default_factory=list)
    metadata_json: dict[str, Any] = Field(default_factory=dict)

    @field_validator("currency")
    @classmethod
    def normalize_currency_optional(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class LeadUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    stakeholder_id: str | None = None
    master_entity_type: MasterEntityType | None = None
    master_entity_id: str | None = None
    lead_name: str | None = Field(default=None, min_length=1, max_length=300)
    contact_name: str | None = Field(default=None, max_length=240)
    phone: str | None = Field(default=None, max_length=80)
    email: str | None = Field(default=None, max_length=254)
    company_name: str | None = Field(default=None, max_length=300)
    sector: str | None = Field(default=None, max_length=160)
    source: LeadSource | None = None
    lead_status: LeadStatus | None = None
    qualification_score: Decimal | None = Field(default=None, ge=0, le=100)
    interest_area: str | None = Field(default=None, max_length=240)
    product_interest: str | None = Field(default=None, max_length=300)
    estimated_value: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    expected_close_date: date | None = None
    assigned_owner_user_id: str | None = None
    next_followup_date: date | None = None
    last_contacted_at: datetime | None = None
    lost_reason: str | None = None
    notes: str | None = None
    tags: list[str] | None = None
    metadata_json: dict[str, Any] | None = None
    base_version: int | None = None

    @field_validator("currency")
    @classmethod
    def normalize_currency_optional(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class LeadQualifyRequest(BaseModel):
    qualification_score: Decimal | None = Field(default=None, ge=0, le=100)
    notes: str | None = None
    create_opportunity: bool = False


class LeadMarkLostRequest(BaseModel):
    lost_reason: str = Field(min_length=1, max_length=500)
    notes: str | None = None


class LeadConvertRequest(BaseModel):
    stakeholder_type: Literal["customer", "lead", "other"] = "customer"
    relationship_status: RelationshipStatus = "active"
    customer_status: CustomerStatus = "active_customer"
    create_stakeholder: bool = True
    create_opportunity: bool = True
    create_cari_account: bool = False
    opportunity_name: str | None = Field(default=None, max_length=300)
    notes: str | None = None


class PipelineCreateRequest(BaseModel):
    company_id: str | None = None
    pipeline_name: str = Field(min_length=1, max_length=220)
    active: bool = True
    is_default: bool = False
    stages: list[dict[str, Any]] | None = None


class PipelineStageUpdateRequest(BaseModel):
    stage_name: str | None = Field(default=None, min_length=1, max_length=180)
    order_index: int | None = Field(default=None, ge=0)
    probability: Decimal | None = Field(default=None, ge=0, le=100)
    stage_type: StageType | None = None
    requires_next_action: bool | None = None
    active: bool | None = None


class OpportunityListQuery(BaseModel):
    company_id: str | None = None
    stakeholder_id: str | None = None
    lead_id: str | None = None
    pipeline_id: str | None = None
    stage_id: str | None = None
    status: str | None = None
    assigned_owner_user_id: str | None = None
    expected_close_before: date | None = None
    next_followup_before: date | None = None
    tag: str | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50
    sort: str = "updated_at"
    direction: str = "desc"


class OpportunityCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str
    stakeholder_id: str | None = None
    lead_id: str | None = None
    opportunity_no: str | None = Field(default=None, max_length=80)
    opportunity_name: str = Field(min_length=1, max_length=300)
    customer_name: str = Field(min_length=1, max_length=300)
    pipeline_id: str | None = None
    stage_id: str | None = None
    status: OpportunityStatus = "open"
    estimated_value: Decimal | None = Field(default=None, ge=0)
    probability: Decimal | None = Field(default=None, ge=0, le=100)
    currency: str | None = Field(default="TRY", min_length=3, max_length=3)
    expected_close_date: date | None = None
    assigned_owner_user_id: str | None = None
    source: str | None = Field(default=None, max_length=120)
    product_interest: str | None = Field(default=None, max_length=300)
    related_product_ids: list[str] = Field(default_factory=list)
    related_service_ids: list[str] = Field(default_factory=list)
    next_followup_date: date | None = None
    notes: str | None = None
    tags: list[str] = Field(default_factory=list)
    metadata_json: dict[str, Any] = Field(default_factory=dict)

    @field_validator("currency")
    @classmethod
    def normalize_currency_optional(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class OpportunityUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    stakeholder_id: str | None = None
    lead_id: str | None = None
    opportunity_name: str | None = Field(default=None, min_length=1, max_length=300)
    customer_name: str | None = Field(default=None, min_length=1, max_length=300)
    pipeline_id: str | None = None
    stage_id: str | None = None
    status: OpportunityStatus | None = None
    estimated_value: Decimal | None = Field(default=None, ge=0)
    probability: Decimal | None = Field(default=None, ge=0, le=100)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    expected_close_date: date | None = None
    actual_close_date: date | None = None
    assigned_owner_user_id: str | None = None
    source: str | None = None
    product_interest: str | None = None
    related_product_ids: list[str] | None = None
    related_service_ids: list[str] | None = None
    next_followup_date: date | None = None
    lost_reason: str | None = None
    won_reason: str | None = None
    competitor_name: str | None = None
    proposal_status: ProposalStatus | None = None
    proposal_document_id: str | None = None
    proposal_amount: Decimal | None = Field(default=None, ge=0)
    proposal_sent_at: datetime | None = None
    proposal_valid_until: date | None = None
    notes: str | None = None
    tags: list[str] | None = None
    metadata_json: dict[str, Any] | None = None
    base_version: int | None = None


class OpportunityStageChangeRequest(BaseModel):
    stage_id: str
    reason: str | None = None
    next_followup_date: date | None = None
    expected_close_date: date | None = None
    probability: Decimal | None = Field(default=None, ge=0, le=100)


class OpportunityWinRequest(BaseModel):
    actual_close_date: date | None = None
    won_reason: str | None = None
    activate_customer: bool = True
    create_cari_account: bool = False


class OpportunityLostRequest(BaseModel):
    lost_reason: str = Field(min_length=1, max_length=500)
    competitor_name: str | None = Field(default=None, max_length=240)
    future_followup_date: date | None = None


class OpportunityFollowupTaskRequest(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    description: str | None = None
    priority: Literal["lowest", "low", "medium", "high", "highest", "urgent"] = "medium"
    assignee_user_id: str | None = None
    due_date: date | None = None


class OpportunityProposalUploadRequest(BaseModel):
    proposal_document_id: str
    proposal_status: ProposalStatus = "sent"
    proposal_amount: Decimal | None = Field(default=None, ge=0)
    proposal_sent_at: datetime | None = None
    proposal_valid_until: date | None = None


class InteractionListQuery(BaseModel):
    stakeholder_id: str | None = None
    lead_id: str | None = None
    opportunity_id: str | None = None
    interaction_type: str | None = None
    page: int = 1
    page_size: int = 50


class FollowupDueQuery(BaseModel):
    company_id: str | None = None
    owner_user_id: str | None = None
    entity_type: Literal["lead", "opportunity"] | None = None
    due_until: date | None = None
    limit: int = 100


class FollowupCompleteRequest(BaseModel):
    subject: str | None = Field(default=None, max_length=300)
    body: str | None = None
    outcome: str | None = None
    next_followup_date: date | None = None
    related_task_id: str | None = None


class FollowupSnoozeRequest(BaseModel):
    next_followup_date: date
    notes: str | None = None
