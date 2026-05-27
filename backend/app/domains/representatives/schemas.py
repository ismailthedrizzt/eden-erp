from __future__ import annotations

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

ScopeType = Literal["company_wide", "branch", "organization_unit", "facility"]
RepresentativeAuthorityTransactionType = Literal[
    "Temsilcilik Başlatma",
    "Yetki Yenileme",
    "Yetki Kapsamı Değişikliği",
    "Limit Değişikliği",
    "Askıya Alma",
    "Sonlandırma",
    "Düzeltme Kaydı",
    "Ters Kayıt",
]

AUTHORITY_TRANSACTION_TYPES: set[str] = {
    "Temsilcilik Başlatma",
    "Yetki Yenileme",
    "Yetki Kapsamı Değişikliği",
    "Limit Değişikliği",
    "Askıya Alma",
    "Sonlandırma",
    "Düzeltme Kaydı",
    "Ters Kayıt",
}

AUTHORITY_CONTROLLED_FIELDS: set[str] = {
    "status",
    "record_status",
    "authority_status",
    "authority_record_status",
    "authority_effect_status",
    "transaction_status",
    "approval_status",
    "workflow_status",
    "start_date",
    "end_date",
    "primary_authority_type",
    "authority_type",
    "authority_types",
    "job_title",
    "signature_type",
    "authority_limit",
    "transaction_limit",
    "payment_approval_limit",
    "purchase_approval_limit",
    "bank_transaction_limit",
    "contract_signature_limit",
    "currency",
    "requires_joint_signature",
    "can_approve_alone",
    "bank_authority_level",
    "department_scope",
    "gib_permissions",
    "sgk_permissions",
    "scope_type",
    "branch_id",
    "organization_unit_id",
    "facility_id",
    "scope",
    "scope_label",
    "scope_notes",
    "current_authority",
    "authority_transaction_history",
}


class RepresentativeAuthorityScope(BaseModel):
    model_config = ConfigDict(extra="allow")

    scope_type: ScopeType = "company_wide"
    branch_id: str | None = None
    organization_unit_id: str | None = None
    facility_id: str | None = None
    scope_label: str | None = None
    scope_notes: str | None = None

    @model_validator(mode="after")
    def validate_shape(self) -> RepresentativeAuthorityScope:
        if self.scope_type == "company_wide":
            if self.branch_id or self.organization_unit_id or self.facility_id:
                raise ValueError("Sirket geneli yetkide sube, organizasyon veya tesis secilmez.")
        if self.scope_type == "branch" and not self.branch_id:
            raise ValueError("Sube kapsami icin sube secilmelidir.")
        if self.scope_type == "organization_unit" and not self.organization_unit_id:
            raise ValueError("Organizasyon birimi kapsami icin birim secilmelidir.")
        if self.scope_type == "facility" and not self.facility_id:
            raise ValueError("Tesis/lokasyon kapsami icin tesis secilmelidir.")
        return self


class RepresentativeAuthorityTransactionRequest(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    transaction_type: RepresentativeAuthorityTransactionType
    authority_action: bool = True
    authority_types: list[str] = Field(default_factory=list)
    primary_authority_type: str | None = None
    signature_type: str | None = None
    authority_limit: float | None = None
    transaction_limit: float | None = None
    payment_approval_limit: float | None = None
    purchase_approval_limit: float | None = None
    bank_transaction_limit: float | None = None
    contract_signature_limit: float | None = None
    currency: str = "TRY"
    requires_joint_signature: bool = False
    can_approve_alone: bool = False
    bank_authority_level: str | None = None
    department_scope: str | None = None
    gib_permissions: list[str] | dict[str, Any] | None = None
    sgk_permissions: list[str] | dict[str, Any] | None = None
    effective_date: date | None = None
    end_date: date | None = None
    reason: str | None = None
    termination_reason: str | None = None
    notes: str | None = None
    document_files: list[dict[str, Any]] = Field(default_factory=list)
    authority_documents: list[dict[str, Any]] = Field(default_factory=list)
    document_meta: dict[str, Any] | None = None
    scope_type: ScopeType = "company_wide"
    branch_id: str | None = None
    organization_unit_id: str | None = None
    facility_id: str | None = None
    scope_label: str | None = None
    scope_notes: str | None = None
    reversal_transaction_id: str | None = None
    correction_transaction_id: str | None = None
    client_request_id: str | None = None
    base_version: int | None = None
    base_updated_at: str | None = None

    @field_validator("authority_types", mode="before")
    @classmethod
    def normalize_authority_types(cls, value: Any) -> list[str]:
        source = value if isinstance(value, list) else [value]
        normalized = [str(item).strip() for item in source if str(item or "").strip()]
        return list(dict.fromkeys(normalized))

    @model_validator(mode="after")
    def validate_request_shape(self) -> RepresentativeAuthorityTransactionRequest:
        RepresentativeAuthorityScope(
            scope_type=self.scope_type,
            branch_id=self.branch_id,
            organization_unit_id=self.organization_unit_id,
            facility_id=self.facility_id,
            scope_label=self.scope_label,
            scope_notes=self.scope_notes,
        )
        if self.end_date and self.effective_date and self.end_date < self.effective_date:
            raise ValueError("Bitis tarihi yururluk tarihinden once olamaz.")
        return self

    def scope_model(self) -> RepresentativeAuthorityScope:
        return RepresentativeAuthorityScope(
            scope_type=self.scope_type,
            branch_id=self.branch_id,
            organization_unit_id=self.organization_unit_id,
            facility_id=self.facility_id,
            scope_label=self.scope_label,
            scope_notes=self.scope_notes,
        )

    def document_list(self) -> list[dict[str, Any]]:
        return self.document_files or self.authority_documents or []


class CurrentRepresentativeAuthority(BaseModel):
    model_config = ConfigDict(extra="allow")

    representative_id: str
    company_id: str
    authority_status: str | None = None
    authority_record_status: str | None = None
    authority_types: list[str] = Field(default_factory=list)
    primary_authority_type: str | None = None
    signature_type: str | None = None
    transaction_limit: float | None = None
    currency: str | None = None
    effective_date: date | str | None = None
    end_date: date | str | None = None
    scope_type: ScopeType = "company_wide"
    branch_id: str | None = None
    branch_name: str | None = None
    organization_unit_id: str | None = None
    organization_unit_name: str | None = None
    facility_id: str | None = None
    facility_name: str | None = None
    scope_label: str | None = None
    scope_notes: str | None = None
    warnings: list[str] = Field(default_factory=list)


class RepresentativeAuthorityTransactionResponse(BaseModel):
    representative: dict[str, Any]
    transaction: dict[str, Any]
    current_authority: dict[str, Any] | None = None
    warnings: list[str] = Field(default_factory=list)


class RepresentativeCardUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    first_name: str | None = None
    last_name: str | None = None
    trade_name: str | None = None
    short_name: str | None = None
    display_name: str | None = None
    full_name: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None
    district: str | None = None
    country: str | None = None
    notes: str | None = None
    photo_logo: list[dict[str, Any]] | None = None
    representative_documents: list[dict[str, Any]] | None = None
    authority_documents: list[dict[str, Any]] | None = None
    representative_profile: dict[str, Any] | None = None
    contact_points: list[dict[str, Any]] | None = None
    entity_bank_accounts: list[dict[str, Any]] | None = None
    base_version: int | None = None
    base_updated_at: str | None = None


class RepresentativeCreateDraftRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str
    person_kind: Literal["person", "organization"] = "person"
    person_or_entity_type: Literal["person", "organization"] | None = None
    person_id: str | None = None
    organization_id: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    trade_name: str | None = None
    short_name: str | None = None
    display_name: str | None = None
    full_name: str | None = None
    identity_number: str | None = None
    national_id: str | None = None
    passport_no: str | None = None
    nationality: str | None = None
    tax_number: str | None = None
    source_type: str | None = None
    source_id: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None
    district: str | None = None
    country: str | None = None
    representative_documents: list[dict[str, Any]] = Field(default_factory=list)
    photo_logo: list[dict[str, Any]] = Field(default_factory=list)
    notes: str | None = None
    contact_points: list[dict[str, Any]] = Field(default_factory=list)
    entity_bank_accounts: list[dict[str, Any]] = Field(default_factory=list)
    client_request_id: str | None = None
