from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.accounting.bank_accounts import get_bank_account
from app.domains.accounting.schemas import (
    BankTransactionCreateRequest,
    BankTransactionImportRequest,
    BankTransactionListQuery,
    BankTransactionUpdateRequest,
    ListResult,
    ReconciliationMatchRequest,
)
from app.domains.accounting.service import (
    BANK_ACCOUNT_TABLE,
    BANK_TRANSACTION_TABLE,
    assert_company_scope,
    assert_version,
    ensure_accounting_deepening_tables,
    json_dumps,
    list_meta,
    row_to_financial_dict,
)

BANK_TRANSACTION_SORT_COLUMNS = {
    "transaction_date": "transaction_date",
    "value_date": "value_date",
    "amount": "amount",
    "reconciliation_status": "reconciliation_status",
    "created_at": "created_at",
    "updated_at": "updated_at",
}

BANK_TRANSACTION_MUTABLE_COLUMNS = {
    "transaction_date",
    "value_date",
    "description",
    "counterparty_name",
    "counterparty_iban",
    "amount",
    "direction",
    "currency",
    "local_amount",
    "balance_after",
    "bank_reference_no",
    "raw_reference",
    "transaction_code",
    "reconciliation_status",
    "matched_cari_transaction_id",
    "matched_invoice_id",
    "confidence_score",
    "notes",
    "metadata_json",
}


async def list_bank_transactions(
    session: AsyncSession,
    context: dict[str, Any],
    query: BankTransactionListQuery,
) -> ListResult:
    await ensure_accounting_deepening_tables(session, BANK_TRANSACTION_TABLE)
    where = ["tenant_id = :tenant_id", "coalesce(is_deleted, false) = false"]
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "limit": query.page_size,
        "offset": (query.page - 1) * query.page_size,
    }
    if query.company_id:
        assert_company_scope(context, query.company_id)
        where.append("company_id = :company_id")
        params["company_id"] = query.company_id
    elif context.get("company_scope_ids"):
        where.append("company_id = any(cast(:company_scope_ids as uuid[]))")
        params["company_scope_ids"] = context["company_scope_ids"]
    if query.bank_account_id:
        where.append("bank_account_id = :bank_account_id")
        params["bank_account_id"] = query.bank_account_id
    if query.direction:
        where.append("direction = :direction")
        params["direction"] = query.direction
    if query.reconciliation_status:
        where.append("reconciliation_status = :reconciliation_status")
        params["reconciliation_status"] = query.reconciliation_status
    if query.imported_from:
        where.append("imported_from = :imported_from")
        params["imported_from"] = query.imported_from
    if query.date_from:
        where.append("transaction_date >= :date_from")
        params["date_from"] = query.date_from
    if query.date_to:
        where.append("transaction_date <= :date_to")
        params["date_to"] = query.date_to
    if query.search:
        where.append(
            "("
            "description ilike :search "
            "or counterparty_name ilike :search "
            "or bank_reference_no ilike :search"
            ")"
        )
        params["search"] = f"%{query.search}%"

    where_sql = " and ".join(where)
    sort_column = BANK_TRANSACTION_SORT_COLUMNS.get(query.sort, "transaction_date")
    direction = "desc" if query.direction_sort.lower() == "desc" else "asc"
    total_result = await session.execute(
        text(f"select count(*) from public.accounting_bank_transactions where {where_sql}"),
        params,
    )
    result = await session.execute(
        text(
            f"""
            select *
            from public.accounting_bank_transactions
            where {where_sql}
            order by {sort_column} {direction}, id desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    total = int(total_result.scalar_one() or 0)
    return ListResult(
        data=[row_to_financial_dict(row) for row in result.mappings().all()],
        meta=list_meta(query.page, query.page_size, total),
    )


async def get_bank_transaction(
    session: AsyncSession,
    tenant_id: str,
    transaction_id: str,
) -> dict[str, Any] | None:
    await ensure_accounting_deepening_tables(session, BANK_TRANSACTION_TABLE)
    result = await session.execute(
        text(
            """
            select *
            from public.accounting_bank_transactions
            where tenant_id = :tenant_id
              and id = :transaction_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "transaction_id": transaction_id},
    )
    row = result.mappings().one_or_none()
    return row_to_financial_dict(row) if row else None


async def create_bank_transaction(
    session: AsyncSession,
    context: dict[str, Any],
    request: BankTransactionCreateRequest,
) -> dict[str, Any]:
    await ensure_accounting_deepening_tables(session, BANK_ACCOUNT_TABLE, BANK_TRANSACTION_TABLE)
    payload = request.model_dump(exclude_none=True)
    account = await get_bank_account(session, context["tenant_id"], str(payload["bank_account_id"]))
    if not account:
        raise DomainError(
            "Banka hesabi bulunamadi.", "BANK_ACCOUNT_NOT_FOUND", status.HTTP_404_NOT_FOUND
        )
    if str(account["company_id"]) != str(payload["company_id"]):
        raise DomainError(
            "Banka hareketi sirketi banka hesabi ile uyumlu olmali.",
            "BANK_ACCOUNT_COMPANY_MISMATCH",
            status.HTTP_409_CONFLICT,
        )
    assert_company_scope(context, str(payload["company_id"]), write=True)
    await assert_unique_bank_transaction(session, context, payload)
    row = await insert_bank_transaction(session, context, payload)
    await mark_bank_account_imported(session, context["tenant_id"], str(payload["bank_account_id"]))
    return row


async def update_bank_transaction(
    session: AsyncSession,
    context: dict[str, Any],
    transaction_id: str,
    request: BankTransactionUpdateRequest,
) -> dict[str, Any]:
    current = await get_bank_transaction(session, context["tenant_id"], transaction_id)
    if not current:
        raise DomainError(
            "Banka hareketi bulunamadi.", "BANK_TRANSACTION_NOT_FOUND", status.HTTP_404_NOT_FOUND
        )
    assert_company_scope(context, str(current["company_id"]), write=True)
    payload = request.model_dump(exclude_unset=True, exclude_none=True)
    assert_version(current, payload.pop("base_version", None))
    patch = {
        key: value for key, value in payload.items() if key in BANK_TRANSACTION_MUTABLE_COLUMNS
    }
    if not patch:
        raise DomainError(
            "Guncellenecek banka hareketi alani bulunamadi.",
            "NO_CHANGED_FIELDS",
            status.HTTP_400_BAD_REQUEST,
        )
    await assert_unique_bank_transaction(
        session, context, {**current, **patch}, exclude_id=transaction_id
    )
    assignments: list[str] = []
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "transaction_id": transaction_id,
        "updated_by": context.get("user_id"),
    }
    for key, value in patch.items():
        if key == "metadata_json":
            assignments.append("metadata_json = cast(:metadata_json as jsonb)")
            params[key] = json_dumps(value)
        else:
            assignments.append(f"{key} = :{key}")
            params[key] = value
    assignments.extend(["updated_by = :updated_by", "updated_at = now()", "version = version + 1"])
    result = await session.execute(
        text(
            f"""
            update public.accounting_bank_transactions
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
            "Banka hareketi bulunamadi.", "BANK_TRANSACTION_NOT_FOUND", status.HTTP_404_NOT_FOUND
        )
    return row_to_financial_dict(row)


async def import_bank_transactions(
    session: AsyncSession,
    context: dict[str, Any],
    request: BankTransactionImportRequest,
) -> dict[str, Any]:
    await ensure_accounting_deepening_tables(session, BANK_ACCOUNT_TABLE, BANK_TRANSACTION_TABLE)
    account = await get_bank_account(session, context["tenant_id"], request.bank_account_id)
    if not account:
        raise DomainError(
            "Banka hesabi bulunamadi.", "BANK_ACCOUNT_NOT_FOUND", status.HTTP_404_NOT_FOUND
        )
    assert_company_scope(context, str(account["company_id"]), write=True)
    summary = {
        "total_rows": len(request.rows),
        "imported_rows": 0,
        "duplicate_rows": 0,
        "failed_rows": 0,
        "dry_run": request.dry_run,
    }
    rows: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []
    for index, row_request in enumerate(request.rows, start=1):
        payload = row_request.model_dump(exclude_none=True)
        payload["bank_account_id"] = request.bank_account_id
        payload["company_id"] = str(account["company_id"])
        payload["imported_from"] = request.imported_from
        try:
            duplicate = await find_duplicate_bank_transaction(session, context, payload)
            if duplicate:
                summary["duplicate_rows"] += 1
                rows.append(
                    {
                        "row_number": index,
                        "status": "duplicate",
                        "existing_id": duplicate.get("id"),
                        "data": payload,
                    }
                )
                continue
            if request.dry_run:
                rows.append({"row_number": index, "status": "valid", "data": payload})
                continue
            rows.append(
                {
                    "row_number": index,
                    "status": "imported",
                    "data": await insert_bank_transaction(session, context, payload),
                }
            )
            summary["imported_rows"] += 1
        except DomainError as error:
            summary["failed_rows"] += 1
            errors.append({"row_number": index, "code": error.code, "message": error.message})
    if not request.dry_run:
        await mark_bank_account_imported(session, context["tenant_id"], request.bank_account_id)
    return {"summary": summary, "rows": rows, "errors": errors}


async def match_bank_transaction(
    session: AsyncSession,
    context: dict[str, Any],
    transaction_id: str,
    request: ReconciliationMatchRequest,
) -> dict[str, Any]:
    from app.domains.accounting.reconciliation import match_reconciliation_records

    current = await get_bank_transaction(session, context["tenant_id"], transaction_id)
    if not current:
        raise DomainError(
            "Banka hareketi bulunamadi.", "BANK_TRANSACTION_NOT_FOUND", status.HTTP_404_NOT_FOUND
        )
    if request.source_id != transaction_id:
        raise DomainError(
            "Banka hareketi eslestirme kaynagi uyumsuz.",
            "MATCH_SOURCE_MISMATCH",
            status.HTTP_409_CONFLICT,
        )
    return await match_reconciliation_records(session, context, request)


async def ignore_bank_transaction(
    session: AsyncSession,
    context: dict[str, Any],
    transaction_id: str,
) -> dict[str, Any]:
    current = await get_bank_transaction(session, context["tenant_id"], transaction_id)
    if not current:
        raise DomainError(
            "Banka hareketi bulunamadi.", "BANK_TRANSACTION_NOT_FOUND", status.HTTP_404_NOT_FOUND
        )
    assert_company_scope(context, str(current["company_id"]), write=True)
    result = await session.execute(
        text(
            """
            update public.accounting_bank_transactions
            set reconciliation_status = 'ignored',
                updated_by = :updated_by,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :transaction_id
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "transaction_id": transaction_id,
            "updated_by": context.get("user_id"),
        },
    )
    return row_to_financial_dict(result.mappings().one())


async def insert_bank_transaction(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            insert into public.accounting_bank_transactions (
              id, tenant_id, company_id, bank_account_id, transaction_date, value_date,
              description, counterparty_name, counterparty_iban, amount, direction, currency,
              local_amount, balance_after, bank_reference_no, raw_reference, transaction_code,
              imported_from, import_job_id, reconciliation_status, matched_cari_transaction_id,
              matched_invoice_id, confidence_score, notes, metadata_json,
              created_by, updated_by, created_at, updated_at, version, is_deleted
            )
            values (
              :id, :tenant_id, :company_id, :bank_account_id, :transaction_date, :value_date,
              :description, :counterparty_name, :counterparty_iban, :amount, :direction, :currency,
              :local_amount, :balance_after, :bank_reference_no, :raw_reference, :transaction_code,
              :imported_from, :import_job_id, :reconciliation_status, :matched_cari_transaction_id,
              :matched_invoice_id, :confidence_score, :notes, cast(:metadata_json as jsonb),
              :created_by, :updated_by, now(), now(), 1, false
            )
            returning *
            """
        ),
        {
            **payload,
            "id": str(uuid4()),
            "tenant_id": context["tenant_id"],
            "metadata_json": json_dumps(payload.get("metadata_json")),
            "created_by": context.get("user_id"),
            "updated_by": context.get("user_id"),
        },
    )
    return row_to_financial_dict(result.mappings().one())


async def assert_unique_bank_transaction(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
    *,
    exclude_id: str | None = None,
) -> None:
    duplicate = await find_duplicate_bank_transaction(
        session, context, payload, exclude_id=exclude_id
    )
    if duplicate:
        raise DomainError(
            "Bu banka hareketi daha once aktarilmis gorunuyor.",
            "DUPLICATE_BANK_TRANSACTION",
            status.HTTP_409_CONFLICT,
            {"transaction_id": duplicate.get("id")},
        )


async def find_duplicate_bank_transaction(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
    *,
    exclude_id: str | None = None,
) -> dict[str, Any] | None:
    exclude = "and id <> :exclude_id" if exclude_id else ""
    if payload.get("bank_reference_no"):
        result = await session.execute(
            text(
                f"""
                select id
                from public.accounting_bank_transactions
                where tenant_id = :tenant_id
                  and bank_account_id = :bank_account_id
                  and bank_reference_no = :bank_reference_no
                  and coalesce(is_deleted, false) = false
                  {exclude}
                limit 1
                """
            ),
            {
                "tenant_id": context["tenant_id"],
                "bank_account_id": payload.get("bank_account_id"),
                "bank_reference_no": payload.get("bank_reference_no"),
                "exclude_id": exclude_id,
            },
        )
        row = result.mappings().one_or_none()
        if row:
            return dict(row)
    result = await session.execute(
        text(
            f"""
            select id
            from public.accounting_bank_transactions
            where tenant_id = :tenant_id
              and bank_account_id = :bank_account_id
              and transaction_date = :transaction_date
              and amount = :amount
              and coalesce(description, '') = coalesce(:description, '')
              and coalesce(balance_after, 0) = coalesce(:balance_after, 0)
              and coalesce(is_deleted, false) = false
              {exclude}
            limit 1
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "bank_account_id": payload.get("bank_account_id"),
            "transaction_date": payload.get("transaction_date"),
            "amount": payload.get("amount"),
            "description": payload.get("description"),
            "balance_after": payload.get("balance_after"),
            "exclude_id": exclude_id,
        },
    )
    row = result.mappings().one_or_none()
    return dict(row) if row else None


async def mark_bank_account_imported(
    session: AsyncSession, tenant_id: str, account_id: str
) -> None:
    await session.execute(
        text(
            """
            update public.accounting_bank_accounts
            set last_import_at = now(), updated_at = now(), version = version + 1
            where tenant_id = :tenant_id and id = :account_id
            """
        ),
        {"tenant_id": tenant_id, "account_id": account_id},
    )
