from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

PartnerOwnerKind = Literal["person", "organization"]


class PartnerCreateDraftRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str
    partner_type: PartnerOwnerKind = "person"
    owner_kind: PartnerOwnerKind | None = None
    person_id: str | None = None
    organization_id: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    trade_name: str | None = None
    short_name: str | None = None
    identity_number: str | None = None
    national_id: str | None = None
    passport_no: str | None = None
    nationality: str | None = None
    tax_number: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None
    district: str | None = None
    country: str | None = None
    partner_documents: list[dict[str, Any]] = Field(default_factory=list)
    photo_logo: list[dict[str, Any]] = Field(default_factory=list)
    notes: str | None = None
    contact_points: list[dict[str, Any]] = Field(default_factory=list)
    entity_bank_accounts: list[dict[str, Any]] = Field(default_factory=list)
    client_request_id: str | None = None


class PartnerCardUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    first_name: str | None = None
    last_name: str | None = None
    trade_name: str | None = None
    short_name: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None
    district: str | None = None
    country: str | None = None
    partner_documents: list[dict[str, Any]] | None = None
    photo_logo: list[dict[str, Any]] | None = None
    notes: str | None = None
    contact_points: list[dict[str, Any]] | None = None
    entity_bank_accounts: list[dict[str, Any]] | None = None
    base_version: int | None = None
    base_updated_at: str | None = None
