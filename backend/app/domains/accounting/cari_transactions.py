from __future__ import annotations

from decimal import Decimal
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.accounting.cari_accounts import get_cari_account
from app.domains.accounting.reconciliation import calculate_balance, derive_debit_credit
from app.domains.accounting.schemas import (
    CariAccountSummary,
    CariTransactionCreateRequest,
    CariTransactionListQuery,
    CariTransactionUpdateRequest,
    CompanyAccountingSummary,
    ListResult,
)
from app.domains.accounting.service import (
    assert_company_scope,
    assert_version,
    ensure_accounting_tables,
    json_dumps,
    json_list_dumps,
    list_meta,
    row_to_dict,
    update_account_current_balance,
)

TRANSACTION_SORT_COLUMNS = {
    "transaction_date": "t.transaction_date",
    "document_date": "t.document_date",
    "due_date": "t.due_date",
    "amount": "t.amount",
    "document_status": "t.document_status",
    "reconciliation_status": "t.reconciliation_status",
    "status": "t.status",
    "created_at": "t.created_at",
    "updated_at": "t.updated_at",
}

TRANSACTION_MUTABLE_COLUMNS = {
    "transaction_date",
    "document_date",
    "due_date",
    "transaction_type",
    "direction",
    "amount",
    "currency",
    "exchange_rate",
    "local_amount",
    "description",
    "document_status",
    "document_no",
    "document_type",
    "real_counterparty_name",
    "category",
    "payment_method",
    "paid_by_entity_type",
    "paid_by_entity_id",
    "paid_to_entity_type",
    "paid_to_entity_id",
    "related_module",
    "related_entity_type",
    "related_entity_id",
    "reconciliation_status",
    "matched_bank_transaction_id",
    "matched_invoice_id",
    "attachment_files",
    "status",
    "metadata_json",
}

JSON_COLUMNS = {"metadata_json"}
JSON_LIST_COLUMNS = {"attachment_files"}


async def list_cari_transactions(
    session: AsyncSession,
    context: dict[str, Any],
    query: CariTransactionListQuery,
) -> ListResult:
    await ensure_accounting_tables(session, transactions=True)
    where = ["t.tenant_id = :tenant_id", "coalesce(t.is_deleted, false) = false"]
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "limit": query.page_size,
        "offset": (query.page - 1) * query.page_size,
    }
    if query.company_id:
        assert_company_scope(context, query.company_id)
        where.append("t.company_id = :company_id")
        params["company_id"] = query.company_id
    elif context.get("company_scope_ids"):
        where.append("t.company_id = any(cast(:company_scope_ids as uuid[]))")
        params["company_scope_ids"] = context["company_scope_ids"]
    if query.account_id:
        where.append("t.account_id = :account_id")
        params["account_id"] = query.account_id
    if query.transaction_type:
        where.append("t.transaction_type = :transaction_type")
        params["transaction_type"] = query.transaction_type
    if query.direction:
        where.append("t.direction = :direction")
        params["direction"] = query.direction
    if query.date_from:
        where.append("t.transaction_date >= :date_from")
        params["date_from"] = query.date_from
    if query.date_to:
        where.append("t.transaction_date <= :date_to")
        params["date_to"] = query.date_to
    if query.document_status:
        where.append("t.document_status = :document_status")
        params["document_status"] = query.document_status
    if query.payment_method:
        where.append("t.payment_method = :payment_method")
        params["payment_method"] = query.payment_method
    if query.category:
        where.append("t.category = :category")
        params["category"] = query.category
    if query.reconciliation_status:
        where.append("t.reconciliation_status = :reconciliation_status")
        params["reconciliation_status"] = query.reconciliation_status
    if query.status:
        where.append("t.status = :status")
        params["status"] = query.status
    if query.search:
        where.append(
            """
            (
              t.description ilike :search
              or t.document_no ilike :search
              or t.real_counterparty_name ilike :search
              or a.account_name ilike :search
            )
            """
        )
        params["search"] = f"%{query.search}%"

    where_sql = " and ".join(where)
    sort_column = TRANSACTION_SORT_COLUMNS.get(query.sort, "t.transaction_date")
    direction = "desc" if query.direction_sort.lower() == "desc" else "asc"
    count_result = await session.execute(
        text(
            f"""
            select count(*)
            from public.accounting_cari_transactions t
            join public.accounting_cari_accounts a
              on a.tenant_id = t.tenant_id and a.id = t.account_id
            where {where_sql}
            """
        ),
        params,
    )
    total = int(count_result.scalar_one() or 0)
    result = await session.execute(
        text(
            f"""
            select t.*, a.account_code, a.account_name, a.cari_role
            from public.accounting_cari_transactions t
            join public.accounting_cari_accounts a
              on a.tenant_id = t.tenant_id and a.id = t.account_id
            where {where_sql}
            order by {sort_column} {direction}, t.id desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    rows = [derive_debit_credit(row_to_dict(row)) for row in result.mappings().all()]
    return ListResult(data=rows, meta=list_meta(query.page, query.page_size, total))


async def get_cari_transaction(
    session: AsyncSession,
    tenant_id: str,
    transaction_id: str,
) -> dict[str, Any] | None:
    await ensure_accounting_tables(session, transactions=True)
    result = await session.execute(
        text(
            """
            select t.*, a.account_code, a.account_name, a.cari_role
            from public.accounting_cari_transactions t
            join public.accounting_cari_accounts a
              on a.tenant_id = t.tenant_id and a.id = t.account_id
            where t.tenant_id = :tenant_id
              and t.id = :transaction_id
              and coalesce(t.is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "transaction_id": transaction_id},
    )
    row = result.mappings().one_or_none()
    return derive_debit_credit(row_to_dict(row)) if row else None


async def create_cari_transaction(
    session: AsyncSession,
    context: dict[str, Any],
    request: CariTransactionCreateRequest,
) -> dict[str, Any]:
    await ensure_accounting_tables(session, transactions=True)
    payload = normalize_transaction_payload(request.model_dump(exclude_none=True))
    account = await get_cari_account(session, context["tenant_id"], str(payload["account_id"]))
    if not account:
        raise DomainError(
            "Cari kart bulunamadi.",
            "CARI_ACCOUNT_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
        )
    if str(account["company_id"]) != str(payload["company_id"]):
        raise DomainError(
            "Cari hareketin sirketi cari kart ile uyumlu olmali.",
            "CARI_ACCOUNT_COMPANY_MISMATCH",
            status.HTTP_409_CONFLICT,
        )
    assert_company_scope(context, str(payload["company_id"]), write=True)
    transaction_id = str(uuid4())
    result = await session.execute(
        text(
            """
            insert into public.accounting_cari_transactions (
              id, tenant_id, company_id, account_id, transaction_date, document_date, due_date,
              transaction_type, direction, amount, currency, exchange_rate, local_amount,
              description, document_status, document_no, document_type, real_counterparty_name,
              category, payment_method, paid_by_entity_type, paid_by_entity_id,
              paid_to_entity_type, paid_to_entity_id, related_module, related_entity_type,
              related_entity_id, reconciliation_status, matched_bank_transaction_id,
              matched_invoice_id, attachment_files, status, metadata_json,
              created_by, updated_by, created_at, updated_at, version, is_deleted
            )
            values (
              :id, :tenant_id, :company_id, :account_id, :transaction_date, :document_date,
              :due_date, :transaction_type, :direction, :amount, :currency, :exchange_rate,
              :local_amount, :description, :document_status, :document_no, :document_type,
              :real_counterparty_name, :category, :payment_method, :paid_by_entity_type,
              :paid_by_entity_id, :paid_to_entity_type, :paid_to_entity_id, :related_module,
              :related_entity_type, :related_entity_id, :reconciliation_status,
              :matched_bank_transaction_id, :matched_invoice_id, cast(:attachment_files as jsonb),
              :status, cast(:metadata_json as jsonb), :created_by, :updated_by, now(), now(),
              1, false
            )
            returning *
            """
        ),
        {
            **payload,
            "id": transaction_id,
            "tenant_id": context["tenant_id"],
            "attachment_files": json_list_dumps(payload.get("attachment_files")),
            "metadata_json": json_dumps(payload.get("metadata_json")),
            "created_by": context.get("user_id"),
            "updated_by": context.get("user_id"),
        },
    )
    await refresh_account_balance(session, context["tenant_id"], str(payload["account_id"]))
    return derive_debit_credit(row_to_dict(result.mappings().one()))


async def update_cari_transaction(
    session: AsyncSession,
    context: dict[str, Any],
    transaction_id: str,
    request: CariTransactionUpdateRequest,
) -> dict[str, Any]:
    current = await get_cari_transaction(session, context["tenant_id"], transaction_id)
    if not current:
        raise DomainError(
            "Cari hareket bulunamadi.",
            "CARI_TRANSACTION_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
        )
    assert_company_scope(context, str(current["company_id"]), write=True)
    payload = request.model_dump(exclude_unset=True, exclude_none=True)
    assert_version(current, payload.pop("base_version", None))
    if current.get("status") == "cancelled":
        raise DomainError(
            "Iptal edilen cari hareket guncellenemez.",
            "CARI_TRANSACTION_CANCELLED",
            status.HTTP_409_CONFLICT,
        )
    if current.get("status") == "confirmed" and payload.get("status") != "cancelled":
        raise DomainError(
            "Onayli cari hareket dogrudan degistirilemez. Iptal veya ters kayit kullanilmalidir.",
            "CONFIRMED_TRANSACTION_IMMUTABLE",
            status.HTTP_409_CONFLICT,
        )
    patch = normalize_transaction_payload(
        {key: value for key, value in payload.items() if key in TRANSACTION_MUTABLE_COLUMNS},
        current=current,
    )
    if not patch:
        raise DomainError(
            "Guncellenecek cari hareket alani bulunamadi.",
            "NO_CHANGED_FIELDS",
            status.HTTP_400_BAD_REQUEST,
        )
    assignments: list[str] = []
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "transaction_id": transaction_id,
        "updated_by": context.get("user_id"),
    }
    for key, value in patch.items():
        if key in JSON_COLUMNS:
            assignments.append(f"{key} = cast(:{key} as jsonb)")
            params[key] = json_dumps(value)
        elif key in JSON_LIST_COLUMNS:
            assignments.append(f"{key} = cast(:{key} as jsonb)")
            params[key] = json_list_dumps(value)
        else:
            assignments.append(f"{key} = :{key}")
            params[key] = value
    assignments.extend(["updated_by = :updated_by", "updated_at = now()", "version = version + 1"])
    result = await session.execute(
        text(
            f"""
            update public.accounting_cari_transactions
            set {", ".join(assignments)}
            where tenant_id = :tenant_id
              and id = :transaction_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        params,
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError(
            "Cari hareket bulunamadi.",
            "CARI_TRANSACTION_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
        )
    await refresh_account_balance(session, context["tenant_id"], str(current["account_id"]))
    return derive_debit_credit(row_to_dict(row))


async def delete_cari_transaction(
    session: AsyncSession,
    context: dict[str, Any],
    transaction_id: str,
) -> dict[str, Any]:
    current = await get_cari_transaction(session, context["tenant_id"], transaction_id)
    if not current:
        raise DomainError(
            "Cari hareket bulunamadi.",
            "CARI_TRANSACTION_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
        )
    assert_company_scope(context, str(current["company_id"]), write=True)
    if current.get("status") != "draft":
        raise DomainError(
            "Onayli cari hareket silinemez. Iptal veya ters kayit kullanilmalidir.",
            "CARI_TRANSACTION_DELETE_NOT_ALLOWED",
            status.HTTP_409_CONFLICT,
        )
    await session.execute(
        text(
            """
            update public.accounting_cari_transactions
            set is_deleted = true,
                updated_by = :updated_by,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id
              and id = :transaction_id
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "transaction_id": transaction_id,
            "updated_by": context.get("user_id"),
        },
    )
    await refresh_account_balance(session, context["tenant_id"], str(current["account_id"]))
    return {"id": transaction_id, "deleted": True, "message": "Taslak cari hareket silindi."}


async def get_cari_account_summary(
    session: AsyncSession,
    context: dict[str, Any],
    account_id: str,
) -> CariAccountSummary:
    account = await get_cari_account(session, context["tenant_id"], account_id)
    if not account:
        raise DomainError(
            "Cari kart bulunamadi.",
            "CARI_ACCOUNT_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
        )
    assert_company_scope(context, str(account["company_id"]))
    return await calculate_account_summary(session, context["tenant_id"], account)


async def get_company_accounting_summary(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
) -> CompanyAccountingSummary:
    await ensure_accounting_tables(session, transactions=True)
    assert_company_scope(context, company_id)
    result = await session.execute(
        text(
            """
            with account_totals as (
              select count(*) as total_accounts,
                     coalesce(sum(opening_balance), 0) as opening_balance
              from public.accounting_cari_accounts
              where tenant_id = :tenant_id
                and company_id = :company_id
                and coalesce(is_deleted, false) = false
            ),
            transaction_totals as (
              select
                coalesce(sum(case when direction = 'debit' and status <> 'cancelled'
                  then amount else 0 end), 0) as total_debit,
                coalesce(sum(case when direction = 'credit' and status <> 'cancelled'
                  then amount else 0 end), 0) as total_credit,
                max(transaction_date) as last_transaction_date,
                count(*) filter (
                  where reconciliation_status in ('unmatched', 'needs_review')
                    and status <> 'cancelled'
                ) as unmatched_count,
                count(*) filter (
                  where due_date < current_date
                    and status <> 'cancelled'
                    and reconciliation_status <> 'matched'
                ) as overdue_count
              from public.accounting_cari_transactions
              where tenant_id = :tenant_id
                and company_id = :company_id
                and coalesce(is_deleted, false) = false
            )
            select *
            from account_totals, transaction_totals
            """
        ),
        {"tenant_id": context["tenant_id"], "company_id": company_id},
    )
    row = result.mappings().one()
    total_debit = Decimal(str(row["total_debit"] or "0"))
    total_credit = Decimal(str(row["total_credit"] or "0"))
    opening_balance = Decimal(str(row["opening_balance"] or "0"))
    return CompanyAccountingSummary(
        total_accounts=int(row["total_accounts"] or 0),
        total_debit=total_debit,
        total_credit=total_credit,
        balance=calculate_balance(opening_balance, total_debit, total_credit),
        unmatched_count=int(row["unmatched_count"] or 0),
        overdue_count=int(row["overdue_count"] or 0),
        last_transaction_date=row["last_transaction_date"],
    )


async def calculate_account_summary(
    session: AsyncSession,
    tenant_id: str,
    account: dict[str, Any],
) -> CariAccountSummary:
    await ensure_accounting_tables(session, transactions=True)
    result = await session.execute(
        text(
            """
            select
              coalesce(sum(case
                when direction = 'debit' and status <> 'cancelled' then amount
                else 0
              end), 0)
                as total_debit,
              coalesce(sum(case
                when direction = 'credit' and status <> 'cancelled' then amount
                else 0
              end), 0)
                as total_credit,
              max(transaction_date) as last_transaction_date,
              count(*) filter (
                where reconciliation_status in ('unmatched', 'needs_review')
                  and status <> 'cancelled'
              ) as unmatched_count,
              count(*) filter (
                where due_date < current_date
                  and status <> 'cancelled'
                  and reconciliation_status <> 'matched'
              ) as overdue_count
            from public.accounting_cari_transactions
            where tenant_id = :tenant_id
              and account_id = :account_id
              and coalesce(is_deleted, false) = false
            """
        ),
        {"tenant_id": tenant_id, "account_id": account["id"]},
    )
    row = result.mappings().one()
    opening_balance = Decimal(str(account.get("opening_balance") or "0"))
    total_debit = Decimal(str(row["total_debit"] or "0"))
    total_credit = Decimal(str(row["total_credit"] or "0"))
    return CariAccountSummary(
        total_debit=total_debit,
        total_credit=total_credit,
        balance=calculate_balance(opening_balance, total_debit, total_credit),
        opening_balance=opening_balance,
        last_transaction_date=row["last_transaction_date"],
        unmatched_count=int(row["unmatched_count"] or 0),
        overdue_count=int(row["overdue_count"] or 0),
    )


async def refresh_account_balance(session: AsyncSession, tenant_id: str, account_id: str) -> None:
    account = await get_cari_account(session, tenant_id, account_id)
    if not account:
        return
    summary = await calculate_account_summary(session, tenant_id, account)
    await update_account_current_balance(session, tenant_id, account_id, summary.balance)


def normalize_transaction_payload(
    payload: dict[str, Any],
    *,
    current: dict[str, Any] | None = None,
) -> dict[str, Any]:
    normalized = dict(payload)
    debit = normalized.pop("debit", None)
    credit = normalized.pop("credit", None)
    if normalized.get("amount") is None:
        if debit is not None and Decimal(str(debit)) > 0:
            normalized["amount"] = Decimal(str(debit))
            normalized["direction"] = normalized.get("direction") or "debit"
        elif credit is not None and Decimal(str(credit)) > 0:
            normalized["amount"] = Decimal(str(credit))
            normalized["direction"] = normalized.get("direction") or "credit"
    if "exchange_rate" not in normalized and current:
        normalized["exchange_rate"] = current.get("exchange_rate") or Decimal("1")
    if "amount" in normalized and "local_amount" not in normalized:
        exchange_rate = Decimal(str(normalized.get("exchange_rate") or "1"))
        normalized["local_amount"] = Decimal(str(normalized["amount"])) * exchange_rate
    return normalized
