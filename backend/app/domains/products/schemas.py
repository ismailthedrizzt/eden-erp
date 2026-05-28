from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

ProductType = Literal[
    "physical_product",
    "software",
    "service",
    "subscription",
    "bundle",
    "spare_part",
    "consumable",
]


class ListResult(BaseModel):
    data: list[dict[str, Any]]
    meta: dict[str, int]


class ProductListQuery(BaseModel):
    company_id: str | None = None
    product_type: str | None = None
    category: str | None = None
    brand: str | None = None
    active: bool | None = None
    after_sales_enabled: bool | None = None
    maintenance_required: bool | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50
    sort: str = "updated_at"
    direction: str = "desc"


class ProductCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str | None = None
    product_code: str | None = Field(default=None, max_length=80)
    product_name: str = Field(min_length=1, max_length=240)
    product_type: ProductType = "physical_product"
    category: str | None = Field(default=None, max_length=120)
    brand: str | None = Field(default=None, max_length=120)
    model: str | None = Field(default=None, max_length=160)
    description: str | None = None
    unit: str | None = Field(default=None, max_length=40)
    serial_required: bool = False
    warranty_months: int | None = Field(default=None, ge=0, le=600)
    maintenance_required: bool = False
    maintenance_period_days: int | None = Field(default=None, ge=1, le=3650)
    serviceable: bool = True
    active: bool = True
    sale_enabled: bool = True
    after_sales_enabled: bool = False
    default_currency: str | None = Field(default=None, max_length=8)
    default_price: Decimal | None = Field(default=None, ge=0)
    technical_specs: dict[str, Any] = Field(default_factory=dict)
    document_files: list[dict[str, Any]] = Field(default_factory=list)
    notes: str | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class ProductUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str | None = None
    product_code: str | None = Field(default=None, max_length=80)
    product_name: str | None = Field(default=None, min_length=1, max_length=240)
    product_type: ProductType | None = None
    category: str | None = Field(default=None, max_length=120)
    brand: str | None = Field(default=None, max_length=120)
    model: str | None = Field(default=None, max_length=160)
    description: str | None = None
    unit: str | None = Field(default=None, max_length=40)
    serial_required: bool | None = None
    warranty_months: int | None = Field(default=None, ge=0, le=600)
    maintenance_required: bool | None = None
    maintenance_period_days: int | None = Field(default=None, ge=1, le=3650)
    serviceable: bool | None = None
    active: bool | None = None
    sale_enabled: bool | None = None
    after_sales_enabled: bool | None = None
    default_currency: str | None = Field(default=None, max_length=8)
    default_price: Decimal | None = Field(default=None, ge=0)
    technical_specs: dict[str, Any] | None = None
    document_files: list[dict[str, Any]] | None = None
    notes: str | None = None
    metadata_json: dict[str, Any] | None = None
    base_version: int | None = None


class ProductSummary(BaseModel):
    total_products: int = 0
    active_products: int = 0
    after_sales_enabled: int = 0
    maintenance_required: int = 0
    by_type: dict[str, int] = Field(default_factory=dict)


class WarrantyPreview(BaseModel):
    warranty_start_date: date | None = None
    warranty_end_date: date | None = None
    warranty_status: str = "unknown"
