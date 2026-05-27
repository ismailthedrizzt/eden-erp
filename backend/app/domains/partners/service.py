from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.operations.service import table_exists
from app.domains.ownership.schemas import OWNERSHIP_CONTROLLED_PARTNER_FIELDS
from app.domains.ownership.service import ACTIVE_VALUES, DRAFT_VALUES, PASSIVE_VALUES

PARTNER_CARD_FIELDS = {
    "company_id",
    "person_id",
    "organization_id",
    "first_name",
    "last_name",
    "owner_kind",
    "partner_type",
    "source_type",
    "source_id",
    "display_name",
    "partner_name",
    "identity_number",
    "identity_tax_number",
    "photo_logo",
    "partner_documents",
    "partner_profile",
    "document_reference_id",
    "notes",
}


def _status_text(partner: dict[str, Any] | None) -> str:
    if not partner:
        return ""
    return f"{partner.get('record_status') or ''} {partner.get('status') or ''}".lower()


def is_partner_active(partner: dict[str, Any] | None) -> bool:
    text_value = _status_text(partner)
    return bool(partner) and any(value in text_value for value in ACTIVE_VALUES)


def is_partner_draft(partner: dict[str, Any] | None) -> bool:
    text_value = _status_text(partner)
    return bool(partner) and any(value in text_value for value in DRAFT_VALUES)


def is_partner_passive(partner: dict[str, Any] | None) -> bool:
    text_value = _status_text(partner)
    return bool(partner) and any(value in text_value for value in PASSIVE_VALUES)


def reject_operation_controlled_partner_patch(payload: dict[str, Any]) -> None:
    blocked = sorted(OWNERSHIP_CONTROLLED_PARTNER_FIELDS.intersection(payload))
    if blocked:
        raise DomainError(
            "Ortaklik haklari ortak karti guncellemesiyle degistirilemez. "
            "Ilgili ortaklik islemini kullanin.",
            "OPERATION_CONTROLLED_FIELDS",
            status.HTTP_409_CONFLICT,
            {"fields": blocked},
        )


async def get_partner_by_id(
    session: AsyncSession,
    tenant_id: str,
    partner_id: str,
) -> dict[str, Any] | None:
    if not await table_exists(session, "public.company_partners"):
        raise DomainError(
            "Ortaklarimiz modulu hazir olmadigi icin ortak kaydi okunamadi.",
            "PARTNER_INFRASTRUCTURE_MISSING",
            status.HTTP_409_CONFLICT,
        )
    result = await session.execute(
        text(
            """
            select *
            from public.company_partners
            where tenant_id = :tenant_id
              and id = :partner_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "partner_id": partner_id},
    )
    row = result.mappings().one_or_none()
    return dict(row) if row else None


async def list_partners_for_company(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
) -> list[dict[str, Any]]:
    if not await table_exists(session, "public.company_partners"):
        raise DomainError(
            "Ortaklarimiz modulu hazir olmadigi icin ortak kayitlari okunamadi.",
            "PARTNER_INFRASTRUCTURE_MISSING",
            status.HTTP_409_CONFLICT,
        )
    result = await session.execute(
        text(
            """
            select *
            from public.company_partners
            where tenant_id = :tenant_id
              and company_id = :company_id
              and coalesce(is_deleted, false) = false
            order by coalesce(display_name, partner_name, first_name, id::text)
            """
        ),
        {"tenant_id": tenant_id, "company_id": company_id},
    )
    return [dict(row) for row in result.mappings().all()]


def assert_partner_belongs_to_company(partner: dict[str, Any] | None, company_id: str) -> None:
    if not partner:
        raise DomainError("Ortak kaydi bulunamadi.", "PARTNER_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    if str(partner.get("company_id") or "") != str(company_id):
        raise DomainError(
            "Secilen ortak bu sirkete bagli degil.",
            "PARTNER_COMPANY_MISMATCH",
            status.HTTP_409_CONFLICT,
        )


def assert_partner_card_status(partner: dict[str, Any] | None, allowed_statuses: set[str]) -> None:
    if not partner:
        raise DomainError("Ortak kaydi bulunamadi.", "PARTNER_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    if is_partner_draft(partner):
        lifecycle = "draft"
    elif is_partner_passive(partner):
        lifecycle = "passive"
    else:
        lifecycle = "active"
    if lifecycle not in allowed_statuses:
        raise DomainError(
            "Ortak kartinin durumu bu islem icin uygun degil.",
            "PARTNER_STATUS_NOT_ALLOWED",
            status.HTTP_409_CONFLICT,
            {"record_status": partner.get("record_status"), "status": partner.get("status")},
        )


async def activate_partner_card(
    session: AsyncSession,
    context: dict[str, Any],
    partner_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    return await _update_partner_status(
        session,
        context,
        partner_id,
        record_status="active",
        status_value="active",
        lifecycle_event="initial_partnership_entry_completed",
        payload=payload,
    )


async def set_partner_passive(
    session: AsyncSession,
    context: dict[str, Any],
    partner_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    return await _update_partner_status(
        session,
        context,
        partner_id,
        record_status="passive",
        status_value="passive",
        lifecycle_event="ownership_exit_completed",
        payload=payload,
        end_date=payload.get("effective_date"),
    )


async def update_partner_card_only(
    session: AsyncSession,
    context: dict[str, Any],
    partner_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    reject_operation_controlled_partner_patch(payload)
    patch = {key: value for key, value in payload.items() if key in PARTNER_CARD_FIELDS}
    if not patch:
        raise DomainError(
            "Guncellenecek ortak kart alani bulunamadi.",
            "NO_CHANGED_FIELDS",
            status.HTTP_400_BAD_REQUEST,
        )
    assignments: list[str] = []
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "partner_id": partner_id,
        "updated_by": context.get("user_id"),
    }
    for field, value in patch.items():
        if field in {"photo_logo", "partner_documents", "partner_profile"}:
            assignments.append(f"{field} = cast(:{field} as jsonb)")
            default_json: list[Any] | dict[str, Any] = (
                [] if field != "partner_profile" else {}
            )
            params[field] = json.dumps(
                value or default_json,
                ensure_ascii=False,
                default=str,
            )
        else:
            assignments.append(f"{field} = :{field}")
            params[field] = value
    assignments.extend(["updated_at = now()", "version = coalesce(version, 0) + 1"])
    result = await session.execute(
        text(
            f"""
            update public.company_partners
            set {", ".join(assignments)}
            where tenant_id = :tenant_id
              and id = :partner_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        params,
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Ortak kaydi bulunamadi.", "PARTNER_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return dict(row)


async def _update_partner_status(
    session: AsyncSession,
    context: dict[str, Any],
    partner_id: str,
    *,
    record_status: str,
    status_value: str,
    lifecycle_event: str,
    payload: dict[str, Any],
    end_date: str | None = None,
) -> dict[str, Any]:
    history_entry = {
        "action": lifecycle_event,
        "changed_at": datetime.now(UTC).isoformat(),
        "changed_by": context.get("user_id"),
        "payload": payload,
    }
    result = await session.execute(
        text(
            """
            update public.company_partners
            set record_status = :record_status,
                status = :status,
                start_date = coalesce(start_date, cast(:start_date as date)),
                end_date = coalesce(cast(:end_date as date), end_date),
                history = coalesce(history, '[]'::jsonb)
                  || jsonb_build_array(cast(:history_entry as jsonb)),
                updated_at = now(),
                version = coalesce(version, 0) + 1
            where tenant_id = :tenant_id
              and id = :partner_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "partner_id": partner_id,
            "record_status": record_status,
            "status": status_value,
            "start_date": payload.get("effective_date"),
            "end_date": end_date,
            "history_entry": json.dumps(history_entry, ensure_ascii=False, default=str),
        },
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Ortak kaydi bulunamadi.", "PARTNER_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return dict(row)
