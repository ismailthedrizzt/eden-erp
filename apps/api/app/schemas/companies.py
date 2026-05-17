from datetime import date
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CompanyCreate(BaseModel):
    ticari_unvan: str = Field(min_length=1, max_length=300)
    kisa_unvan: str | None = Field(default=None, min_length=1, max_length=120)
    vkn_tckn: str = Field(pattern=r"^\d{10}$")
    vergi_dairesi: str = Field(min_length=1, max_length=120)
    sirket_turu: str | None = None
    ulke: str = "Turkiye"
    il: str
    ilce: str
    adres: str
    telefon: str | None = None
    email: EmailStr | None = None
    kurulus_tarihi: date | None = None
    is_active: bool = True
    hero_images: list[dict[str, Any]] = []
    hero_documents: list[dict[str, Any]] = []


class CompanyUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    version: int
    ticari_unvan: str | None = Field(default=None, min_length=1, max_length=300)
    kisa_unvan: str | None = Field(default=None, min_length=1, max_length=120)
    vkn_tckn: str | None = Field(default=None, pattern=r"^\d{10}$")
    vergi_dairesi: str | None = Field(default=None, min_length=1, max_length=120)
    sirket_turu: str | None = None
    ulke: str | None = None
    il: str | None = None
    ilce: str | None = None
    adres: str | None = None
    telefon: str | None = None
    email: EmailStr | None = None
    kurulus_tarihi: date | None = None
    is_active: bool | None = None
    hero_images: list[dict[str, Any]] | None = None
    hero_documents: list[dict[str, Any]] | None = None
