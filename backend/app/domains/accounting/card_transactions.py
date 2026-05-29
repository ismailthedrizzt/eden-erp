from __future__ import annotations

from typing import Any
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.accounting.schemas import CardTransactionCreateRequest, ListResult
from app.domains.accounting.service import (
    CARD_TRANSACTION_TABLE,
    assert_company_scope,
    ensure_accounting_deepening_tables,
    json_dumps,
    list_meta,
    row_to_dict,
)


async def list_card_transactions(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    company_id: str | None = None,
    reconciliation_status: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> ListResult:
    await ensure_accounting_deepening_tables(session, CARD_TRANSACTION_TABLE)
    where = ["tenant_id = :tenant_id", "coalesce(is_deleted, false) = false"]
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
    if reconciliation_status:
        where.append("reconciliation_status = :reconciliation_status")
        params["reconciliation_status"] = reconciliation_status
    where_sql = " and ".join(where)
    total_result = await session.execute(
        text(f"select count(*) from public.accounting_card_transactions where {where_sql}"), params
    )
    result = await session.execute(
        text(
            f"""
            select *
            from public.accounting_card_transactions
            where {where_sql}
            order by transaction_date desc, id desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    total = int(total_result.scalar_one() or 0)
    return ListResult(
        data=[row_to_dict(row) for row in result.mappings().all()],
        meta=list_meta(page, page_size, total),
    )


async def create_card_transaction(
    session: AsyncSession,
    context: dict[str, Any],
    request: CardTransactionCreateRequest,
) -> dict[str, Any]:
    await ensure_accounting_deepening_tables(session, CARD_TRANSACTION_TABLE)
    payload = request.model_dump(exclude_none=True)
    assert_company_scope(context, str(payload["company_id"]), write=True)
    result = await session.execute(
        text(
            """
            insert into public.accounting_card_transactions (
              id, tenant_id, company_id, card_account_id, card_holder_entity_type,
              card_holder_entity_id, transaction_date, posting_date, merchant_name,
              description, amount, currency, installment_count, installment_no, category,
              document_status, reconciliation_status, matched_cari_transaction_id,
              matched_invoice_id, import_job_id, notes, metadata_json,
              created_by, updated_by, created_at, updated_at, version, is_deleted
            )
            values (
              :id, :tenant_id, :company_id, :card_account_id, :card_holder_entity_type,
              :card_holder_entity_id, :transaction_date, :posting_date, :merchant_name,
              :description, :amount, :currency, :installment_count, :installment_no, :category,
              :document_status, :reconciliation_status, :matched_cari_transaction_id,
              :matched_invoice_id, :import_job_id, :notes, cast(:metadata_json as jsonb),
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
    return row_to_dict(result.mappings().one())
