from __future__ import annotations

from datetime import date
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


def blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def date_value(value: str | None) -> date | None:
    normalized = blank_to_none(value)
    return date.fromisoformat(normalized) if normalized else None


def ensure_official_date_order(
    *,
    decision_date: str | None,
    registration_date: str | None,
    gazette_date: str | None,
) -> None:
    decision = date_value(decision_date)
    registration = date_value(registration_date)
    gazette = date_value(gazette_date)
    if decision and registration and registration < decision:
        raise ValueError("Tescil tarihi karar tarihinden önce olamaz.")
    if decision and gazette and gazette < decision:
        raise ValueError("Ticaret sicil gazetesi tarihi karar tarihinden önce olamaz.")


class CompanyOfficialChangePrecheckResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    ok: bool
    operation_enabled: bool
    message: str
    reasons: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    blocking_reasons: list[str] = Field(default_factory=list)
    is_company_active: bool = False
    company_status: str | None = None
    record_status: str | None = None
    current: dict[str, Any] | None = None
    public_tax: dict[str, Any] | None = None
    public_sgk: dict[str, Any] | None = None
    public_registry: dict[str, Any] | None = None
    public_channels: dict[str, Any] | None = None


class CompanyOfficialChangeBaseRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    notes: str | None = None
    document_files: list[dict[str, Any]] = Field(default_factory=list)
    document_meta: dict[str, Any] = Field(default_factory=dict)
    client_request_id: str | None = None
    base_version: int | None = None
    base_updated_at: str | None = None


class TitleChangeRequest(CompanyOfficialChangeBaseRequest):
    trade_name: str | None = None
    new_trade_name: str | None = None
    short_name: str | None = None
    new_short_name: str | None = None
    decision_date: str | None = None
    registration_date: str | None = None
    trade_registry_gazette_date: str | None = None
    trade_registry_gazette_number: str | None = None
    mersis_changed: bool = False
    mersis_number: str | None = None
    new_mersis_number: str | None = None
    new_trade_registry_number: str | None = None

    @property
    def resolved_trade_name(self) -> str | None:
        return blank_to_none(self.new_trade_name) or blank_to_none(self.trade_name)

    @property
    def resolved_short_name(self) -> str | None:
        return blank_to_none(self.new_short_name) or blank_to_none(self.short_name)

    @property
    def resolved_mersis_number(self) -> str | None:
        return blank_to_none(self.new_mersis_number) or blank_to_none(self.mersis_number)

    @model_validator(mode="after")
    def validate_business_fields(self) -> TitleChangeRequest:
        if not self.resolved_trade_name:
            raise ValueError("Yeni şirket unvanı zorunludur.")
        ensure_official_date_order(
            decision_date=self.decision_date,
            registration_date=self.registration_date,
            gazette_date=self.trade_registry_gazette_date,
        )
        return self


class AddressChangeRequest(CompanyOfficialChangeBaseRequest):
    country: str | None = None
    city: str | None = None
    district: str | None = None
    neighborhood: str | None = None
    address: str | None = None
    new_country: str | None = None
    new_city: str | None = None
    new_district: str | None = None
    new_neighborhood: str | None = None
    new_address: str | None = None
    postal_code: str | None = None
    address_change_type: str | None = None
    decision_date: str | None = None
    registration_date: str | None = None
    trade_registry_gazette_date: str | None = None
    trade_registry_gazette_number: str | None = None

    @property
    def resolved_country(self) -> str | None:
        return blank_to_none(self.new_country) or blank_to_none(self.country)

    @property
    def resolved_city(self) -> str | None:
        return blank_to_none(self.new_city) or blank_to_none(self.city)

    @property
    def resolved_district(self) -> str | None:
        return blank_to_none(self.new_district) or blank_to_none(self.district)

    @property
    def resolved_neighborhood(self) -> str | None:
        return blank_to_none(self.new_neighborhood) or blank_to_none(self.neighborhood)

    @property
    def resolved_address(self) -> str | None:
        return blank_to_none(self.new_address) or blank_to_none(self.address)

    @model_validator(mode="after")
    def validate_business_fields(self) -> AddressChangeRequest:
        if not self.resolved_address:
            raise ValueError("Yeni adres zorunludur.")
        country = (self.resolved_country or "Turkiye").lower()
        if country in {"turkiye", "türkiye", "turkey", "tr"} and (
            not self.resolved_city or not self.resolved_district
        ):
            raise ValueError("Türkiye adreslerinde il ve ilçe seçimi zorunludur.")
        ensure_official_date_order(
            decision_date=self.decision_date,
            registration_date=self.registration_date,
            gazette_date=self.trade_registry_gazette_date,
        )
        return self


class PublicRegistrationUpdateRequest(CompanyOfficialChangeBaseRequest):
    tax_number: str | None = None
    tax_office: str | None = None
    trade_registry_office: str | None = None
    trade_registry_number: str | None = None
    mersis_number: str | None = None
    electronic_notification_address: str | None = None
    e_invoice_taxpayer: bool | None = None
    e_archive_taxpayer: bool | None = None
    e_waybill_taxpayer: bool | None = None
    sgk_workplace_registry_no: str | None = None
    sgk_province: str | None = None
    sgk_branch: str | None = None

    @model_validator(mode="after")
    def validate_business_fields(self) -> PublicRegistrationUpdateRequest:
        if self.tax_number is not None:
            raise ValueError("VKN bu işlem üzerinden değiştirilemez.")
        updatable_fields = {
            "tax_office",
            "trade_registry_office",
            "trade_registry_number",
            "mersis_number",
            "electronic_notification_address",
            "e_invoice_taxpayer",
            "e_archive_taxpayer",
            "e_waybill_taxpayer",
            "sgk_workplace_registry_no",
            "sgk_province",
            "sgk_branch",
        }
        if not any(field in self.model_fields_set for field in updatable_fields):
            raise ValueError("Kamu / tescil güncellemesi için en az bir alan değişmelidir.")
        return self


class NaceRow(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    nace_code_id: str | None = None
    nace_code: str | None = None
    description: str | None = None
    hazard_class: str | None = None
    is_primary: bool | None = False
    notes: str | None = None


class NaceChangeRequest(CompanyOfficialChangeBaseRequest):
    activity_subject_changes: bool = False
    nace_codes: list[NaceRow] = Field(default_factory=list)
    primary_nace_code_id: str | None = None
    secondary_nace_code_ids: list[str] = Field(default_factory=list)
    change_reason: str | None = None
    effective_date: str | None = None
    tax_activity_code_impact: bool | str | None = None
    sgk_hazard_class_impact: bool | str | None = None
    sgk_work_line_impact: bool | str | None = None

    @model_validator(mode="after")
    def validate_business_fields(self) -> NaceChangeRequest:
        if self.activity_subject_changes:
            raise ValueError(
                "ACTIVITY_SUBJECT_CHANGE_REQUIRED: "
                "Faaliyet konusu değişikliği ayrı işlemle yapılır."
            )
        if not blank_to_none(self.effective_date):
            raise ValueError("NACE güncellemesi için yürürlük tarihi zorunludur.")
        return self


class ActivitySubjectChangeRequest(CompanyOfficialChangeBaseRequest):
    activity_subject: str | None = None
    new_activity_subject: str | None = None
    change_reason: str | None = None
    nace_codes: list[NaceRow] = Field(default_factory=list)
    primary_nace_code_id: str | None = None
    secondary_nace_code_ids: list[str] = Field(default_factory=list)
    decision_date: str | None = None
    registration_date: str | None = None
    trade_registry_gazette_date: str | None = None
    trade_registry_gazette_number: str | None = None
    mersis_impact: bool | str | None = None
    tax_office_impact: bool | str | None = None
    sgk_hazard_class_impact: bool | str | None = None

    @property
    def resolved_activity_subject(self) -> str | None:
        return blank_to_none(self.new_activity_subject) or blank_to_none(self.activity_subject)

    @model_validator(mode="after")
    def validate_business_fields(self) -> ActivitySubjectChangeRequest:
        if not self.resolved_activity_subject:
            raise ValueError("Yeni faaliyet konusu zorunludur.")
        if not blank_to_none(self.decision_date):
            raise ValueError("Faaliyet konusu değişikliği için karar tarihi zorunludur.")
        ensure_official_date_order(
            decision_date=self.decision_date,
            registration_date=self.registration_date,
            gazette_date=self.trade_registry_gazette_date,
        )
        return self
