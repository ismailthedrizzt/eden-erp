from __future__ import annotations

from typing import Any, Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator, model_validator

OwnershipTransactionType = Literal[
    "initial_partnership_entry",
    "share_transfer",
    "partial_share_transfer",
    "ownership_exit",
    "share_ratio_change",
    "voting_ratio_change",
    "profit_ratio_change",
    "privilege_change",
    "control_right_change",
    "capital_increase",
    "correction_entry",
    "reversal_entry",
]


OWNERSHIP_CONTROLLED_PARTNER_FIELDS = {
    "share_ratio",
    "voting_ratio",
    "profit_ratio",
    "share_units",
    "nominal_value",
    "capital_amount",
    "committed_capital_amount",
    "share_class",
    "has_privileged_share",
    "has_privilege",
    "has_control_right",
    "control_type",
    "has_board_nomination_right",
    "has_veto_right",
    "beneficial_owner",
    "is_beneficial_owner",
    "beneficial_ratio",
    "is_ultimate_controller",
    "start_date",
    "end_date",
    "status",
    "record_status",
    "current_ownership",
    "ownership_transaction_history",
}


class CurrentOwnershipRow(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str
    partner_id: str
    display_name: str = "Ortak"
    current_share_ratio: float = 0
    current_voting_ratio: float = 0
    current_profit_ratio: float = 0
    current_capital_amount: float = 0
    current_share_units: float = 0
    has_control_right: bool = False
    control_type: str | None = None
    has_veto_right: bool = False
    has_board_nomination_right: bool = False
    has_privileged_share: bool = False
    is_beneficial_owner: bool = False
    beneficial_ratio: float = 0
    paid_capital_amount: float = 0
    status: str = "active"
    record_status: str = "active"
    warnings: list[str] = Field(default_factory=list)


class CapitalIncreaseDistributionRow(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    partner_id: str
    display_name: str | None = None
    previous_share_ratio: float = Field(
        default=0,
        validation_alias=AliasChoices("previous_share_ratio", "old_share_ratio"),
    )
    previous_capital_amount: float = Field(
        default=0,
        validation_alias=AliasChoices(
            "previous_capital_amount", "old_committed_capital_amount"
        ),
    )
    increase_amount: float = 0
    new_capital_amount: float = Field(
        default=0,
        validation_alias=AliasChoices("new_capital_amount", "new_committed_capital_amount"),
    )
    new_share_ratio: float = 0
    new_voting_ratio: float | None = None
    new_profit_ratio: float | None = None
    notes: str | None = Field(default=None, validation_alias=AliasChoices("notes", "description"))
    capital_source: str | None = None


class CapitalIncreaseValidationSummary(BaseModel):
    ok: bool
    total_share_ratio: float
    total_capital_amount: float
    total_increase_amount: float
    warnings: list[str] = Field(default_factory=list)
    blocking_reasons: list[str] = Field(default_factory=list)


class OwnershipTransactionRequest(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    transaction_type: OwnershipTransactionType | str
    company_id: str
    partner_id: str | None = Field(
        default=None, validation_alias=AliasChoices("partner_id", "affected_partner_id")
    )
    source_partner_id: str | None = Field(
        default=None, validation_alias=AliasChoices("source_partner_id", "from_partner_id")
    )
    target_partner_id: str | None = Field(
        default=None, validation_alias=AliasChoices("target_partner_id", "to_partner_id")
    )
    transaction_date: str | None = None
    effective_date: str | None = None
    decision_date: str | None = None
    registration_date: str | None = None
    share_ratio_before: float | None = None
    share_ratio_after: float | None = None
    voting_ratio_before: float | None = None
    voting_ratio_after: float | None = None
    profit_ratio_before: float | None = None
    profit_ratio_after: float | None = None
    capital_amount_before: float | None = None
    capital_amount_after: float | None = None
    committed_capital_amount: float | None = None
    paid_capital_amount: float | None = None
    currency: str | None = None
    share_units_before: float | None = None
    share_units_after: float | None = None
    transferred_share_ratio: float | None = Field(
        default=None, validation_alias=AliasChoices("transferred_share_ratio", "share_ratio")
    )
    transferred_capital_amount: float | None = Field(
        default=None, validation_alias=AliasChoices("transferred_capital_amount", "capital_amount")
    )
    transferred_share_units: float | None = Field(
        default=None, validation_alias=AliasChoices("transferred_share_units", "share_units")
    )
    share_class: str | None = None
    has_privileged_share: bool | None = None
    has_control_right: bool | None = None
    control_type: str | None = None
    has_board_nomination_right: bool | None = None
    has_veto_right: bool | None = None
    is_beneficial_owner: bool | None = None
    beneficial_ratio: float | None = None
    reason: str | None = Field(
        default=None,
        validation_alias=AliasChoices("reason", "transaction_reason", "exit_reason"),
    )
    notes: str | None = None
    document_files: list[dict[str, Any]] = Field(default_factory=list)
    document_meta: dict[str, Any] | None = None
    reversed_transaction_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("reversed_transaction_id", "reversal_transaction_id"),
    )
    client_request_id: str | None = None
    base_version: int | None = None
    base_updated_at: str | None = None

    @field_validator("transaction_type", mode="before")
    @classmethod
    def normalize_transaction_type(cls, value: Any) -> str:
        text = str(value or "").strip()
        aliases = {
            "Yeni Ortaklık Girişi": "initial_partnership_entry",
            "Yeni Ortaklik Girisi": "initial_partnership_entry",
            "Pay Devri": "share_transfer",
            "Kısmi Pay Devri": "partial_share_transfer",
            "Kismi Pay Devri": "partial_share_transfer",
            "Ortaklıktan Çıkış": "ownership_exit",
            "Ortakliktan Cikis": "ownership_exit",
            "Oy Hakkı Değişikliği": "voting_ratio_change",
            "Oy Hakki Degisikligi": "voting_ratio_change",
            "Kar Payı Oranı Değişikliği": "profit_ratio_change",
            "Kar Payi Orani Degisikligi": "profit_ratio_change",
            "İmtiyazlı Pay Tanımı": "privilege_change",
            "Imtiyazli Pay Tanimi": "privilege_change",
            "Düzeltme Kaydı": "correction_entry",
            "Duzeltme Kaydi": "correction_entry",
            "Ters Kayıt": "reversal_entry",
            "Ters Kayit": "reversal_entry",
        }
        return aliases.get(text, text)

    @model_validator(mode="after")
    def require_effective_date(self) -> OwnershipTransactionRequest:
        allowed_types = set(OwnershipTransactionType.__args__)  # type: ignore[attr-defined]
        if self.transaction_type not in allowed_types:
            raise ValueError("Desteklenmeyen ortaklik islem tipi.")
        if not self.effective_date and not self.transaction_date:
            raise ValueError("Islem tarihi veya yururluk tarihi zorunludur.")
        if not self.transaction_date:
            self.transaction_date = self.effective_date
        if not self.effective_date:
            self.effective_date = self.transaction_date
        return self


class OwnershipTransactionResponse(BaseModel):
    transaction: dict[str, Any]
    partner: dict[str, Any] | None = None
    company: dict[str, Any]
    current_ownership: list[dict[str, Any]]
    warnings: list[str] = Field(default_factory=list)


class InitialPartnershipEntryRequest(BaseModel):
    company_id: str
    partner_id: str
    effective_date: str
    share_ratio: float
    voting_ratio: float | None = None
    profit_ratio: float | None = None
    capital_amount: float = 0
    share_units: float | None = None
    share_class: str | None = None
    ownership_rights: dict[str, Any] = Field(default_factory=dict)
    documents: list[dict[str, Any]] = Field(default_factory=list)
    notes: str | None = None
    client_request_id: str | None = None


class ShareTransferRequest(BaseModel):
    company_id: str
    source_partner_id: str
    target_partner_id: str
    effective_date: str
    transferred_share_ratio: float
    transferred_capital_amount: float | None = None
    transferred_share_units: float | None = None
    consideration_amount: float | None = None
    documents: list[dict[str, Any]] = Field(default_factory=list)
    notes: str | None = None
    client_request_id: str | None = None


class OwnershipExitRequest(BaseModel):
    company_id: str
    partner_id: str
    effective_date: str
    exit_reason: str | None = None
    transfer_to_partner_id: str | None = None
    remaining_distribution: list[dict[str, Any]] = Field(default_factory=list)
    documents: list[dict[str, Any]] = Field(default_factory=list)
    notes: str | None = None
    client_request_id: str | None = None


def ownership_row_from_mapping(row: dict[str, Any]) -> CurrentOwnershipRow:
    return CurrentOwnershipRow(
        company_id=str(row.get("company_id") or ""),
        partner_id=str(row.get("partner_id") or row.get("id") or ""),
        display_name=str(row.get("display_name") or row.get("partner_name") or "Ortak"),
        current_share_ratio=float(row.get("current_share_ratio") or row.get("share_ratio") or 0),
        current_voting_ratio=float(
            row.get("current_voting_ratio")
            or row.get("voting_ratio")
            or row.get("current_share_ratio")
            or row.get("share_ratio")
            or 0
        ),
        current_profit_ratio=float(
            row.get("current_profit_ratio")
            or row.get("profit_ratio")
            or row.get("current_share_ratio")
            or row.get("share_ratio")
            or 0
        ),
        current_capital_amount=float(
            row.get("current_capital_amount")
            or row.get("committed_capital_amount")
            or row.get("capital_amount")
            or 0
        ),
        current_share_units=float(row.get("current_share_units") or row.get("share_units") or 0),
        has_control_right=bool(row.get("has_control_right") or False),
        control_type=row.get("control_type"),
        has_veto_right=bool(row.get("has_veto_right") or False),
        has_board_nomination_right=bool(row.get("has_board_nomination_right") or False),
        has_privileged_share=bool(row.get("has_privileged_share") or False),
        is_beneficial_owner=bool(row.get("is_beneficial_owner") or False),
        beneficial_ratio=float(row.get("beneficial_ratio") or 0),
        paid_capital_amount=float(row.get("paid_capital_amount") or 0),
        status=str(row.get("status") or "active"),
        record_status=str(row.get("record_status") or "active"),
        warnings=list(row.get("warnings") or []),
    )
