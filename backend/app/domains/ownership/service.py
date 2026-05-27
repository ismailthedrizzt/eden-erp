from __future__ import annotations

import json
from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.operations.service import table_exists
from app.domains.ownership.schemas import (
    CapitalIncreaseDistributionRow,
    CapitalIncreaseValidationSummary,
    CurrentOwnershipRow,
    ownership_row_from_mapping,
)

ACTIVE_VALUES = {"active", "aktif", "opened", "open"}
DRAFT_VALUES = {"draft", "taslak"}
PASSIVE_VALUES = {"passive", "pasif", "closed", "deleted", "deregistered", "terkin"}


def number_value(value: Any) -> float:
    if isinstance(value, int | float):
        return float(value)
    text_value = str(value or "").strip()
    if not text_value:
        return 0
    try:
        return float(text_value)
    except ValueError:
        normalized = text_value.replace(" ", "").replace(".", "").replace(",", ".")
        try:
            return float(normalized)
        except ValueError:
            return 0


def round_money(value: float) -> float:
    return round(value + 1e-9, 2)


def round_ratio(value: float) -> float:
    return round(value + 1e-9, 4)


def _status_text(row: dict[str, Any] | CurrentOwnershipRow) -> str:
    if isinstance(row, CurrentOwnershipRow):
        return f"{row.status} {row.record_status}".lower()
    return f"{row.get('status') or ''} {row.get('record_status') or ''}".lower()


def is_active_partner(row: dict[str, Any] | CurrentOwnershipRow) -> bool:
    status_text = _status_text(row)
    return (
        not any(value in status_text for value in DRAFT_VALUES)
        and not any(value in status_text for value in PASSIVE_VALUES)
    )


def is_draft_partner(row: dict[str, Any]) -> bool:
    return any(value in _status_text(row) for value in DRAFT_VALUES)


async def list_partners_for_company(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
) -> list[dict[str, Any]]:
    if not await table_exists(session, "public.company_partners"):
        raise DomainError(
            "Sermaye Artirimi icin Ortaklarimiz modulu ve ortak kayitlari gereklidir.",
            "MODULE_DEPENDENCY_MISSING",
            status.HTTP_409_CONFLICT,
            {"required_modules": ["partners"], "missing_tables": ["company_partners"]},
        )
    result = await session.execute(
        text(
            """
            select *
            from public.company_partners
            where tenant_id = :tenant_id
              and company_id = :company_id
              and coalesce(is_deleted, false) = false
            order by coalesce(display_name, partner_name, first_name, id::text)
            """
        ),
        {"tenant_id": tenant_id, "company_id": company_id},
    )
    return [dict(row) for row in result.mappings().all()]


def _fallback_ownership_from_partners(
    partners: list[dict[str, Any]],
    company_id: str,
) -> list[CurrentOwnershipRow]:
    rows: list[CurrentOwnershipRow] = []
    for partner in partners:
        if not is_active_partner(partner):
            continue
        rows.append(
            ownership_row_from_mapping(
                {
                    **partner,
                    "company_id": company_id,
                    "partner_id": partner.get("id"),
                    "current_share_ratio": partner.get("share_ratio"),
                    "current_voting_ratio": (
                        partner.get("voting_ratio") or partner.get("share_ratio")
                    ),
                    "current_profit_ratio": (
                        partner.get("profit_ratio") or partner.get("share_ratio")
                    ),
                    "current_capital_amount": partner.get("capital_amount"),
                    "current_share_units": partner.get("share_units"),
                }
            )
        )
    return rows


async def get_current_ownership_for_company(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
) -> list[CurrentOwnershipRow]:
    partners = await list_partners_for_company(session, tenant_id, company_id)
    if not await table_exists(session, "public.v_current_ownership"):
        return _fallback_ownership_from_partners(partners, company_id)

    result = await session.execute(
        text(
            """
            select *
            from public.v_current_ownership
            where company_id = :company_id
            order by current_share_ratio desc, display_name asc
            """
        ),
        {"company_id": company_id},
    )
    rows = [ownership_row_from_mapping(dict(row)) for row in result.mappings().all()]
    partner_ids = {str(partner.get("id")) for partner in partners}
    scoped_rows = [row for row in rows if row.partner_id in partner_ids]
    return scoped_rows or _fallback_ownership_from_partners(partners, company_id)


async def assert_current_ownership_readable(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
) -> list[CurrentOwnershipRow]:
    try:
        rows = await get_current_ownership_for_company(session, tenant_id, company_id)
    except DomainError:
        raise
    except Exception as error:
        raise DomainError(
            "Guncel ortaklik dagilimi okunamadigi icin Sermaye Artirimi baslatilamaz.",
            "CURRENT_OWNERSHIP_UNAVAILABLE",
            status.HTTP_409_CONFLICT,
            {"reason": error.__class__.__name__},
        ) from error
    if not rows:
        raise DomainError(
            "Sermaye dagitimi yapilacak aktif ortak bulunamadi.",
            "ACTIVE_PARTNERS_REQUIRED",
            status.HTTP_409_CONFLICT,
        )
    return rows


async def assert_has_active_partners(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
) -> list[dict[str, Any]]:
    partners = await list_partners_for_company(session, tenant_id, company_id)
    active_partners = [partner for partner in partners if is_active_partner(partner)]
    if not active_partners:
        raise DomainError(
            "Sermaye dagitimi yapilacak aktif ortak bulunamadi.",
            "ACTIVE_PARTNERS_REQUIRED",
            status.HTTP_409_CONFLICT,
        )
    return active_partners


def validate_ownership_distribution(
    rows: list[CurrentOwnershipRow],
) -> CapitalIncreaseValidationSummary:
    total_share = round_ratio(sum(row.current_share_ratio for row in rows))
    total_capital = round_money(sum(row.current_capital_amount for row in rows))
    blocking_reasons: list[str] = []
    if not rows:
        blocking_reasons.append("Aktif ortaklik dagilimi bulunamadi.")
    if rows and abs(total_share - 100) > 0.05:
        blocking_reasons.append(f"Mevcut pay dagilimi %100 degil. Guncel toplam: %{total_share}.")
    return CapitalIncreaseValidationSummary(
        ok=not blocking_reasons,
        total_share_ratio=total_share,
        total_capital_amount=total_capital,
        total_increase_amount=0,
        blocking_reasons=blocking_reasons,
    )


def validate_current_ownership_for_capital_increase(
    rows: list[CurrentOwnershipRow],
) -> CapitalIncreaseValidationSummary:
    summary = validate_ownership_distribution(rows)
    if not summary.ok:
        raise DomainError(
            "Sermaye Artirimi icin Ortaklarimiz modulu ve guncel ortaklik dagilimi gereklidir.",
            "CURRENT_OWNERSHIP_INVALID",
            status.HTTP_409_CONFLICT,
            {
                "blocking_reasons": summary.blocking_reasons,
                "total_share_ratio": summary.total_share_ratio,
            },
        )
    return summary


def _rebalance_money(rows: list[CapitalIncreaseDistributionRow], expected_total: float) -> None:
    if not rows:
        return
    total = round_money(sum(row.new_capital_amount for row in rows))
    diff = round_money(expected_total - total)
    if abs(diff) <= 0.05:
        index = max(range(len(rows)), key=lambda idx: rows[idx].new_capital_amount)
        row = rows[index]
        row.new_capital_amount = round_money(row.new_capital_amount + diff)
        row.increase_amount = round_money(row.new_capital_amount - row.previous_capital_amount)


def _rebalance_share(rows: list[CapitalIncreaseDistributionRow]) -> None:
    if not rows:
        return
    total = round_ratio(sum(row.new_share_ratio for row in rows))
    diff = round_ratio(100 - total)
    if abs(diff) <= 0.05:
        index = max(range(len(rows)), key=lambda idx: rows[idx].new_share_ratio)
        row = rows[index]
        row.new_share_ratio = round_ratio(row.new_share_ratio + diff)
        row.new_voting_ratio = round_ratio(number_value(row.new_voting_ratio) + diff)
        row.new_profit_ratio = round_ratio(number_value(row.new_profit_ratio) + diff)


def build_proportional_capital_distribution(
    current_ownership: list[CurrentOwnershipRow],
    increase_amount: float,
    new_capital_amount: float,
) -> list[CapitalIncreaseDistributionRow]:
    rows = [
        CapitalIncreaseDistributionRow(
            partner_id=row.partner_id,
            display_name=row.display_name,
            previous_share_ratio=row.current_share_ratio,
            previous_capital_amount=row.current_capital_amount,
            increase_amount=round_money(increase_amount * row.current_share_ratio / 100),
            new_capital_amount=round_money(new_capital_amount * row.current_share_ratio / 100),
            new_share_ratio=row.current_share_ratio,
            new_voting_ratio=row.current_voting_ratio or row.current_share_ratio,
            new_profit_ratio=row.current_profit_ratio or row.current_share_ratio,
            capital_source="Nakdi",
        )
        for row in current_ownership
    ]
    _rebalance_money(rows, new_capital_amount)
    _rebalance_share(rows)
    return rows


def validate_manual_capital_distribution(
    distribution_rows: list[CapitalIncreaseDistributionRow],
    old_capital_amount: float,
    increase_amount: float,
    new_capital_amount: float,
    current_ownership: list[CurrentOwnershipRow] | None = None,
) -> CapitalIncreaseValidationSummary:
    current_partner_ids = {row.partner_id for row in current_ownership or []}
    submitted_partner_ids = {row.partner_id for row in distribution_rows}
    blocking_reasons: list[str] = []
    if current_partner_ids:
        missing = sorted(current_partner_ids - submitted_partner_ids)
        unknown = sorted(submitted_partner_ids - current_partner_ids)
        if missing:
            blocking_reasons.append("Tum aktif ortaklar dagitim tablosunda yer almalidir.")
        if unknown:
            blocking_reasons.append("Dagitim tablosunda sirkete ait olmayan ortak var.")
    if any(row.new_share_ratio < 0 for row in distribution_rows):
        blocking_reasons.append("Yeni pay orani negatif olamaz.")
    if any(row.increase_amount < -0.05 for row in distribution_rows):
        blocking_reasons.append("Sermaye artirimi mevcut ortak sermayesini azaltamaz.")

    total_increase = round_money(sum(row.increase_amount for row in distribution_rows))
    total_capital = round_money(sum(row.new_capital_amount for row in distribution_rows))
    total_share = round_ratio(sum(row.new_share_ratio for row in distribution_rows))
    if abs(total_increase - increase_amount) > 0.05:
        blocking_reasons.append("Dagitilan artirim tutari toplam artirim tutariyla uyumlu degil.")
    if abs(total_capital - new_capital_amount) > 0.05:
        blocking_reasons.append("Dagitimda toplam sermaye yeni sermayeye esit olmalidir.")
    if abs(total_share - 100) > 0.05:
        blocking_reasons.append("Dagitimda toplam pay orani %100 olmalidir.")
    if old_capital_amount + increase_amount <= 0:
        blocking_reasons.append("Sermaye tutarlari gecersiz.")
    return CapitalIncreaseValidationSummary(
        ok=not blocking_reasons,
        total_share_ratio=total_share,
        total_capital_amount=total_capital,
        total_increase_amount=total_increase,
        blocking_reasons=blocking_reasons,
    )


async def build_ownership_snapshot(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
) -> list[dict[str, Any]]:
    rows = await get_current_ownership_for_company(session, tenant_id, company_id)
    return [row.model_dump(mode="json") for row in rows]


async def update_partner_capital_state(
    session: AsyncSession,
    context: dict[str, Any],
    distribution_rows: list[CapitalIncreaseDistributionRow],
) -> None:
    for row in distribution_rows:
        await session.execute(
            text(
                """
                update public.company_partners
                set capital_amount = :capital_amount,
                    share_ratio = :share_ratio,
                    voting_ratio = :voting_ratio,
                    profit_ratio = :profit_ratio,
                    updated_at = now(),
                    version = coalesce(version, 0) + 1
                where tenant_id = :tenant_id
                  and company_id = :company_id
                  and id = :partner_id
                  and coalesce(is_deleted, false) = false
                """
            ),
            {
                "tenant_id": context["tenant_id"],
                "company_id": context["company_id"],
                "partner_id": row.partner_id,
                "capital_amount": row.new_capital_amount,
                "share_ratio": row.new_share_ratio,
                "voting_ratio": row.new_voting_ratio or row.new_share_ratio,
                "profit_ratio": row.new_profit_ratio or row.new_share_ratio,
            },
        )


def ownership_transaction_payload(
    context: dict[str, Any],
    *,
    transaction_no: str,
    company_id: str,
    capital_transaction_id: str | None,
    transaction_date: str,
    effective_date: str | None,
    currency: str,
    row: CapitalIncreaseDistributionRow,
    distribution_rows: list[CapitalIncreaseDistributionRow],
    document_files: list[dict[str, Any]],
    warnings: list[str],
    notes: str | None,
) -> dict[str, Any]:
    return {
        "tenant_id": context["tenant_id"],
        "company_id": company_id,
        "transaction_no": transaction_no,
        "transaction_type": "capital_increase",
        "transaction_date": transaction_date,
        "effective_date": effective_date or transaction_date,
        "affected_partner_id": row.partner_id,
        "share_ratio": row.new_share_ratio,
        "voting_ratio": row.new_voting_ratio or row.new_share_ratio,
        "profit_ratio": row.new_profit_ratio or row.new_share_ratio,
        "capital_amount": row.new_capital_amount,
        "committed_capital_amount": row.new_capital_amount,
        "new_capital_amount": row.new_capital_amount,
        "currency": currency,
        "capital_distribution": [item.model_dump(mode="json") for item in distribution_rows],
        "new_values": {
            "partner_id": row.partner_id,
            "current_share_ratio": row.new_share_ratio,
            "current_voting_ratio": row.new_voting_ratio or row.new_share_ratio,
            "current_profit_ratio": row.new_profit_ratio or row.new_share_ratio,
            "current_capital_amount": row.new_capital_amount,
            "capital_transaction_id": capital_transaction_id,
        },
        "document_status": "Belge Eklendi" if document_files else "Belge Yok",
        "document_files": document_files,
        "status": "active",
        "approval_status": "approved",
        "workflow_status": "approved",
        "description": notes,
        "transaction_reason": "Sermaye Artirimi",
        "notes": row.notes or notes,
        "warnings": warnings,
        "history": [{"action": "Sermaye artirimi ownership kaydi olusturuldu"}],
        "created_by": context.get("user_id"),
        "updated_by": context.get("user_id"),
    }


def serialize_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)
