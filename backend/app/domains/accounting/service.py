from __future__ import annotations

import json
from collections.abc import Mapping
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.operations.service import table_exists

ACCOUNTING_MODULE_KEY = "accounting"
ACCOUNT_TABLE = "public.accounting_cari_accounts"
TRANSACTION_TABLE = "public.accounting_cari_transactions"
BANK_ACCOUNT_TABLE = "public.accounting_bank_accounts"
BANK_TRANSACTION_TABLE = "public.accounting_bank_transactions"
CARD_TRANSACTION_TABLE = "public.accounting_card_transactions"
E_DOCUMENT_TABLE = "public.accounting_e_documents"
RECONCILIATION_LINK_TABLE = "public.accounting_reconciliation_links"
MATCHING_SUGGESTION_TABLE = "public.accounting_matching_suggestions"
CAPITAL_RECONCILIATION_TABLE = "public.accounting_capital_reconciliation"

VIEW_PERMISSION = "accounting.view"
EDIT_PERMISSION = "accounting.edit"
TRANSACTION_CREATE_PERMISSION = "accounting.transactionCreate"
TRANSACTION_APPROVE_PERMISSION = "accounting.transactionApprove"
RECONCILE_PERMISSION = "accounting.reconcile"


def json_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=False, default=str)


def json_list_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else [], ensure_ascii=False, default=str)


def row_to_dict(row: Any) -> dict[str, Any]:
    return {key: normalize_value(value) for key, value in dict(row).items()}


def normalize_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return value
    if isinstance(value, (date, datetime)):
        return value
    return value


def list_meta(page: int, page_size: int, total: int) -> dict[str, int]:
    total_pages = max(1, (total + page_size - 1) // page_size)
    return {
        "page": page,
        "pageSize": page_size,
        "total": total,
        "totalPages": total_pages,
    }


async def ensure_accounting_tables(session: AsyncSession, *, transactions: bool = False) -> None:
    if not await table_exists(session, ACCOUNT_TABLE):
        raise DomainError(
            "Muhasebe cari kart altyapisi hazir degil. "
            "Kurulum Merkezi'nden Muhasebe modulunu tamamlayin.",
            "ACCOUNTING_CARI_ACCOUNTS_MISSING",
            status.HTTP_409_CONFLICT,
            {"module_key": ACCOUNTING_MODULE_KEY},
        )
    if transactions and not await table_exists(session, TRANSACTION_TABLE):
        raise DomainError(
            "Muhasebe cari hareket altyapisi hazir degil. "
            "Kurulum Merkezi'nden Muhasebe modulunu tamamlayin.",
            "ACCOUNTING_CARI_TRANSACTIONS_MISSING",
            status.HTTP_409_CONFLICT,
            {"module_key": ACCOUNTING_MODULE_KEY},
        )


async def ensure_accounting_deepening_tables(
    session: AsyncSession,
    *tables: str,
) -> None:
    names = tables or (
        BANK_ACCOUNT_TABLE,
        BANK_TRANSACTION_TABLE,
        E_DOCUMENT_TABLE,
        RECONCILIATION_LINK_TABLE,
    )
    missing: list[str] = []
    for table in names:
        if not await table_exists(session, table):
            missing.append(table.split(".")[-1])
    if missing:
        raise DomainError(
            "Muhasebe banka/e-belge/mutabakat altyapisi hazir degil. "
            "Kurulum Merkezi'nden Muhasebe derinlestirme migrasyonlarini tamamlayin.",
            "ACCOUNTING_RECONCILIATION_TABLES_MISSING",
            status.HTTP_409_CONFLICT,
            {"module_key": ACCOUNTING_MODULE_KEY, "missing_tables": missing},
        )


def assert_company_scope(context: dict[str, Any], company_id: str, *, write: bool = False) -> None:
    scope_key = "writable_company_scope_ids" if write else "company_scope_ids"
    scope = context.get(scope_key) or context.get("company_scope_ids")
    if scope and str(company_id) not in {str(item) for item in scope}:
        raise DomainError(
            "Bu kayit erisim kapsaminiz disinda.",
            "COMPANY_SCOPE_DENIED",
            status.HTTP_403_FORBIDDEN,
            {"company_id": company_id},
        )


async def assert_company_exists(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
) -> None:
    if not await table_exists(session, "public.companies"):
        return
    result = await session.execute(
        text(
            """
            select id
            from public.companies
            where tenant_id = :tenant_id
              and id = :company_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "company_id": company_id},
    )
    if not result.mappings().one_or_none():
        raise DomainError(
            "Bagli sirket kaydi bulunamadi.",
            "COMPANY_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
            {"company_id": company_id},
        )


async def update_account_current_balance(
    session: AsyncSession,
    tenant_id: str,
    account_id: str,
    balance: Decimal,
) -> None:
    await session.execute(
        text(
            """
            update public.accounting_cari_accounts
            set current_balance = :balance,
                updated_at = now(),
                version = coalesce(version, 0) + 1
            where tenant_id = :tenant_id
              and id = :account_id
              and coalesce(is_deleted, false) = false
            """
        ),
        {"tenant_id": tenant_id, "account_id": account_id, "balance": balance},
    )


def assert_version(current: Mapping[str, Any], base_version: int | None) -> None:
    if base_version is None:
        return
    if int(current.get("version") or 0) != int(base_version):
        raise DomainError(
            "Kayit baska bir islem tarafindan guncellendi. Lutfen kaydi yenileyin.",
            "VERSION_CONFLICT",
            status.HTTP_409_CONFLICT,
        )


def mask_financial_identifier(value: Any, *, visible: int = 4) -> str | None:
    if not value:
        return None
    text_value = str(value).replace(" ", "")
    if len(text_value) <= visible:
        return "*" * len(text_value)
    return f"{'*' * max(0, len(text_value) - visible)}{text_value[-visible:]}"


def row_to_financial_dict(row: Any) -> dict[str, Any]:
    data = row_to_dict(row)
    for key in ("iban", "account_no", "counterparty_iban"):
        if data.get(key):
            data[f"{key}_masked"] = mask_financial_identifier(data[key])
    return data
