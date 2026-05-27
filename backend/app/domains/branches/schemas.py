from __future__ import annotations

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

BranchType = Literal["official_branch", "liaison_office", "operation_point", "warehouse_facility"]
OrganizationUnitAction = Literal["deactivate", "reassign", "keep_open"]
FacilityAction = Literal["deactivate", "keep_open", "reuse"]


class BranchCardUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    branch_short_name: str | None = None
    phone: str | None = None
    email: str | None = None
    responsible_person_id: str | None = None
    organization_unit_id: str | None = None
    facility_id: str | None = None
    notes: str | None = None
    metadata_json: dict[str, Any] | None = None
    base_version: int | None = None
    base_updated_at: str | None = None


class BranchDetailResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    branch: dict[str, Any]
    company: dict[str, Any] | None = None
    organization_unit: dict[str, Any] | None = None
    facility: dict[str, Any] | None = None
    representative_authorities_summary: dict[str, Any] = Field(default_factory=dict)
    official_change_history: list[dict[str, Any]] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


def _blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _date_value(value: str | None) -> date | None:
    normalized = _blank_to_none(value)
    return date.fromisoformat(normalized) if normalized else None


def _ensure_date_order(
    *,
    decision_date: str | None,
    registration_date: str | None,
    gazette_date: str | None,
) -> None:
    decision = _date_value(decision_date)
    registration = _date_value(registration_date)
    gazette = _date_value(gazette_date)
    if decision and registration and registration < decision:
        raise ValueError("Tescil tarihi karar tarihinden önce olamaz.")
    if registration and gazette and gazette < registration:
        raise ValueError("Ticaret sicil gazetesi tarihi tescil tarihinden önce olamaz.")


class BranchOpeningRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str | None = None
    branch_name: str | None = None
    branch_short_name: str | None = None
    branch_type: BranchType = "official_branch"
    is_official_branch: bool = True
    country: str = "Turkiye"
    city: str | None = None
    district: str | None = None
    neighborhood: str | None = None
    address: str | None = None
    postal_code: str | None = None
    phone: str | None = None
    email: str | None = None
    opening_decision_date: str | None = None
    opening_registration_date: str | None = None
    trade_registry_gazette_date: str | None = None
    trade_registry_gazette_number: str | None = None
    trade_registry_number: str | None = None
    trade_registry_office: str | None = None
    tax_office: str | None = None
    sgk_workplace_registry_no: str | None = None
    responsible_person_id: str | None = None
    create_organization_unit: bool = True
    organization_unit_name: str | None = None
    parent_organization_unit_id: str | None = None
    create_facility: bool = False
    facility_name: str | None = None
    notes: str | None = None
    document_files: list[dict[str, Any]] = Field(default_factory=list)
    document_meta: dict[str, Any] = Field(default_factory=dict)
    client_request_id: str | None = None
    base_version: int | None = None
    base_updated_at: str | None = None

    @model_validator(mode="after")
    def validate_business_fields(self) -> BranchOpeningRequest:
        if not _blank_to_none(self.branch_name):
            raise ValueError("Şube adı zorunludur.")
        if not _blank_to_none(self.address):
            raise ValueError("Açık adres zorunludur.")

        country = (_blank_to_none(self.country) or "").lower()
        is_turkey = country in {"turkiye", "türkiye", "turkey", "tr"}
        if is_turkey and (not _blank_to_none(self.city) or not _blank_to_none(self.district)):
            raise ValueError("Türkiye adreslerinde il ve ilçe seçimi zorunludur.")

        if self.is_official_branch or self.branch_type == "official_branch":
            if not self.opening_decision_date or not self.opening_registration_date:
                raise ValueError("Resmi şube açılışı için karar ve tescil tarihi zorunludur.")
            if not self.document_files:
                raise ValueError(
                    "Resmi şube açılışı için en az bir karar/tescil belgesi eklenmelidir."
                )

        _ensure_date_order(
            decision_date=self.opening_decision_date,
            registration_date=self.opening_registration_date,
            gazette_date=self.trade_registry_gazette_date,
        )
        return self


class BranchClosingRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    branch_id: str | None = None
    closing_reason: str | None = None
    closing_decision_date: str | None = None
    closing_registration_date: str | None = None
    trade_registry_gazette_date: str | None = None
    trade_registry_gazette_number: str | None = None
    sgk_closing_notification: bool = False
    tax_office_notification: bool = False
    organization_unit_action: OrganizationUnitAction = "keep_open"
    target_organization_unit_id: str | None = None
    facility_action: FacilityAction = "keep_open"
    notes: str | None = None
    document_files: list[dict[str, Any]] = Field(default_factory=list)
    document_meta: dict[str, Any] = Field(default_factory=dict)
    client_request_id: str | None = None
    base_version: int | None = None
    base_updated_at: str | None = None

    @model_validator(mode="after")
    def validate_business_fields(self) -> BranchClosingRequest:
        if not _blank_to_none(self.branch_id):
            raise ValueError("Kapatılacak şube seçilmelidir.")
        if not _blank_to_none(self.closing_reason):
            raise ValueError("Şube kapanış nedeni zorunludur.")
        if not _blank_to_none(self.closing_decision_date):
            raise ValueError("Şube kapanış karar tarihi zorunludur.")
        if self.organization_unit_action == "reassign" and not _blank_to_none(
            self.target_organization_unit_id
        ):
            raise ValueError(
                "Organizasyon birimi başka birime bağlanacaksa hedef birim seçilmelidir."
            )

        _ensure_date_order(
            decision_date=self.closing_decision_date,
            registration_date=self.closing_registration_date,
            gazette_date=self.trade_registry_gazette_date,
        )
        return self
