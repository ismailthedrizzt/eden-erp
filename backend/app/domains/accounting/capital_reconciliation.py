from __future__ import annotations

from decimal import Decimal
from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.accounting.schemas import CapitalPaymentMatchRequest, ListResult
from app.domains.accounting.service import (
    BANK_TRANSACTION_TABLE,
    CAPITAL_RECONCILIATION_TABLE,
    TRANSACTION_TABLE,
    assert_company_scope,
    ensure_accounting_deepening_tables,
    list_meta,
    row_to_dict,
)


async def list_capital_reconciliation(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    company_id: str | None = None,
    status_value: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> ListResult:
    await ensure_accounting_deepening_tables(session, CAPITAL_RECONCILIATION_TABLE)
    where = ["tenant_id = :tenant_id"]
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "limit": page_size,
        "offset": (page - 1) * page_size,
    }
    if company_id:
        assert_company_scope(context, company_id)
        where.append("company_id = :company_id")
        params["company_id"] = company_id
    elif context.get("company_scope_ids"):
        where.append("company_id = any(cast(:company_scope_ids as uuid[]))")
        params["company_scope_ids"] = context["company_scope_ids"]
    if status_value:
        where.append("reconciliation_status = :status")
        params["status"] = status_value
    where_sql = " and ".join(where)
    total_result = await session.execute(
        text(f"select count(*) from public.accounting_capital_reconciliation where {where_sql}"),
        params,
    )
    result = await session.execute(
        text(
            f"""
            select *
            from public.accounting_capital_reconciliation
            where {where_sql}
            order by updated_at desc, id desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    return ListResult(
        data=[row_to_dict(row) for row in result.mappings().all()],
        meta=list_meta(page, page_size, int(total_result.scalar_one() or 0)),
    )


async def get_capital_reconciliation(
    session: AsyncSession,
    context: dict[str, Any],
    capital_transaction_id: str,
) -> dict[str, Any]:
    await ensure_accounting_deepening_tables(session, CAPITAL_RECONCILIATION_TABLE)
    result = await session.execute(
        text(
            """
            select *
            from public.accounting_capital_reconciliation
            where tenant_id = :tenant_id
              and capital_transaction_id = :capital_transaction_id
            order by updated_at desc
            """
        ),
        {"tenant_id": context["tenant_id"], "capital_transaction_id": capital_transaction_id},
    )
    rows = [row_to_dict(row) for row in result.mappings().all()]
    for row in rows:
        assert_company_scope(context, str(row["company_id"]))
    return {
        "capital_transaction_id": capital_transaction_id,
        "rows": rows,
        "summary": {
            "expected_amount": sum(Decimal(str(row.get("expected_amount") or "0")) for row in rows),
            "paid_amount": sum(Decimal(str(row.get("paid_amount") or "0")) for row in rows),
            "outstanding_amount": sum(
                Decimal(str(row.get("outstanding_amount") or "0")) for row in rows
            ),
        },
    }


async def match_capital_payment(
    session: AsyncSession,
    context: dict[str, Any],
    reconciliation_id: str,
    request: CapitalPaymentMatchRequest,
) -> dict[str, Any]:
    await ensure_accounting_deepening_tables(
        session,
        CAPITAL_RECONCILIATION_TABLE,
        BANK_TRANSACTION_TABLE,
        TRANSACTION_TABLE,
    )
    current = await get_capital_reconciliation_row(session, context, reconciliation_id)
    assert_company_scope(context, str(current["company_id"]), write=True)
    paid_amount = Decimal(str(current.get("paid_amount") or "0")) + request.paid_amount
    expected_amount = Decimal(str(current.get("expected_amount") or "0"))
    outstanding = max(Decimal("0"), expected_amount - paid_amount)
    status_value = "matched" if outstanding == 0 else "partially_matched"
    result = await session.execute(
        text(
            """
            update public.accounting_capital_reconciliation
            set paid_amount = :paid_amount,
                outstanding_amount = :outstanding_amount,
                reconciliation_status = :reconciliation_status,
                related_cari_transaction_id =
                    coalesce(:related_cari_transaction_id, related_cari_transaction_id),
                related_bank_transaction_id =
                    coalesce(:related_bank_transaction_id, related_bank_transaction_id),
                notes = coalesce(:notes, notes),
                updated_at = now()
            where tenant_id = :tenant_id and id = :reconciliation_id
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "reconciliation_id": reconciliation_id,
            "paid_amount": paid_amount,
            "outstanding_amount": outstanding,
            "reconciliation_status": status_value,
            "related_cari_transaction_id": request.related_cari_transaction_id,
            "related_bank_transaction_id": request.related_bank_transaction_id,
            "notes": request.notes,
        },
    )
    await update_related_payment_status(session, context, request, status_value)
    return row_to_dict(result.mappings().one())


async def get_capital_reconciliation_row(
    session: AsyncSession,
    context: dict[str, Any],
    reconciliation_id: str,
) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            select *
            from public.accounting_capital_reconciliation
            where tenant_id = :tenant_id and id = :reconciliation_id
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "reconciliation_id": reconciliation_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError(
            "Sermaye mutabakati bulunamadi.",
            "CAPITAL_RECONCILIATION_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
        )
    return row_to_dict(row)


async def update_related_payment_status(
    session: AsyncSession,
    context: dict[str, Any],
    request: CapitalPaymentMatchRequest,
    reconciliation_status: str,
) -> None:
    if request.related_bank_transaction_id:
        await session.execute(
            text(
                """
                update public.accounting_bank_transactions
                set reconciliation_status = :reconciliation_status,
                    updated_at = now()
                where tenant_id = :tenant_id and id = :id
                """
            ),
            {
                "tenant_id": context["tenant_id"],
                "id": request.related_bank_transaction_id,
                "reconciliation_status": reconciliation_status,
            },
        )
    if request.related_cari_transaction_id:
        await session.execute(
            text(
                """
                update public.accounting_cari_transactions
                set reconciliation_status = :reconciliation_status,
                    updated_at = now()
                where tenant_id = :tenant_id and id = :id
                """
            ),
            {
                "tenant_id": context["tenant_id"],
                "id": request.related_cari_transaction_id,
                "reconciliation_status": reconciliation_status,
            },
        )
