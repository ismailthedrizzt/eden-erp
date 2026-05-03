from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class PersonCreate(BaseModel):
    first_name: str | None = Field(default=None, max_length=120)
    last_name: str | None = Field(default=None, max_length=120)
    full_name: str | None = Field(default=None, max_length=260)
    nationality: str = Field(default="TR", max_length=30)
    national_id: str | None = Field(default=None, max_length=40)
    passport_no: str | None = Field(default=None, max_length=60)
    birth_date: date | None = None
    birth_place: str | None = None
    gender: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None
    metadata_json: dict[str, Any] = {}

    @model_validator(mode="after")
    def ensure_name(self):
        full_name = self.full_name or " ".join([item for item in [self.first_name, self.last_name] if item]).strip()
        if not full_name:
            raise ValueError("full_name or first_name/last_name is required")
        self.full_name = full_name
        return self


class PersonSearch(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    full_name: str | None = None
    nationality: str = "TR"
    national_id: str | None = None
    passport_no: str | None = None
    birth_date: date | None = None


class OrganizationCreate(BaseModel):
    legal_name: str = Field(min_length=1, max_length=300)
    short_name: str | None = Field(default=None, max_length=160)
    country: str = Field(default="TR", max_length=30)
    tax_number: str | None = Field(default=None, max_length=60)
    registration_number: str | None = Field(default=None, max_length=80)
    tax_office: str | None = None
    organization_type: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None
    city: str | None = None
    district: str | None = None
    metadata_json: dict[str, Any] = {}


class OrganizationSearch(BaseModel):
    legal_name: str | None = None
    country: str = "TR"
    tax_number: str | None = None
    registration_number: str | None = None


class IdentityMatch(BaseModel):
    model_config = ConfigDict(extra="allow")

    strength: Literal["exact", "weak"]
    match_type: str
    message: str
    record: dict[str, Any]
