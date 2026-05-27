from __future__ import annotations

from typing import Any

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


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
