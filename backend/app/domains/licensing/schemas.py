from __future__ import annotations

# ruff: noqa: E501, I001

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


LicenseStatus = Literal[
    "trial",
    "active",
    "past_due",
    "suspended",
    "cancelled",
    "expired",
    "development",
    "internal",
    "archived",
]


class LicensedProductCreateRequest(BaseModel):
    product_key: str = Field(min_length=2, max_length=80)
    product_name: str = Field(min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=1000)
    status: str = Field(default="active", max_length=32)
    metadata_json: dict[str, Any] = Field(default_factory=dict)

    @field_validator("product_key")
    @classmethod
    def safe_product_key(cls, value: str) -> str:
        return _safe_key(value)


class LicensedProductUpdateRequest(BaseModel):
    product_name: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=1000)
    status: str | None = Field(default=None, max_length=32)
    metadata_json: dict[str, Any] | None = None


class ProductPlanCreateRequest(BaseModel):
    plan_key: str = Field(min_length=2, max_length=80)
    plan_name: str = Field(min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=1000)
    status: str = Field(default="active", max_length=32)
    business_size_label: str | None = Field(default=None, max_length=160)
    default_billing_period: str = Field(default="monthly", max_length=32)
    base_price: float | None = None
    currency: str = Field(default="TRY", max_length=3)
    trial_days: int = 14
    support_level: str = Field(default="standard", max_length=32)
    visible_in_setup: bool = True
    is_development_plan: bool = False
    sort_order: int = 100
    metadata_json: dict[str, Any] = Field(default_factory=dict)

    @field_validator("plan_key")
    @classmethod
    def safe_plan_key(cls, value: str) -> str:
        return _safe_key(value)

    @field_validator("currency")
    @classmethod
    def uppercase_currency(cls, value: str) -> str:
        return value.upper()


class ProductPlanUpdateRequest(BaseModel):
    plan_name: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=1000)
    status: str | None = Field(default=None, max_length=32)
    business_size_label: str | None = Field(default=None, max_length=160)
    default_billing_period: str | None = Field(default=None, max_length=32)
    base_price: float | None = None
    currency: str | None = Field(default=None, max_length=3)
    trial_days: int | None = None
    support_level: str | None = Field(default=None, max_length=32)
    visible_in_setup: bool | None = None
    is_development_plan: bool | None = None
    sort_order: int | None = None
    metadata_json: dict[str, Any] | None = None


class PlanModulePatchRequest(BaseModel):
    modules: list[dict[str, Any]] = Field(default_factory=list)


class PlanFeaturePatchRequest(BaseModel):
    features: list[dict[str, Any]] = Field(default_factory=list)


class TenantLicenseCreateRequest(BaseModel):
    tenant_id: str = Field(min_length=1)
    product_id: str | None = None
    product_key: str = "eden_erp"
    product_plan_id: str | None = None
    plan_key: str = "medium"
    license_key: str | None = Field(default=None, max_length=160)
    status: LicenseStatus = "trial"
    starts_at: str | None = None
    ends_at: str | None = None
    renews_at: str | None = None
    billing_period: str = "monthly"
    price: float | None = None
    currency: str = "TRY"
    payment_status: str = "pending"
    max_users: int | None = None
    max_companies: int | None = None
    max_branches: int | None = None
    max_storage_mb: int | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)

    @field_validator("product_key", "plan_key")
    @classmethod
    def safe_keys(cls, value: str) -> str:
        return _safe_key(value)


class TenantLicenseUpdateRequest(BaseModel):
    status: LicenseStatus | None = None
    starts_at: str | None = None
    ends_at: str | None = None
    renews_at: str | None = None
    billing_period: str | None = None
    price: float | None = None
    currency: str | None = None
    payment_status: str | None = None
    max_users: int | None = None
    max_companies: int | None = None
    max_branches: int | None = None
    max_storage_mb: int | None = None
    metadata_json: dict[str, Any] | None = None


class TenantLicensePlanChangeRequest(BaseModel):
    plan_key: str | None = None
    product_plan_id: str | None = None
    reason: str | None = Field(default=None, max_length=500)


class TenantLicensePaymentCreateRequest(BaseModel):
    period_start: str | None = None
    period_end: str | None = None
    amount: float
    currency: str = "TRY"
    payment_status: str = "paid"
    paid_at: str | None = None
    payment_reference: str | None = Field(default=None, max_length=160)
    notes: str | None = Field(default=None, max_length=1000)
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class TenantUsageSnapshotCreateRequest(BaseModel):
    active_users: int | None = None
    companies_count: int | None = None
    branches_count: int | None = None
    storage_used_mb: int | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class TenantEntitlementResponse(BaseModel):
    tenant_id: str
    product_key: str
    plan_key: str
    license_status: str
    is_development: bool
    enabled_modules: list[str] = Field(default_factory=list)
    enabled_features: list[str] = Field(default_factory=list)
    limits: dict[str, int | None] = Field(default_factory=dict)
    source: str = "catalog_fallback"
    warnings: list[str] = Field(default_factory=list)


def _safe_key(value: str) -> str:
    cleaned = value.strip().lower().replace("-", "_")
    if not cleaned or any(not (char.isalnum() or char == "_") for char in cleaned):
        raise ValueError("Only lowercase letters, numbers and underscore are allowed.")
    return cleaned
