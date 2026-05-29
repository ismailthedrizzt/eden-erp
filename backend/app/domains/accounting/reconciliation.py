from __future__ import annotations

from decimal import Decimal
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.accounting.matching import build_match_score
from app.domains.accounting.schemas import (
    ListResult,
    ReconciliationMatchRequest,
    ReconciliationSuggestionQuery,
    ReconciliationUnmatchRequest,
)
from app.domains.accounting.service import (
    BANK_TRANSACTION_TABLE,
    E_DOCUMENT_TABLE,
    MATCHING_SUGGESTION_TABLE,
    RECONCILIATION_LINK_TABLE,
    assert_company_scope,
    ensure_accounting_deepening_tables,
    ensure_accounting_tables,
    json_dumps,
    list_meta,
    row_to_dict,
)


def derive_debit_credit(row: dict[str, Any]) -> dict[str, Any]:
    amount = Decimal(str(row.get("amount") or "0"))
    direction = row.get("direction")
    row["debit"] = amount if direction == "debit" else Decimal("0")
    row["credit"] = amount if direction == "credit" else Decimal("0")
    return row


def calculate_balance(
    opening_balance: Decimal,
    total_debit: Decimal,
    total_credit: Decimal,
) -> Decimal:
    return opening_balance + total_debit - total_credit


async def list_reconciliation_suggestions(
    session: AsyncSession,
    context: dict[str, Any],
    query: ReconciliationSuggestionQuery,
) -> ListResult:
    await ensure_accounting_tables(session, transactions=True)
    await ensure_accounting_deepening_tables(
        session,
        BANK_TRANSACTION_TABLE,
        E_DOCUMENT_TABLE,
        RECONCILIATION_LINK_TABLE,
        MATCHING_SUGGESTION_TABLE,
    )
    if query.company_id:
        assert_company_scope(context, query.company_id)
    bank_rows = await fetch_unmatched_rows(
        session,
        context,
        "public.accounting_bank_transactions",
        query.company_id,
        limit=query.page_size,
    )
    cari_rows = await fetch_unmatched_rows(
        session,
        context,
        "public.accounting_cari_transactions",
        query.company_id,
        limit=max(query.page_size * 2, 20),
    )
    document_rows = await fetch_unmatched_rows(
        session,
        context,
        "public.accounting_e_documents",
        query.company_id,
        limit=max(query.page_size * 2, 20),
    )
    suggestions: list[dict[str, Any]] = []
    for bank_row in bank_rows:
        for target_type, rows in (("cari_transaction", cari_rows), ("e_document", document_rows)):
            for target in rows:
                score, reasons = build_match_score(bank_row, target)
                if score < query.min_confidence:
                    continue
                suggestions.append(
                    {
                        "id": f"{bank_row['id']}:{target_type}:{target['id']}",
                        "source_type": "bank_transaction",
                        "source_id": bank_row["id"],
                        "target_type": target_type,
                        "target_id": target["id"],
                        "company_id": bank_row["company_id"],
                        "confidence_score": score,
                        "reasons": reasons,
                        "source": bank_row,
                        "target": target,
                        "status": "open",
                    }
                )
    suggestions.sort(key=lambda item: Decimal(str(item["confidence_score"])), reverse=True)
    start = (query.page - 1) * query.page_size
    data = suggestions[start : start + query.page_size]
    return ListResult(data=data, meta=list_meta(query.page, query.page_size, len(suggestions)))


async def match_reconciliation_records(
    session: AsyncSession,
    context: dict[str, Any],
    request: ReconciliationMatchRequest,
) -> dict[str, Any]:
    await ensure_accounting_tables(session, transactions=True)
    await ensure_accounting_deepening_tables(
        session,
        BANK_TRANSACTION_TABLE,
        E_DOCUMENT_TABLE,
        RECONCILIATION_LINK_TABLE,
    )
    assert_company_scope(context, request.company_id, write=True)
    source = await get_reconciliation_entity(
        session, context, request.source_type, request.source_id
    )
    target = await get_reconciliation_entity(
        session, context, request.target_type, request.target_id
    )
    if (
        str(source.get("company_id")) != request.company_id
        or str(target.get("company_id")) != request.company_id
    ):
        raise DomainError(
            "Eslesecek kayitlar ayni sirket kapsaminda olmali.",
            "RECONCILIATION_COMPANY_MISMATCH",
            status.HTTP_409_CONFLICT,
        )
    confidence, reasons = build_match_score(source, target)
    confidence_score = (
        request.confidence_score if request.confidence_score is not None else confidence
    )
    amount = request.amount_matched or Decimal(
        str(
            source.get("amount")
            or source.get("payable_amount")
            or target.get("amount")
            or target.get("payable_amount")
            or "0"
        )
    )
    link_id = str(uuid4())
    link_status = "partially_matched" if request.match_type == "partial" else "matched"
    result = await session.execute(
        text(
            """
            insert into public.accounting_reconciliation_links (
              id, tenant_id, company_id, transaction_id, target_module,
              target_entity_type, target_entity_id, source_type, source_id, target_type,
              target_id, match_type, confidence_score, amount_matched, currency, status,
              matched_by, matched_at, notes, metadata_json, created_at, updated_at
            )
            values (
              :id, :tenant_id, :company_id, :legacy_transaction_id, 'accounting',
              :target_type, :target_id, :source_type, :source_id, :target_type,
              :target_id, :match_type, :confidence_score, :amount_matched, :currency,
              'active', :matched_by, now(), :notes, cast(:metadata_json as jsonb), now(), now()
            )
            returning *
            """
        ),
        {
            "id": link_id,
            "tenant_id": context["tenant_id"],
            "company_id": request.company_id,
            "legacy_transaction_id": request.source_id
            if request.source_type == "cari_transaction"
            else None,
            "source_type": request.source_type,
            "source_id": request.source_id,
            "target_type": request.target_type,
            "target_id": request.target_id,
            "match_type": request.match_type,
            "confidence_score": confidence_score,
            "amount_matched": amount,
            "currency": request.currency,
            "matched_by": context.get("user_id"),
            "notes": request.notes,
            "metadata_json": json_dumps({"reasons": reasons}),
        },
    )
    await set_reconciliation_status(
        session,
        context,
        request.source_type,
        request.source_id,
        link_status,
        request.target_type,
        request.target_id,
    )
    await set_reconciliation_status(
        session,
        context,
        request.target_type,
        request.target_id,
        link_status,
        request.source_type,
        request.source_id,
    )
    await mark_suggestion_status(session, context, request, "accepted")
    return {
        "link": row_to_dict(result.mappings().one()),
        "source": request.source_type,
        "target": request.target_type,
    }


async def unmatch_reconciliation_records(
    session: AsyncSession,
    context: dict[str, Any],
    request: ReconciliationUnmatchRequest,
) -> dict[str, Any]:
    await ensure_accounting_deepening_tables(session, RECONCILIATION_LINK_TABLE)
    link = await find_reconciliation_link(session, context, request)
    if not link:
        raise DomainError(
            "Mutabakat baglantisi bulunamadi.",
            "RECONCILIATION_LINK_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
        )
    assert_company_scope(context, str(link["company_id"]), write=True)
    await session.execute(
        text(
            """
            update public.accounting_reconciliation_links
            set status = 'removed',
                removed_by = :removed_by,
                removed_at = now(),
                notes = coalesce(:notes, notes),
                updated_at = now()
            where tenant_id = :tenant_id and id = :link_id
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "link_id": link["id"],
            "removed_by": context.get("user_id"),
            "notes": request.notes,
        },
    )
    await set_reconciliation_status(
        session, context, str(link["source_type"]), str(link["source_id"]), "unmatched"
    )
    await set_reconciliation_status(
        session, context, str(link["target_type"]), str(link["target_id"]), "unmatched"
    )
    return {"id": link["id"], "status": "removed"}


async def list_unmatched_reconciliation(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    company_id: str | None = None,
    limit: int = 25,
) -> dict[str, Any]:
    await ensure_accounting_tables(session, transactions=True)
    await ensure_accounting_deepening_tables(session, BANK_TRANSACTION_TABLE, E_DOCUMENT_TABLE)
    if company_id:
        assert_company_scope(context, company_id)
    return {
        "bank_transactions": await fetch_unmatched_rows(
            session, context, "public.accounting_bank_transactions", company_id, limit=limit
        ),
        "cari_transactions": await fetch_unmatched_rows(
            session, context, "public.accounting_cari_transactions", company_id, limit=limit
        ),
        "e_documents": await fetch_unmatched_rows(
            session, context, "public.accounting_e_documents", company_id, limit=limit
        ),
    }


async def get_reconciliation_summary(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    company_id: str | None = None,
) -> dict[str, Any]:
    await ensure_accounting_tables(session, transactions=True)
    await ensure_accounting_deepening_tables(
        session, BANK_TRANSACTION_TABLE, E_DOCUMENT_TABLE, RECONCILIATION_LINK_TABLE
    )
    if company_id:
        assert_company_scope(context, company_id)
    table_counts = {
        "unmatched_bank_transactions": await count_status(
            session, context, "public.accounting_bank_transactions", "unmatched", company_id
        ),
        "needs_review_bank_transactions": await count_status(
            session, context, "public.accounting_bank_transactions", "needs_review", company_id
        ),
        "unmatched_e_documents": await count_status(
            session, context, "public.accounting_e_documents", "unmatched", company_id
        ),
        "rejected_e_documents": await count_document_status(
            session, context, "rejected", company_id
        ),
        "missing_documents": await count_document_status(
            session,
            context,
            "document_needed",
            company_id,
            table="public.accounting_cari_transactions",
        ),
        "active_links": await count_links(session, context, company_id),
    }
    action_items = [
        item
        for item in [
            warning_item(
                "unmatched_bank_transactions",
                "Eslesmeyen banka hareketleri var",
                table_counts["unmatched_bank_transactions"],
                "/app/muhasebe/mutabakat",
            ),
            warning_item(
                "unmatched_e_documents",
                "Eslesmeyen e-belgeler var",
                table_counts["unmatched_e_documents"],
                "/app/muhasebe/e-fatura-e-arsiv",
            ),
            warning_item(
                "missing_documents",
                "Belge aranacak cari hareketler var",
                table_counts["missing_documents"],
                "/app/muhasebe/cari-hareketler?document_status=document_needed",
            ),
            warning_item(
                "rejected_e_documents",
                "Reddedilen e-belgeler inceleme bekliyor",
                table_counts["rejected_e_documents"],
                "/app/muhasebe/e-fatura-e-arsiv?status=rejected",
            ),
        ]
        if item["count"] > 0
    ]
    return {"summary": table_counts, "action_center_warnings": action_items}


async def fetch_unmatched_rows(
    session: AsyncSession,
    context: dict[str, Any],
    table: str,
    company_id: str | None,
    *,
    limit: int,
) -> list[dict[str, Any]]:
    where = [
        "tenant_id = :tenant_id",
        "coalesce(is_deleted, false) = false",
        "reconciliation_status in ('unmatched', 'needs_review')",
    ]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "limit": limit}
    if company_id:
        where.append("company_id = :company_id")
        params["company_id"] = company_id
    elif context.get("company_scope_ids"):
        where.append("company_id = any(cast(:company_scope_ids as uuid[]))")
        params["company_scope_ids"] = context["company_scope_ids"]
    date_column = "issue_date" if table.endswith("accounting_e_documents") else "transaction_date"
    result = await session.execute(
        text(
            f"""
            select *
            from {table}
            where {" and ".join(where)}
            order by {date_column} desc, id desc
            limit :limit
            """
        ),
        params,
    )
    return [row_to_dict(row) for row in result.mappings().all()]


async def get_reconciliation_entity(
    session: AsyncSession, context: dict[str, Any], entity_type: str, entity_id: str
) -> dict[str, Any]:
    table = entity_table(entity_type)
    result = await session.execute(
        text(
            f"""
            select *
            from {table}
            where tenant_id = :tenant_id
              and id = :entity_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "entity_id": entity_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError(
            "Mutabakat kaydi bulunamadi.",
            "RECONCILIATION_ENTITY_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
            {"entity_type": entity_type, "entity_id": entity_id},
        )
    return row_to_dict(row)


async def set_reconciliation_status(
    session: AsyncSession,
    context: dict[str, Any],
    entity_type: str,
    entity_id: str,
    reconciliation_status: str,
    matched_type: str | None = None,
    matched_id: str | None = None,
) -> None:
    table = entity_table(entity_type)
    assignments = ["reconciliation_status = :reconciliation_status", "updated_at = now()"]
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "entity_id": entity_id,
        "reconciliation_status": reconciliation_status,
    }
    if entity_type == "bank_transaction":
        if matched_type == "cari_transaction":
            assignments.append("matched_cari_transaction_id = :matched_id")
            params["matched_id"] = matched_id
        elif matched_type == "e_document":
            assignments.append("matched_invoice_id = :matched_id")
            params["matched_id"] = matched_id
    elif entity_type == "cari_transaction":
        if matched_type == "bank_transaction":
            assignments.append("matched_bank_transaction_id = :matched_id")
            params["matched_id"] = matched_id
        elif matched_type == "e_document":
            assignments.append("matched_invoice_id = :matched_id")
            params["matched_id"] = matched_id
    elif entity_type == "e_document":
        if reconciliation_status in {"matched", "partially_matched"}:
            assignments.append("status = 'matched'")
        if matched_type == "bank_transaction":
            assignments.append("matched_bank_transaction_id = :matched_id")
            params["matched_id"] = matched_id
        elif matched_type == "cari_transaction":
            assignments.append("matched_cari_transaction_id = :matched_id")
            params["matched_id"] = matched_id
    await session.execute(
        text(
            f"""
            update {table}
            set {", ".join(assignments)}
            where tenant_id = :tenant_id and id = :entity_id
            """
        ),
        params,
    )


async def find_reconciliation_link(
    session: AsyncSession,
    context: dict[str, Any],
    request: ReconciliationUnmatchRequest,
) -> dict[str, Any] | None:
    params: dict[str, Any] = {"tenant_id": context["tenant_id"]}
    where = ["tenant_id = :tenant_id", "status = 'active'"]
    if request.link_id:
        where.append("id = :link_id")
        params["link_id"] = request.link_id
    else:
        where.extend(
            [
                "source_type = :source_type",
                "source_id = :source_id",
                "target_type = :target_type",
                "target_id = :target_id",
            ]
        )
        params.update(
            {
                "source_type": request.source_type,
                "source_id": request.source_id,
                "target_type": request.target_type,
                "target_id": request.target_id,
            }
        )
    result = await session.execute(
        text(
            f"""
            select *
            from public.accounting_reconciliation_links
            where {" and ".join(where)}
            limit 1
            """
        ),
        params,
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def mark_suggestion_status(
    session: AsyncSession,
    context: dict[str, Any],
    request: ReconciliationMatchRequest,
    suggestion_status: str,
) -> None:
    await session.execute(
        text(
            """
            update public.accounting_matching_suggestions
            set status = :status,
                updated_at = now()
            where tenant_id = :tenant_id
              and source_type = :source_type
              and source_id = :source_id
              and target_type = :target_type
              and target_id = :target_id
              and status = 'open'
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "status": suggestion_status,
            "source_type": request.source_type,
            "source_id": request.source_id,
            "target_type": request.target_type,
            "target_id": request.target_id,
        },
    )


async def count_status(
    session: AsyncSession,
    context: dict[str, Any],
    table: str,
    reconciliation_status: str,
    company_id: str | None,
) -> int:
    where = [
        "tenant_id = :tenant_id",
        "coalesce(is_deleted, false) = false",
        "reconciliation_status = :status",
    ]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "status": reconciliation_status}
    if company_id:
        where.append("company_id = :company_id")
        params["company_id"] = company_id
    elif context.get("company_scope_ids"):
        where.append("company_id = any(cast(:company_scope_ids as uuid[]))")
        params["company_scope_ids"] = context["company_scope_ids"]
    result = await session.execute(
        text(f"select count(*) from {table} where {' and '.join(where)}"), params
    )
    return int(result.scalar_one() or 0)


async def count_document_status(
    session: AsyncSession,
    context: dict[str, Any],
    document_status: str,
    company_id: str | None,
    *,
    table: str = "public.accounting_e_documents",
) -> int:
    status_column = (
        "document_status" if table.endswith("accounting_cari_transactions") else "status"
    )
    where = [
        "tenant_id = :tenant_id",
        "coalesce(is_deleted, false) = false",
        f"{status_column} = :status",
    ]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "status": document_status}
    if company_id:
        where.append("company_id = :company_id")
        params["company_id"] = company_id
    elif context.get("company_scope_ids"):
        where.append("company_id = any(cast(:company_scope_ids as uuid[]))")
        params["company_scope_ids"] = context["company_scope_ids"]
    result = await session.execute(
        text(f"select count(*) from {table} where {' and '.join(where)}"), params
    )
    return int(result.scalar_one() or 0)


async def count_links(
    session: AsyncSession, context: dict[str, Any], company_id: str | None
) -> int:
    where = ["tenant_id = :tenant_id", "status = 'active'"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"]}
    if company_id:
        where.append("company_id = :company_id")
        params["company_id"] = company_id
    result = await session.execute(
        text(
            f"""
            select count(*)
            from public.accounting_reconciliation_links
            where {" and ".join(where)}
            """
        ),
        params,
    )
    return int(result.scalar_one() or 0)


def warning_item(key: str, title: str, count: int, target_page: str) -> dict[str, Any]:
    return {
        "source_type": "accounting_reconciliation",
        "key": key,
        "title": title,
        "count": count,
        "severity": "warning" if count < 10 else "critical",
        "target_page": target_page,
        "action_label": "Incele",
    }


def entity_table(entity_type: str) -> str:
    mapping = {
        "cari_transaction": "public.accounting_cari_transactions",
        "bank_transaction": "public.accounting_bank_transactions",
        "card_transaction": "public.accounting_card_transactions",
        "e_document": "public.accounting_e_documents",
        "capital_payment": "public.accounting_capital_reconciliation",
    }
    table = mapping.get(entity_type)
    if not table:
        raise DomainError(
            "Bu kayit tipi mutabakat icin desteklenmiyor.",
            "RECONCILIATION_ENTITY_NOT_SUPPORTED",
            status.HTTP_400_BAD_REQUEST,
            {"entity_type": entity_type},
        )
    return table
