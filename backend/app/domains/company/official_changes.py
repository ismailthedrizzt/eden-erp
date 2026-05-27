from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.operations.service import table_exists


async def next_official_change_no(session: AsyncSession, company_id: str, transaction_type: str) -> str:
    result = await session.execute(
        text(
            """
            select count(*) + 1 as next_no
            from public.company_official_change_transactions
            where company_id = :company_id
              and transaction_type = :transaction_type
            """
        ),
        {"company_id": company_id, "transaction_type": transaction_type},
    )
    next_no = int(result.mappings().one()["next_no"] or 1)
    prefix = "BR-OPEN" if transaction_type == "branch_opening" else "BR-CLOSE"
    return f"{prefix}-{next_no:05d}"


async def insert_official_change_transaction(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    company_id: str,
    branch_id: str | None,
    operation_id: str | None,
    transaction_type: str,
    old_values: dict[str, Any],
    new_values: dict[str, Any],
    changed_fields: list[str],
    document_files: list[dict[str, Any]],
    decision_date: str | None,
    registration_date: str | None,
    trade_registry_gazette_date: str | None,
    trade_registry_gazette_number: str | None,
    effective_date: str | None,
    notes: str | None,
    warnings: list[str],
) -> dict[str, Any]:
    if not await table_exists(session, "public.company_official_change_transactions"):
        raise DomainError(
            "Resmi işlem kayıt altyapısı tamamlanmamış.",
            "OFFICIAL_CHANGE_INFRASTRUCTURE_MISSING",
            status.HTTP_409_CONFLICT,
        )

    transaction_id = str(uuid4())
    transaction_no = await next_official_change_no(session, company_id, transaction_type)
    result = await session.execute(
        text(
            """
            insert into public.company_official_change_transactions (
              id, tenant_id, company_id, branch_id, operation_id, transaction_no,
              transaction_type, old_values, new_values, changed_fields, document_files,
              decision_date, registration_date, trade_registry_gazette_date,
              trade_registry_gazette_number, effective_date, approval_status,
              workflow_status, status, notes, warnings, created_by, updated_by
            )
            values (
              :id, :tenant_id, :company_id, :branch_id, :operation_id, :transaction_no,
              :transaction_type, cast(:old_values as jsonb), cast(:new_values as jsonb),
              :changed_fields, cast(:document_files as jsonb), :decision_date,
              :registration_date, :trade_registry_gazette_date, :trade_registry_gazette_number,
              :effective_date, 'approved', 'completed', 'completed', :notes,
              cast(:warnings as jsonb), :user_id, :user_id
            )
            returning *
            """
        ),
        {
            "id": transaction_id,
            "tenant_id": context["tenant_id"],
            "company_id": company_id,
            "branch_id": branch_id,
            "operation_id": operation_id,
            "transaction_no": transaction_no,
            "transaction_type": transaction_type,
            "old_values": json.dumps(old_values, ensure_ascii=False, default=str),
            "new_values": json.dumps(new_values, ensure_ascii=False, default=str),
            "changed_fields": changed_fields,
            "document_files": json.dumps(document_files, ensure_ascii=False, default=str),
            "decision_date": decision_date,
            "registration_date": registration_date,
            "trade_registry_gazette_date": trade_registry_gazette_date,
            "trade_registry_gazette_number": trade_registry_gazette_number,
            "effective_date": effective_date,
            "notes": notes,
            "warnings": json.dumps(warnings, ensure_ascii=False),
            "user_id": context.get("user_id"),
        },
    )
    return dict(result.mappings().one())


async def insert_company_lifecycle_event(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    company_id: str,
    event_type: str,
    event_date: str | None,
    payload: dict[str, Any],
) -> dict[str, Any] | None:
    if not await table_exists(session, "public.company_lifecycle_events"):
        return None
    event_id = str(uuid4())
    result = await session.execute(
        text(
            """
            insert into public.company_lifecycle_events (
              id, tenant_id, company_id, event_type, event_date, payload_json, created_by
            )
            values (
              :id, :tenant_id, :company_id, :event_type, coalesce(:event_date, current_date),
              cast(:payload_json as jsonb), :user_id
            )
            returning *
            """
        ),
        {
            "id": event_id,
            "tenant_id": context["tenant_id"],
            "company_id": company_id,
            "event_type": event_type,
            "event_date": event_date,
            "payload_json": json.dumps(payload, ensure_ascii=False, default=str),
            "user_id": context.get("user_id"),
        },
    )
    return dict(result.mappings().one())
