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
    "foundation_date",
    "company_type",
    "mersis_number",
    "trade_registry_no",
    "registry_number",
    "tax_number",
    "tax_office",
    "e_invoice_status",
    "national_id",
    "identity_number",
    "passport_no",
    "nationality",
    "nationality_country",
    "birth_date",
    "birth_place",
    "gender",
    "occupation",
    "is_illiterate",
    "education_schools",
    "foreign_languages",
    "certificates",
    "marital_status",
    "relatives",
    "emergency_contact_first_name",
    "emergency_contact_last_name",
    "emergency_contact_relationship",
    "emergency_contact_phone",
    "phone",
    "mobile_phone",
    "work_phone",
    "email",
    "phones",
    "emails",
    "address",
    "city",
    "district",
    "country",
    "contact_points",
    "beneficiary_full_name",
    "beneficiary_address",
    "beneficiary_iban",
    "beneficiary_account_no",
    "beneficiary_iban_or_account_no",
    "beneficiary_bank_code",
    "beneficiary_swift_bic",
    "beneficiary_bank_name",
    "beneficiary_bank_address",
    "beneficiary_currency",
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


def _json_object(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def _legacy_contact_rows(profile: dict[str, Any], value_key: str, *keys: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    seen: set[str] = set()
    for index, key in enumerate(keys, start=1):
        value = profile.get(key)
        if value is None or value == "":
            continue
        text_value = str(value).strip()
        if not text_value or text_value in seen:
            continue
        seen.add(text_value)
        rows.append({"label": "Birincil" if index == 1 else "Alternatif", value_key: text_value})
    return rows


def _legacy_bank_rows(profile: dict[str, Any]) -> list[dict[str, Any]]:
    iban = profile.get("beneficiary_iban") or profile.get("beneficiary_iban_or_account_no")
    account_number = profile.get("beneficiary_account_no")
    if not iban and not account_number:
        return []
    return [{
        "id": "legacy-beneficiary-account",
        "beneficiary_name": profile.get("beneficiary_full_name") or "",
        "is_same_as_master_name": not bool(profile.get("beneficiary_full_name")),
        "iban": iban or "",
        "account_number": account_number or "",
        "bank_code": profile.get("beneficiary_bank_code") or "",
        "swift_bic": profile.get("beneficiary_swift_bic") or "",
        "bank_name": profile.get("beneficiary_bank_name") or "",
        "bank_address": profile.get("beneficiary_bank_address") or profile.get("beneficiary_address") or "",
        "account_currency": profile.get("beneficiary_currency") or "TRY",
        "preferred_currency": profile.get("beneficiary_currency") or "TRY",
        "verification_status": "unverified",
        "is_default": True,
        "status": "active",
    }]


def _normalize_partner_profile(value: Any) -> dict[str, Any]:
    profile = _json_object(value)
    role = _json_object(profile.get("role"))
    role_profile = _json_object(role.get("partner_profile"))
    profile_master = _json_object(profile.get("master"))
    normalized = {**role_profile, **profile_master, **role, **profile}
    if not normalized.get("phones"):
        normalized["phones"] = _legacy_contact_rows(normalized, "phone", "phone", "mobile_phone", "work_phone", "phone_1", "phone_2")
    if not normalized.get("emails"):
        normalized["emails"] = _legacy_contact_rows(normalized, "address", "email", "email_1", "email_2")
    if not normalized.get("entity_bank_accounts"):
        normalized["entity_bank_accounts"] = _legacy_bank_rows(normalized)
    return normalized


def _flatten_master_record(row: dict[str, Any] | None, entity_kind: str) -> dict[str, Any] | None:
    if not row:
        return None
    metadata = _json_object(row.get("metadata_json"))
    data = {**metadata, **row}
    data["metadata_json"] = metadata
    if entity_kind == "person":
        if data.get("identity_number") and not data.get("national_id"):
            data["national_id"] = data.get("identity_number")
        if data.get("country") and not data.get("nationality_country"):
            data["nationality_country"] = data.get("country")
    else:
        if data.get("registry_number") and not data.get("trade_registry_no"):
            data["trade_registry_no"] = data.get("registry_number")
        if data.get("trade_name") and not data.get("legal_name"):
            data["legal_name"] = data.get("trade_name")
    return data


async def _get_partner_master_record(
    session: AsyncSession,
    tenant_id: str,
    partner: dict[str, Any],
) -> tuple[str | None, dict[str, Any] | None]:
    person_id = partner.get("person_id")
    organization_id = partner.get("organization_id")
    if person_id and await table_exists(session, "public.master_persons"):
        result = await session.execute(
            text(
                """
                select *
                from public.master_persons
                where tenant_id = :tenant_id
                  and id = :entity_id
                  and coalesce(is_deleted, false) = false
                limit 1
                """
            ),
            {"tenant_id": tenant_id, "entity_id": person_id},
        )
        row = result.mappings().one_or_none()
        return "person", _flatten_master_record(dict(row) if row else None, "person")
    if organization_id and await table_exists(session, "public.master_organizations"):
        result = await session.execute(
            text(
                """
                select *
                from public.master_organizations
                where tenant_id = :tenant_id
                  and id = :entity_id
                  and coalesce(is_deleted, false) = false
                limit 1
                """
            ),
            {"tenant_id": tenant_id, "entity_id": organization_id},
        )
        row = result.mappings().one_or_none()
        return "organization", _flatten_master_record(dict(row) if row else None, "organization")
    return None, None


def _first_present(*values: Any) -> Any:
    for value in values:
        if value is not None and value != "":
            return value
    return None


def _enrich_partner_with_master(partner: dict[str, Any], entity_kind: str | None, master: dict[str, Any] | None) -> dict[str, Any]:
    if not master:
        return partner
    enriched = {**partner}
    enriched["master"] = master
    enriched["masterRecord"] = master
    enriched["master_entity_kind"] = entity_kind
    enriched["master_record_id"] = master.get("id")
    if entity_kind == "person":
        enriched["first_name"] = _first_present(partner.get("first_name"), master.get("first_name"))
        enriched["last_name"] = _first_present(partner.get("last_name"), master.get("last_name"))
        enriched["full_name"] = _first_present(master.get("full_name"), partner.get("display_name"), partner.get("partner_name"))
        enriched["national_id"] = _first_present(master.get("national_id"), master.get("identity_number"), partner.get("identity_number"))
    else:
        enriched["trade_name"] = _first_present(partner.get("trade_name"), master.get("trade_name"), master.get("legal_name"), partner.get("partner_name"))
        enriched["short_name"] = _first_present(partner.get("short_name"), master.get("short_name"))
        enriched["tax_number"] = _first_present(master.get("tax_number"), partner.get("identity_tax_number"), partner.get("identity_number"))
    for field in PARTNER_PROFILE_FIELDS:
        value = _first_present(partner.get(field), master.get(field))
        if value is not None:
            enriched[field] = value
    return enriched


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
    if not row:
        return None
    partner = dict(row)
    profile = _normalize_partner_profile(partner.get("partner_profile"))
    if profile:
        partner["partner_profile"] = profile
    entity_kind, master = await _get_partner_master_record(session, tenant_id, partner)
    if not master:
        profile_master = _json_object(profile.get("master"))
        if profile_master:
            fallback_kind = str(profile.get("master_entity_kind") or partner.get("owner_kind") or partner.get("partner_type") or "person")
            fallback_kind = "organization" if fallback_kind in {"organization", "company"} else "person"
            entity_kind = fallback_kind
            master = _flatten_master_record(profile_master, fallback_kind)
    for field in PARTNER_PROFILE_FIELDS:
        if field in profile and (partner.get(field) is None or partner.get(field) == ""):
            partner[field] = profile[field]
    return _enrich_partner_with_master(partner, entity_kind, master)


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
    return {
        "id": partner_id,
        "hardDeleted": True,
        "message": "Ortak karti taslagi kalici olarak silindi.",
    }


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
