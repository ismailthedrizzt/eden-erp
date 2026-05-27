from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.operations.service import table_exists
from app.domains.ownership.schemas import CapitalIncreaseDistributionRow
from app.domains.ownership.service import ownership_transaction_payload


async def insert_ownership_transaction(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
) -> dict[str, Any]:
    if not await table_exists(session, "public.ownership_transactions"):
        raise DomainError(
            "Ortaklik islem altyapisi hazir olmadigi icin Sermaye Artirimi baslatilamaz.",
            "OWNERSHIP_INFRASTRUCTURE_MISSING",
            status.HTTP_409_CONFLICT,
        )

    transaction_id = str(uuid4())
    result = await session.execute(
        text(
            """
            insert into public.ownership_transactions (
              id, tenant_id, company_id, transaction_no, transaction_type,
              transaction_date, effective_date, affected_partner_id, share_ratio,
              voting_ratio, profit_ratio, capital_amount, committed_capital_amount,
              new_capital_amount, currency, capital_distribution, new_values,
              document_status, document_files, status, approval_status, workflow_status,
              description, transaction_reason, notes, warnings, history,
              approved_at, created_by, updated_by
            )
            values (
              :id, :tenant_id, :company_id, :transaction_no, :transaction_type,
              :transaction_date, :effective_date, :affected_partner_id, :share_ratio,
              :voting_ratio, :profit_ratio, :capital_amount, :committed_capital_amount,
              :new_capital_amount, :currency, cast(:capital_distribution as jsonb),
              cast(:new_values as jsonb), :document_status, cast(:document_files as jsonb),
              :status, :approval_status, :workflow_status, :description,
              :transaction_reason, :notes, cast(:warnings as jsonb), cast(:history as jsonb),
              now(), :created_by, :updated_by
            )
            returning id, transaction_no, affected_partner_id, share_ratio,
              capital_amount, approval_status, workflow_status
            """
        ),
        {
            "id": transaction_id,
            **{
                key: value
                for key, value in payload.items()
                if key
                not in {
                    "capital_distribution",
                    "new_values",
                    "document_files",
                    "warnings",
                    "history",
                }
            },
            "capital_distribution": json.dumps(
                payload.get("capital_distribution") or [], ensure_ascii=False, default=str
            ),
            "new_values": json.dumps(
                payload.get("new_values") or {}, ensure_ascii=False, default=str
            ),
            "document_files": json.dumps(
                payload.get("document_files") or [], ensure_ascii=False, default=str
            ),
            "warnings": json.dumps(payload.get("warnings") or [], ensure_ascii=False, default=str),
            "history": json.dumps(payload.get("history") or [], ensure_ascii=False, default=str),
        },
    )
    return dict(result.mappings().one())


async def insert_capital_increase_ownership_transactions(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    company_id: str,
    capital_transaction_id: str | None,
    transaction_no: str,
    transaction_date: str,
    effective_date: str | None,
    currency: str,
    distribution_rows: list[CapitalIncreaseDistributionRow],
    document_files: list[dict[str, Any]],
    warnings: list[str],
    notes: str | None,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for index, row in enumerate(distribution_rows, start=1):
        payload = ownership_transaction_payload(
            context,
            transaction_no=f"{transaction_no}-OI-{index:02d}",
            company_id=company_id,
            capital_transaction_id=capital_transaction_id,
            transaction_date=transaction_date,
            effective_date=effective_date,
            currency=currency,
            row=row,
            distribution_rows=distribution_rows,
            document_files=document_files,
            warnings=warnings,
            notes=notes,
        )
        rows.append(await insert_ownership_transaction(session, context, payload))
    return rows
