from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.accounting.schemas import (
    EDocumentCreateRequest,
    EDocumentImportRequest,
    EDocumentListQuery,
    EDocumentUpdateRequest,
    ListResult,
    ReconciliationMatchRequest,
)
from app.domains.accounting.service import (
    E_DOCUMENT_TABLE,
    assert_company_exists,
    assert_company_scope,
    assert_version,
    ensure_accounting_deepening_tables,
    json_dumps,
    list_meta,
    row_to_dict,
)

E_DOCUMENT_SORT_COLUMNS = {
    "issue_date": "issue_date",
    "due_date": "due_date",
    "invoice_no": "invoice_no",
    "payable_amount": "payable_amount",
    "status": "status",
    "created_at": "created_at",
}

E_DOCUMENT_MUTABLE_COLUMNS = {
    "document_kind",
    "direction",
    "invoice_uuid",
    "invoice_no",
    "issue_date",
    "due_date",
    "sender_tax_number",
    "sender_name",
    "receiver_tax_number",
    "receiver_name",
    "total_amount",
    "tax_amount",
    "payable_amount",
    "currency",
    "status",
    "gib_status",
    "scenario_type",
    "invoice_type",
    "xml_document_id",
    "pdf_document_id",
    "related_cari_account_id",
    "matched_cari_transaction_id",
    "matched_bank_transaction_id",
    "reconciliation_status",
    "raw_data",
    "notes",
    "metadata_json",
}


async def list_e_documents(
    session: AsyncSession,
    context: dict[str, Any],
    query: EDocumentListQuery,
) -> ListResult:
    await ensure_accounting_deepening_tables(session, E_DOCUMENT_TABLE)
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
    if query.document_kind:
        where.append("document_kind = :document_kind")
        params["document_kind"] = query.document_kind
    if query.direction:
        where.append("direction = :direction")
        params["direction"] = query.direction
    if query.status:
        where.append("status = :status")
        params["status"] = query.status
    if query.reconciliation_status:
        where.append("reconciliation_status = :reconciliation_status")
        params["reconciliation_status"] = query.reconciliation_status
    if query.related_cari_account_id:
        where.append("related_cari_account_id = :related_cari_account_id")
        params["related_cari_account_id"] = query.related_cari_account_id
    if query.date_from:
        where.append("issue_date >= :date_from")
        params["date_from"] = query.date_from
    if query.date_to:
        where.append("issue_date <= :date_to")
        params["date_to"] = query.date_to
    if query.search:
        where.append(
            "("
            "invoice_no ilike :search "
            "or sender_name ilike :search "
            "or receiver_name ilike :search "
            "or invoice_uuid ilike :search"
            ")"
        )
        params["search"] = f"%{query.search}%"
    where_sql = " and ".join(where)
    sort_column = E_DOCUMENT_SORT_COLUMNS.get(query.sort, "issue_date")
    direction = "desc" if query.direction_sort.lower() == "desc" else "asc"
    total_result = await session.execute(
        text(f"select count(*) from public.accounting_e_documents where {where_sql}"), params
    )
    result = await session.execute(
        text(
            f"""
            select *
            from public.accounting_e_documents
            where {where_sql}
            order by {sort_column} {direction}, id desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    return ListResult(
        data=[row_to_dict(row) for row in result.mappings().all()],
        meta=list_meta(query.page, query.page_size, int(total_result.scalar_one() or 0)),
    )


async def get_e_document(
    session: AsyncSession, tenant_id: str, document_id: str
) -> dict[str, Any] | None:
    await ensure_accounting_deepening_tables(session, E_DOCUMENT_TABLE)
    result = await session.execute(
        text(
            """
            select *
            from public.accounting_e_documents
            where tenant_id = :tenant_id
              and id = :document_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "document_id": document_id},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def create_e_document(
    session: AsyncSession,
    context: dict[str, Any],
    request: EDocumentCreateRequest,
) -> dict[str, Any]:
    await ensure_accounting_deepening_tables(session, E_DOCUMENT_TABLE)
    payload = request.model_dump(exclude_none=True)
    company_id = str(payload["company_id"])
    assert_company_scope(context, company_id, write=True)
    await assert_company_exists(session, context, company_id)
    await assert_unique_e_document(session, context, payload)
    return await insert_e_document(session, context, payload)


async def update_e_document(
    session: AsyncSession,
    context: dict[str, Any],
    document_id: str,
    request: EDocumentUpdateRequest,
) -> dict[str, Any]:
    current = await get_e_document(session, context["tenant_id"], document_id)
    if not current:
        raise DomainError("E-belge bulunamadi.", "E_DOCUMENT_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    assert_company_scope(context, str(current["company_id"]), write=True)
    payload = request.model_dump(exclude_unset=True, exclude_none=True)
    assert_version(current, payload.pop("base_version", None))
    patch = {key: value for key, value in payload.items() if key in E_DOCUMENT_MUTABLE_COLUMNS}
    if not patch:
        raise DomainError(
            "Guncellenecek e-belge alani bulunamadi.",
            "NO_CHANGED_FIELDS",
            status.HTTP_400_BAD_REQUEST,
        )
    await assert_unique_e_document(session, context, {**current, **patch}, exclude_id=document_id)
    assignments: list[str] = []
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "document_id": document_id,
        "updated_by": context.get("user_id"),
    }
    for key, value in patch.items():
        if key in {"metadata_json", "raw_data"}:
            assignments.append(f"{key} = cast(:{key} as jsonb)")
            params[key] = json_dumps(value)
        else:
            assignments.append(f"{key} = :{key}")
            params[key] = value
    assignments.extend(["updated_by = :updated_by", "updated_at = now()", "version = version + 1"])
    result = await session.execute(
        text(
            f"""
            update public.accounting_e_documents
            set {", ".join(assignments)}
            where tenant_id = :tenant_id
              and id = :document_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        params,
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("E-belge bulunamadi.", "E_DOCUMENT_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return row_to_dict(row)


async def import_e_documents(
    session: AsyncSession,
    context: dict[str, Any],
    request: EDocumentImportRequest,
) -> dict[str, Any]:
    await ensure_accounting_deepening_tables(session, E_DOCUMENT_TABLE)
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
        assert_company_scope(context, str(payload["company_id"]), write=not request.dry_run)
        duplicate = await find_duplicate_e_document(session, context, payload)
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
        try:
            if request.dry_run:
                rows.append({"row_number": index, "status": "valid", "data": payload})
            else:
                rows.append(
                    {
                        "row_number": index,
                        "status": "imported",
                        "data": await insert_e_document(session, context, payload),
                    }
                )
                summary["imported_rows"] += 1
        except DomainError as error:
            summary["failed_rows"] += 1
            errors.append({"row_number": index, "code": error.code, "message": error.message})
    return {"summary": summary, "rows": rows, "errors": errors}


async def match_e_document(
    session: AsyncSession,
    context: dict[str, Any],
    document_id: str,
    request: ReconciliationMatchRequest,
) -> dict[str, Any]:
    from app.domains.accounting.reconciliation import match_reconciliation_records

    current = await get_e_document(session, context["tenant_id"], document_id)
    if not current:
        raise DomainError("E-belge bulunamadi.", "E_DOCUMENT_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    if request.source_id != document_id:
        raise DomainError(
            "E-belge eslestirme kaynagi uyumsuz.", "MATCH_SOURCE_MISMATCH", status.HTTP_409_CONFLICT
        )
    return await match_reconciliation_records(session, context, request)


async def reject_e_document(
    session: AsyncSession,
    context: dict[str, Any],
    document_id: str,
    reason: str | None = None,
) -> dict[str, Any]:
    current = await get_e_document(session, context["tenant_id"], document_id)
    if not current:
        raise DomainError("E-belge bulunamadi.", "E_DOCUMENT_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    assert_company_scope(context, str(current["company_id"]), write=True)
    result = await session.execute(
        text(
            """
            update public.accounting_e_documents
            set status = 'rejected',
                reconciliation_status = 'needs_review',
                notes = coalesce(:reason, notes),
                updated_by = :updated_by,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :document_id
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "document_id": document_id,
            "reason": reason,
            "updated_by": context.get("user_id"),
        },
    )
    return row_to_dict(result.mappings().one())


async def insert_e_document(
    session: AsyncSession, context: dict[str, Any], payload: dict[str, Any]
) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            insert into public.accounting_e_documents (
              id, tenant_id, company_id, document_kind, direction, invoice_uuid, invoice_no,
              issue_date, due_date, sender_tax_number, sender_name, receiver_tax_number,
              receiver_name, total_amount, tax_amount, payable_amount, currency, status,
              gib_status, scenario_type, invoice_type, xml_document_id, pdf_document_id,
              related_cari_account_id, matched_cari_transaction_id, matched_bank_transaction_id,
              reconciliation_status, import_job_id, raw_data, notes, metadata_json,
              created_by, updated_by, created_at, updated_at, version, is_deleted
            )
            values (
              :id, :tenant_id, :company_id, :document_kind, :direction, :invoice_uuid, :invoice_no,
              :issue_date, :due_date, :sender_tax_number, :sender_name, :receiver_tax_number,
              :receiver_name, :total_amount, :tax_amount, :payable_amount, :currency, :status,
              :gib_status, :scenario_type, :invoice_type, :xml_document_id, :pdf_document_id,
              :related_cari_account_id, :matched_cari_transaction_id, :matched_bank_transaction_id,
              :reconciliation_status, :import_job_id, cast(:raw_data as jsonb), :notes,
              cast(:metadata_json as jsonb), :created_by, :updated_by, now(), now(), 1, false
            )
            returning *
            """
        ),
        {
            **payload,
            "id": str(uuid4()),
            "tenant_id": context["tenant_id"],
            "raw_data": json_dumps(payload.get("raw_data")),
            "metadata_json": json_dumps(payload.get("metadata_json")),
            "created_by": context.get("user_id"),
            "updated_by": context.get("user_id"),
        },
    )
    return row_to_dict(result.mappings().one())


async def assert_unique_e_document(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
    *,
    exclude_id: str | None = None,
) -> None:
    duplicate = await find_duplicate_e_document(session, context, payload, exclude_id=exclude_id)
    if duplicate:
        raise DomainError(
            "Bu e-belge daha once kaydedilmis.",
            "DUPLICATE_E_DOCUMENT",
            status.HTTP_409_CONFLICT,
            {"document_id": duplicate.get("id")},
        )


async def find_duplicate_e_document(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
    *,
    exclude_id: str | None = None,
) -> dict[str, Any] | None:
    exclude = "and id <> :exclude_id" if exclude_id else ""
    if payload.get("invoice_uuid"):
        result = await session.execute(
            text(
                f"""
                select id
                from public.accounting_e_documents
                where tenant_id = :tenant_id
                  and invoice_uuid = :invoice_uuid
                  and coalesce(is_deleted, false) = false
                  {exclude}
                limit 1
                """
            ),
            {
                "tenant_id": context["tenant_id"],
                "invoice_uuid": payload.get("invoice_uuid"),
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
            from public.accounting_e_documents
            where tenant_id = :tenant_id
              and company_id = :company_id
              and invoice_no = :invoice_no
              and direction = :direction
              and coalesce(is_deleted, false) = false
              {exclude}
            limit 1
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "company_id": payload.get("company_id"),
            "invoice_no": payload.get("invoice_no"),
            "direction": payload.get("direction"),
            "exclude_id": exclude_id,
        },
    )
    row = result.mappings().one_or_none()
    return dict(row) if row else None
