from __future__ import annotations

from typing import Any, Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, model_validator

from app.domains.ownership.schemas import (
    CapitalIncreaseDistributionRow,
    CurrentOwnershipRow,
)

DistributionMode = Literal["proportional", "manual"]


class CapitalIncreasePrecheckResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    ok: bool
    operation_enabled: bool
    message: str
    warnings: list[str] = Field(default_factory=list)
    blocking_reasons: list[str] = Field(default_factory=list)
    reasons: list[str] = Field(default_factory=list)
    company: dict[str, Any] | None = None
    current_capital_amount: float = 0
    paid_capital_amount: float = 0
    unpaid_capital_amount: float = 0
    currency: str = "TRY"
    partners: list[dict[str, Any]] = Field(default_factory=list)
    active_partners: list[dict[str, Any]] = Field(default_factory=list)
    draft_partners: list[dict[str, Any]] = Field(default_factory=list)
    current_ownership: list[CurrentOwnershipRow] = Field(default_factory=list)
    current_ownership_distribution: list[dict[str, Any]] = Field(default_factory=list)
    total_share_ratio: float = 0
    total_capital_amount: float = 0
    ownership_valid: bool = False
    has_full_share_distribution: bool = False
    distribution_modes: list[DistributionMode] = Field(default_factory=list)
    required_documents: list[str] = Field(default_factory=list)
    module_readiness: dict[str, Any] = Field(default_factory=dict)
    dependency_code: str | None = None
    dependency_details: dict[str, Any] | None = None


class CapitalIncreaseRequest(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    transaction_date: str
    decision_date: str | None = None
    registration_date: str | None = None
    effective_date: str | None = None
    old_capital_amount: float
    increase_amount: float
    new_capital_amount: float
    currency: str = "TRY"
    increase_type: str | None = None
    increase_reason: str
    distribution_mode: DistributionMode = Field(
        default="proportional",
        validation_alias=AliasChoices("distribution_mode", "distribution_method"),
    )
    distribution_rows: list[CapitalIncreaseDistributionRow] = Field(
        default_factory=list,
        validation_alias=AliasChoices("distribution_rows", "participants"),
    )
    paid_amount: float | None = None
    notes: str | None = None
    document_files: list[dict[str, Any]] = Field(default_factory=list)
    document_meta: dict[str, Any] = Field(default_factory=dict)
    client_request_id: str | None = None
    base_version: int | None = None
    base_updated_at: str | None = None

    @model_validator(mode="after")
    def validate_amount_shape(self) -> CapitalIncreaseRequest:
        if self.increase_amount <= 0:
            raise ValueError("Artirilacak tutar 0'dan buyuk olmalidir.")
        if self.new_capital_amount <= self.old_capital_amount:
            raise ValueError("Yeni sermaye eski sermayeden buyuk olmalidir.")
        if abs(self.new_capital_amount - (self.old_capital_amount + self.increase_amount)) > 0.05:
            raise ValueError("Yeni sermaye eski sermaye ve artirim tutari ile uyumlu olmalidir.")
        if self.paid_amount is not None and (
            self.paid_amount < 0 or self.paid_amount > self.increase_amount
        ):
            raise ValueError("Odenen tutar artirim tutarindan buyuk olamaz.")
        if not self.effective_date and not self.registration_date:
            raise ValueError("Yururluk veya tescil tarihi zorunludur.")
        return self


class CapitalIncreaseResponseData(BaseModel):
    model_config = ConfigDict(extra="allow")

    company: dict[str, Any]
    transaction: dict[str, Any]
    ownership_transactions: list[dict[str, Any]]
    current_ownership: list[dict[str, Any]]
    old_capital_amount: float
    increase_amount: float
    new_capital_amount: float
    warnings: list[str] = Field(default_factory=list)
