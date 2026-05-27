from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.operations.service import table_exists
from app.domains.ownership.schemas import CurrentOwnershipRow, ownership_row_from_mapping
from app.domains.ownership.service import (
    get_current_ownership_for_company as _read_current_ownership,
)
from app.domains.ownership.service import (
    number_value,
    round_money,
    round_ratio,
)


def total_share_ratio(rows: list[CurrentOwnershipRow]) -> float:
    return round_ratio(sum(row.current_share_ratio for row in rows))


def total_voting_ratio(rows: list[CurrentOwnershipRow]) -> float:
    return round_ratio(sum(row.current_voting_ratio for row in rows))


def total_profit_ratio(rows: list[CurrentOwnershipRow]) -> float:
    return round_ratio(sum(row.current_profit_ratio for row in rows))


def total_capital_amount(rows: list[CurrentOwnershipRow]) -> float:
    return round_money(sum(row.current_capital_amount for row in rows))


def ownership_row_by_partner(
    rows: list[CurrentOwnershipRow],
    partner_id: str,
) -> CurrentOwnershipRow | None:
    return next((row for row in rows if str(row.partner_id) == str(partner_id)), None)


def validate_current_ownership_distribution(rows: list[CurrentOwnershipRow]) -> list[str]:
    warnings: list[str] = []
    if not rows:
        warnings.append("Guncel ortaklik dagilimi bulunamadi.")
        return warnings
    if abs(total_share_ratio(rows) - 100) > 0.05:
        warnings.append("Toplam hisse orani %100 degil.")
    if abs(total_voting_ratio(rows) - 100) > 0.05:
        warnings.append("Toplam oy hakki orani %100 degil.")
    if abs(total_profit_ratio(rows) - 100) > 0.05:
        warnings.append("Toplam kar payi orani %100 degil.")
    if any(row.current_share_ratio < -0.001 for row in rows):
        warnings.append("Negatif hisse orani bulunan ortak var.")
    if len({row.partner_id for row in rows}) != len(rows):
        warnings.append("Ayni ortak icin birden fazla aktif ortaklik satiri var.")
    return warnings


async def get_current_ownership_for_company(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
) -> list[CurrentOwnershipRow]:
    try:
        return await _read_current_ownership(session, tenant_id, company_id)
    except DomainError:
        raise
    except Exception:
        return await calculate_current_ownership_from_transactions(session, tenant_id, company_id)


async def get_current_ownership_for_partner(
    session: AsyncSession,
    tenant_id: str,
    partner_id: str,
) -> CurrentOwnershipRow | None:
    result = await session.execute(
        text(
            """
            select company_id
            from public.company_partners
            where tenant_id = :tenant_id
              and id = :partner_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "partner_id": partner_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        return None
    rows = await get_current_ownership_for_company(session, tenant_id, str(row["company_id"]))
    return ownership_row_by_partner(rows, partner_id)


async def calculate_current_ownership_from_transactions(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
) -> list[CurrentOwnershipRow]:
    if not await table_exists(session, "public.ownership_transactions"):
        raise DomainError(
            "Guncel ortaklik dagilimi okunamadigi icin islem baslatilamaz.",
            "CURRENT_OWNERSHIP_UNAVAILABLE",
            status.HTTP_409_CONFLICT,
        )
    result = await session.execute(
        text(
            """
            select
              tx.*,
              coalesce(partner.display_name, partner.partner_name, 'Ortak') as display_name
            from public.ownership_transactions tx
            left join public.company_partners partner
              on partner.id = coalesce(
                tx.affected_partner_id,
                tx.to_partner_id,
                tx.from_partner_id
              )
            where tx.tenant_id = :tenant_id
              and tx.company_id = :company_id
              and tx.approval_status = 'approved'
              and coalesce(tx.is_deleted, false) = false
            order by
              coalesce(tx.effective_date, tx.transaction_date, tx.created_at::date),
              tx.created_at,
              tx.id
            """
        ),
        {"tenant_id": tenant_id, "company_id": company_id},
    )
    state: dict[str, dict[str, Any]] = {}
    for tx in result.mappings().all():
        row = dict(tx)
        tx_type = str(row.get("transaction_type") or "")
        source_id = row.get("from_partner_id")
        target_id = row.get("to_partner_id") or row.get("affected_partner_id")
        affected_id = row.get("affected_partner_id") or target_id or source_id
        share_delta = number_value(row.get("share_ratio"))
        voting_delta = number_value(row.get("voting_ratio") or share_delta)
        profit_delta = number_value(row.get("profit_ratio") or share_delta)
        capital_delta = number_value(
            row.get("capital_amount") or row.get("committed_capital_amount")
        )
        share_units_delta = number_value(row.get("share_units"))

        initial_types = {
            "initial_partnership_entry",
            "Yeni Ortaklik Girisi",
            "Yeni Ortaklık Girişi",
        }
        transfer_types = {"Pay Devri", "Kismi Pay Devri", "Kısmi Pay Devri"}
        exit_types = {"Ortakliktan Cikis", "Ortaklıktan Çıkış"}
        if tx_type in initial_types and target_id:
            _apply_absolute_or_delta(
                state,
                str(target_id),
                row,
                share_delta,
                voting_delta,
                profit_delta,
                capital_delta,
                share_units_delta,
                delta=True,
            )
        elif tx_type in transfer_types:
            if source_id:
                _apply_absolute_or_delta(
                    state,
                    str(source_id),
                    row,
                    -share_delta,
                    -voting_delta,
                    -profit_delta,
                    -capital_delta,
                    -share_units_delta,
                    delta=True,
                )
            if target_id:
                _apply_absolute_or_delta(
                    state,
                    str(target_id),
                    row,
                    share_delta,
                    voting_delta,
                    profit_delta,
                    capital_delta,
                    share_units_delta,
                    delta=True,
                )
        elif tx_type in exit_types and affected_id:
            _apply_absolute_or_delta(state, str(affected_id), row, 0, 0, 0, 0, 0, delta=False)
        elif affected_id:
            raw_new_values = row.get("new_values")
            new_values: dict[str, Any] = (
                raw_new_values if isinstance(raw_new_values, dict) else {}
            )
            next_share = row.get("share_ratio") or new_values.get("current_share_ratio")
            _apply_absolute_or_delta(
                state,
                str(affected_id),
                row,
                number_value(next_share),
                number_value(row.get("new_voting_ratio") or row.get("voting_ratio")),
                number_value(row.get("new_profit_ratio") or row.get("profit_ratio")),
                number_value(row.get("capital_amount") or row.get("committed_capital_amount")),
                number_value(row.get("share_units")),
                delta=False,
            )

    rows = [
        ownership_row_from_mapping({"company_id": company_id, "partner_id": partner_id, **values})
        for partner_id, values in state.items()
        if any(
            abs(number_value(values.get(field))) > 0.001
            for field in (
                "current_share_ratio",
                "current_voting_ratio",
                "current_profit_ratio",
                "current_capital_amount",
                "current_share_units",
            )
        )
    ]
    if not rows:
        raise DomainError(
            "Guncel ortaklik dagilimi okunamadigi icin islem baslatilamaz.",
            "CURRENT_OWNERSHIP_UNAVAILABLE",
            status.HTTP_409_CONFLICT,
        )
    return rows


async def build_current_ownership_snapshot(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
) -> list[dict[str, Any]]:
    rows = await get_current_ownership_for_company(session, tenant_id, company_id)
    return [row.model_dump(mode="json") for row in rows]


def _apply_absolute_or_delta(
    state: dict[str, dict[str, Any]],
    partner_id: str,
    source_row: dict[str, Any],
    share_ratio: float,
    voting_ratio: float,
    profit_ratio: float,
    capital_amount: float,
    share_units: float,
    *,
    delta: bool,
) -> None:
    current = state.setdefault(
        partner_id,
        {
            "display_name": source_row.get("display_name") or "Ortak",
            "current_share_ratio": 0,
            "current_voting_ratio": 0,
            "current_profit_ratio": 0,
            "current_capital_amount": 0,
            "current_share_units": 0,
            "has_control_right": False,
            "has_veto_right": False,
            "has_board_nomination_right": False,
            "has_privileged_share": False,
            "is_beneficial_owner": False,
            "beneficial_ratio": 0,
        },
    )
    if delta:
        current["current_share_ratio"] = round_ratio(
            current["current_share_ratio"] + share_ratio
        )
        current["current_voting_ratio"] = round_ratio(
            current["current_voting_ratio"] + voting_ratio
        )
        current["current_profit_ratio"] = round_ratio(
            current["current_profit_ratio"] + profit_ratio
        )
        current["current_capital_amount"] = round_money(
            current["current_capital_amount"] + capital_amount
        )
        current["current_share_units"] = round_ratio(current["current_share_units"] + share_units)
    else:
        current["current_share_ratio"] = round_ratio(share_ratio)
        current["current_voting_ratio"] = round_ratio(voting_ratio or share_ratio)
        current["current_profit_ratio"] = round_ratio(profit_ratio or share_ratio)
        current["current_capital_amount"] = round_money(capital_amount)
        current["current_share_units"] = round_ratio(share_units)
    for field in (
        "has_control_right",
        "control_type",
        "has_veto_right",
        "has_board_nomination_right",
        "has_privileged_share",
        "is_beneficial_owner",
        "beneficial_ratio",
    ):
        if source_row.get(field) is not None:
            current[field] = source_row.get(field)
