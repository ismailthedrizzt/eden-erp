from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.operations.service import table_exists
from app.domains.ownership.service import ACTIVE_VALUES, DRAFT_VALUES, PASSIVE_VALUES
from app.policies.delete_guards import can_hard_delete_partner_draft
from app.policies.field_control import reject_operation_controlled_patch, strip_system_fields

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
PARTNER_PROFILE_FIELDS = {
    "trade_name",
    "short_name",
    "national_id",
    "passport_no",
    "nationality",
    "tax_number",
    "phone",
    "email",
    "address",
    "city",
    "district",
    "country",
    "contact_points",
    "entity_bank_accounts",
}
PARTNER_JSON_FIELDS = {"photo_logo", "partner_documents", "partner_profile"}


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
    reject_operation_controlled_patch("company_partner", payload)


def _partner_display_name(payload: dict[str, Any]) -> str:
    if payload.get("display_name"):
        return str(payload["display_name"])
    if payload.get("trade_name"):
        return str(payload["trade_name"])
    full_name = " ".join(
        part for part in [payload.get("first_name"), payload.get("last_name")] if part
    ).strip()
    return full_name or "Ortak"


def _merge_partner_profile(
    current_profile: Any,
    payload: dict[str, Any],
) -> dict[str, Any]:
    profile = dict(current_profile or {}) if isinstance(current_profile, dict) else {}
    for field in PARTNER_PROFILE_FIELDS:
        if field in payload and payload[field] is not None:
            profile[field] = payload[field]
    return profile


async def assert_unique_partner_card(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    person_id: str | None,
    organization_id: str | None,
    *,
    exclude_id: str | None = None,
) -> None:
    if not person_id and not organization_id:
        return
    column = "person_id" if person_id else "organization_id"
    master_id = person_id or organization_id
    exclude = "and id <> :exclude_id" if exclude_id else ""
    result = await session.execute(
        text(
            f"""
            select id
            from public.company_partners
            where tenant_id = :tenant_id
              and company_id = :company_id
              and {column} = :master_id
              and coalesce(is_deleted, false) = false
              {exclude}
            limit 1
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "company_id": company_id,
            "master_id": master_id,
            "exclude_id": exclude_id,
        },
    )
    row = result.mappings().one_or_none()
    if row:
        raise DomainError(
            "Bu sirket icin ayni kisi/kurum adina ortak karti zaten var.",
            "DUPLICATE_PARTNER_CARD",
            status.HTTP_409_CONFLICT,
            {"partner_id": row["id"]},
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


async def create_partner_draft(
    session: AsyncSession,
    context: dict[str, Any],
    request: dict[str, Any],
) -> dict[str, Any]:
    payload = strip_system_fields(request)
    reject_operation_controlled_partner_patch(payload)
    company_id = payload.get("company_id")
    if not company_id:
        raise DomainError(
            "Ortak karti icin sirket zorunludur.", "COMPANY_REQUIRED", status.HTTP_400_BAD_REQUEST
        )
    if await table_exists(session, "public.companies"):
        company_result = await session.execute(
            text(
                """
                select id
                from public.companies
                where tenant_id = :tenant_id
                  and id = :company_id
                  and coalesce(is_deleted, false) = false
                limit 1
                """
            ),
            {"tenant_id": context["tenant_id"], "company_id": company_id},
        )
        if not company_result.mappings().one_or_none():
            raise DomainError(
                "Sirket kaydi bulunamadi.", "COMPANY_NOT_FOUND", status.HTTP_404_NOT_FOUND
            )
    await assert_unique_partner_card(
        session,
        context,
        str(company_id),
        payload.get("person_id"),
        payload.get("organization_id"),
    )
    owner_kind = payload.get("owner_kind") or payload.get("partner_type") or "person"
    display_name = _partner_display_name(payload)
    partner_profile = _merge_partner_profile({}, payload)
    partner_id = str(uuid4())
    result = await session.execute(
        text(
            """
            insert into public.company_partners (
              id, tenant_id, company_id, person_id, organization_id,
              first_name, last_name, owner_kind, partner_type, source_type, source_id,
              display_name, partner_name, identity_number, identity_tax_number,
              photo_logo, partner_documents, partner_profile, notes,
              status, record_status, is_deleted, created_at, updated_at, version
            )
            values (
              :id, :tenant_id, :company_id, :person_id, :organization_id,
              :first_name, :last_name, :owner_kind, :partner_type, :source_type, :source_id,
              :display_name, :partner_name, :identity_number, :identity_tax_number,
              cast(:photo_logo as jsonb), cast(:partner_documents as jsonb),
              cast(:partner_profile as jsonb), :notes,
              'draft', 'draft', false, now(), now(), 1
            )
            returning *
            """
        ),
        {
            "id": partner_id,
            "tenant_id": context["tenant_id"],
            "company_id": company_id,
            "person_id": payload.get("person_id"),
            "organization_id": payload.get("organization_id"),
            "first_name": payload.get("first_name"),
            "last_name": payload.get("last_name"),
            "owner_kind": owner_kind,
            "partner_type": payload.get("partner_type") or owner_kind,
            "source_type": payload.get("source_type"),
            "source_id": payload.get("source_id"),
            "display_name": display_name,
            "partner_name": payload.get("trade_name") or display_name,
            "identity_number": payload.get("identity_number") or payload.get("national_id"),
            "identity_tax_number": payload.get("tax_number") or payload.get("identity_tax_number"),
            "photo_logo": json.dumps(
                payload.get("photo_logo") or [], ensure_ascii=False, default=str
            ),
            "partner_documents": json.dumps(
                payload.get("partner_documents") or [], ensure_ascii=False, default=str
            ),
            "partner_profile": json.dumps(partner_profile, ensure_ascii=False, default=str),
            "notes": payload.get("notes"),
        },
    )
    return dict(result.mappings().one())


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
    return await update_partner_card(session, context, partner_id, payload)


async def update_partner_card(
    session: AsyncSession,
    context: dict[str, Any],
    partner_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    payload = strip_system_fields(payload)
    reject_operation_controlled_partner_patch(payload)
    partner = await get_partner_by_id(session, context["tenant_id"], partner_id)
    if not partner:
        raise DomainError("Ortak kaydi bulunamadi.", "PARTNER_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    base_version = payload.get("base_version")
    if base_version is not None and int(partner.get("version") or 0) != int(base_version):
        raise DomainError(
            "Ortak kaydi baska bir islem tarafindan guncellendi.",
            "VERSION_CONFLICT",
            status.HTTP_409_CONFLICT,
        )
    await assert_unique_partner_card(
        session,
        context,
        str(partner.get("company_id")),
        payload.get("person_id") or partner.get("person_id"),
        payload.get("organization_id") or partner.get("organization_id"),
        exclude_id=partner_id,
    )
    allowed_columns = {
        "person_id",
        "organization_id",
        "first_name",
        "last_name",
        "display_name",
        "partner_name",
        "identity_number",
        "identity_tax_number",
        "photo_logo",
        "partner_documents",
        "notes",
    }
    patch = {
        key: value for key, value in payload.items() if key in allowed_columns and value is not None
    }
    if "trade_name" in payload and "partner_name" not in patch:
        patch["partner_name"] = payload["trade_name"]
    if any(field in payload for field in {"first_name", "last_name", "trade_name", "display_name"}):
        patch["display_name"] = payload.get("display_name") or _partner_display_name(
            {**partner, **payload}
        )
    next_profile = _merge_partner_profile(partner.get("partner_profile"), payload)
    if next_profile != (partner.get("partner_profile") or {}):
        patch["partner_profile"] = next_profile
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
        if field in PARTNER_JSON_FIELDS:
            assignments.append(f"{field} = cast(:{field} as jsonb)")
            default_json: list[Any] | dict[str, Any] = [] if field != "partner_profile" else {}
            params[field] = json.dumps(value or default_json, ensure_ascii=False, default=str)
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


async def assert_partner_can_be_hard_deleted(
    session: AsyncSession,
    context: dict[str, Any],
    partner_id: str,
) -> dict[str, Any]:
    partner = await get_partner_by_id(session, context["tenant_id"], partner_id)
    if not partner:
        raise DomainError("Ortak kaydi bulunamadi.", "PARTNER_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    await can_hard_delete_partner_draft(session, partner, tenant_id=context["tenant_id"])
    return partner


async def delete_partner_draft(
    session: AsyncSession,
    context: dict[str, Any],
    partner_id: str,
) -> dict[str, Any]:
    await assert_partner_can_be_hard_deleted(session, context, partner_id)
    await session.execute(
        text(
            """
            delete from public.company_partners
            where tenant_id = :tenant_id
              and id = :partner_id
              and coalesce(is_deleted, false) = false
            """
        ),
        {"tenant_id": context["tenant_id"], "partner_id": partner_id},
    )
    return {"id": partner_id, "hardDeleted": True, "message": "Taslak ortak karti silindi."}


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
