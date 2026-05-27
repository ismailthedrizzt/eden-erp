from __future__ import annotations

import json
from datetime import date
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.company.service import (
    assert_company_active_for_official_change,
    get_company_context,
    get_company_lifecycle,
)
from app.domains.operations.service import table_exists

TRANSACTION_PREFIXES = {
    "title_change": "TITLE",
    "address_change": "ADDR",
    "public_registration_update": "PUBREG",
    "nace_change": "NACE",
    "activity_subject_change": "ACTSUBJ",
    "branch_opening": "BR-OPEN",
    "branch_closing": "BR-CLOSE",
}


async def next_official_change_no(
    session: AsyncSession,
    company_id: str,
    transaction_type: str,
) -> str:
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
    prefix = TRANSACTION_PREFIXES.get(transaction_type, "OFF")
    return f"{prefix}-{next_no:05d}"


def _blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _date_value(value: str | None) -> date | None:
    normalized = _blank_to_none(value)
    return date.fromisoformat(normalized) if normalized else None


def validate_official_dates(
    decision_date: str | None,
    registration_date: str | None,
    gazette_date: str | None,
) -> list[str]:
    decision = _date_value(decision_date)
    registration = _date_value(registration_date)
    gazette = _date_value(gazette_date)
    if decision and registration and registration < decision:
        raise DomainError(
            "Tescil tarihi karar tarihinden önce olamaz.",
            "OFFICIAL_DATE_ORDER_INVALID",
            status.HTTP_400_BAD_REQUEST,
        )
    warnings: list[str] = []
    if decision and gazette and gazette < decision:
        warnings.append(
            "Ticaret sicil gazetesi tarihi karar tarihinden önce görünüyor; bilgileri kontrol edin."
        )
    return warnings


def normalize_documents(
    document_files: list[dict[str, Any]] | None,
    document_meta: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    meta = document_meta or {}
    normalized: list[dict[str, Any]] = []
    for index, document in enumerate(document_files or []):
        if not isinstance(document, dict):
            continue
        label = document.get("label") or document.get("name") or document.get("file_name")
        file_url = document.get("url") or document.get("file_url") or document.get("path")
        if not label and not file_url:
            continue
        normalized.append(
            {
                **document,
                "label": label,
                "file_url": file_url,
                "meta": meta.get(str(index)) if isinstance(meta, dict) else None,
            }
        )
    return normalized


def build_changed_values(
    old_record: dict[str, Any],
    new_record: dict[str, Any],
    fields: list[str],
) -> dict[str, dict[str, Any]]:
    return {
        field: {"old": old_record.get(field), "new": new_record.get(field)}
        for field in fields
        if old_record.get(field) != new_record.get(field)
    }


async def build_official_change_precheck(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    change_type: str,
) -> dict[str, Any]:
    company_context = await get_company_context(session, context["tenant_id"], company_id)
    company = company_context["company"]
    warnings: list[str] = []
    blocking_reasons: list[str] = []
    reasons: list[str] = []
    try:
        assert_company_active_for_official_change(company, change_type)
    except DomainError as error:
        blocking_reasons.append(error.message)
        reasons.append(error.message)

    lifecycle = get_company_lifecycle(company)
    ok = not blocking_reasons
    return {
        "ok": ok,
        "operation_enabled": ok,
        "message": "Resmi değişiklik başlatılabilir." if ok else blocking_reasons[0],
        "reasons": reasons,
        "warnings": warnings,
        "blocking_reasons": blocking_reasons,
        "is_company_active": lifecycle in {"active", "aktif", "opened", "open"},
        "company_status": company.get("company_status") if company else None,
        "record_status": company.get("record_status") if company else None,
        "current": company,
        "public_tax": company_context["public_tax"],
        "public_sgk": company_context["public_sgk"],
        "public_registry": company_context["public_registry"],
        "public_channels": company_context["public_channels"],
    }


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
