from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.operations.service import table_exists
from app.policies.delete_guards import can_hard_delete_representative_draft
from app.policies.field_control import reject_operation_controlled_patch, strip_system_fields

ACTIVE_CARD_STATUSES = {"active", "aktif"}
DRAFT_CARD_STATUSES = {"draft", "taslak", ""}
PASSIVE_CARD_STATUSES = {"passive", "pasif"}
ACTIVE_AUTHORITY_STATUSES = {"active", "aktif"}
REPRESENTATIVE_PROFILE_FIELDS = {
    "first_name",
    "last_name",
    "full_name",
    "person_or_entity_type",
    "person_id",
    "organization_id",
    "master_record_id",
    "master_entity_kind",
    "trade_name",
    "legal_name",
    "short_name",
    "identity_number",
    "national_id",
    "passport_no",
    "nationality",
    "nationality_country",
    "tax_number",
    "tax_office",
    "mersis_number",
    "registry_number",
    "trade_registry_no",
    "foundation_date",
    "company_type",
    "birth_date",
    "birth_place",
    "gender",
    "occupation",
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
    "is_illiterate",
    "education_schools",
    "foreign_languages",
    "certificates",
    "marital_status",
    "relatives",
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
REPRESENTATIVE_JSON_FIELDS = {"photo_logo", "authority_documents", "representative_profile"}
SUSPENDED_AUTHORITY_STATUSES = {"suspended", "askida", "askıya alma"}


def normalize_status(value: Any) -> str:
    return str(value or "").strip().lower()


def representative_card_status(representative: dict[str, Any] | None) -> str:
    if not representative:
        return ""
    return normalize_status(representative.get("record_status") or representative.get("status"))


def authority_status(authority: dict[str, Any] | None) -> str:
    if not authority:
        return "draft"
    return normalize_status(
        authority.get("authority_record_status")
        or authority.get("authority_status")
        or authority.get("status")
    )


def guard_representative_card_patch(payload: dict[str, Any]) -> None:
    reject_operation_controlled_patch("company_representative", payload)


def reject_operation_controlled_representative_patch(payload: dict[str, Any]) -> None:
    guard_representative_card_patch(payload)


def _representative_display_name(payload: dict[str, Any]) -> str:
    if payload.get("display_name"):
        return str(payload["display_name"])
    if payload.get("full_name"):
        return str(payload["full_name"])
    if payload.get("trade_name"):
        return str(payload["trade_name"])
    full_name = " ".join(
        part for part in [payload.get("first_name"), payload.get("last_name")] if part
    ).strip()
    return full_name or "Temsilci"


def _merge_representative_profile(
    current_profile: Any,
    payload: dict[str, Any],
) -> dict[str, Any]:
    profile = dict(current_profile or {}) if isinstance(current_profile, dict) else {}
    for field in REPRESENTATIVE_PROFILE_FIELDS:
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


def _first_present(*values: Any) -> Any:
    for value in values:
        if value is not None and value != "":
            return value
    return None


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


def _split_person_name(full_name: Any) -> tuple[str | None, str | None]:
    parts = str(full_name or "").strip().split()
    if not parts:
        return None, None
    if len(parts) == 1:
        return parts[0], None
    return " ".join(parts[:-1]), parts[-1]


def _first_contact_value(rows: Any, key: str) -> Any:
    if not isinstance(rows, list):
        return None
    for row in rows:
        if isinstance(row, dict) and row.get(key):
            return row.get(key)
    return None


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


def _normalize_representative_profile(value: Any) -> dict[str, Any]:
    profile = _json_object(value)
    role = _json_object(profile.get("role"))
    role_profile = _json_object(role.get("representative_profile"))
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


async def _get_representative_master_record(
    session: AsyncSession,
    tenant_id: str,
    representative: dict[str, Any],
) -> tuple[str | None, dict[str, Any] | None]:
    profile = _json_object(representative.get("representative_profile"))
    entity_kind_hint = (
        representative.get("master_entity_kind")
        or profile.get("master_entity_kind")
        or representative.get("person_or_entity_type")
        or profile.get("person_or_entity_type")
        or representative.get("person_kind")
    )
    person_id = representative.get("person_id") or profile.get("person_id")
    organization_id = representative.get("organization_id") or profile.get("organization_id")
    master_record_id = representative.get("master_record_id") or profile.get("master_record_id")
    if not person_id and entity_kind_hint == "person":
        person_id = master_record_id
    if not organization_id and entity_kind_hint == "organization":
        organization_id = master_record_id
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


def _enrich_representative_with_master(
    representative: dict[str, Any],
    entity_kind: str | None,
    master: dict[str, Any] | None,
) -> dict[str, Any]:
    enriched = {**representative}
    if master:
        enriched["master"] = master
        enriched["masterRecord"] = master
        enriched["master_entity_kind"] = entity_kind
        enriched["master_record_id"] = master.get("id")
    if entity_kind == "person":
        enriched["person_or_entity_type"] = "person"
        enriched["full_name"] = _first_present(representative.get("full_name"), master.get("full_name") if master else None, representative.get("display_name"))
        fallback_first_name, fallback_last_name = _split_person_name(enriched.get("full_name"))
        enriched["first_name"] = _first_present(representative.get("first_name"), master.get("first_name") if master else None, fallback_first_name)
        enriched["last_name"] = _first_present(representative.get("last_name"), master.get("last_name") if master else None, fallback_last_name)
        enriched["national_id"] = _first_present(master.get("national_id") if master else None, master.get("identity_number") if master else None, representative.get("identity_number"))
    elif entity_kind == "organization":
        enriched["person_or_entity_type"] = "organization"
        enriched["trade_name"] = _first_present(representative.get("trade_name"), master.get("trade_name") if master else None, master.get("legal_name") if master else None, representative.get("display_name"))
        enriched["short_name"] = _first_present(representative.get("short_name"), master.get("short_name") if master else None)
        enriched["tax_number"] = _first_present(master.get("tax_number") if master else None, representative.get("identity_number"))
    for field in REPRESENTATIVE_PROFILE_FIELDS:
        master_value = master.get(field) if master else None
        value = _first_present(representative.get(field), master_value)
        if value is not None:
            enriched[field] = value
    enriched["phone"] = _first_present(
        enriched.get("phone"),
        _first_contact_value(enriched.get("phones"), "phone"),
        master.get("phone") if master else None,
    )
    enriched["email"] = _first_present(
        enriched.get("email"),
        _first_contact_value(enriched.get("emails"), "address"),
        master.get("email") if master else None,
    )
    enriched["display_name"] = _first_present(
        representative.get("display_name"),
        enriched.get("full_name"),
        enriched.get("trade_name"),
        enriched.get("short_name"),
    ) or "Temsilci"
    return enriched


async def get_representative_by_id(
    session: AsyncSession,
    tenant_id: str,
    representative_id: str,
) -> dict[str, Any] | None:
    result = await session.execute(
        text(
            """
            select *
            from public.company_representatives
            where tenant_id = :tenant_id
              and id = :representative_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "representative_id": representative_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        return None
    representative = dict(row)
    profile = _normalize_representative_profile(representative.get("representative_profile"))
    if profile:
        representative["representative_profile"] = profile
    for field in REPRESENTATIVE_PROFILE_FIELDS:
        if field in profile and representative.get(field) in (None, ""):
            representative[field] = profile[field]
    entity_kind, master = await _get_representative_master_record(session, tenant_id, representative)
    if not master:
        profile_master = _json_object(profile.get("master"))
        if profile_master:
            entity_kind = entity_kind or representative.get("person_kind") or representative.get("person_or_entity_type")
            if entity_kind not in {"person", "organization"}:
                entity_kind = "organization" if representative.get("organization_id") else "person"
            master = _flatten_master_record(profile_master, str(entity_kind)) or profile_master
    return _enrich_representative_with_master(representative, entity_kind, master)


async def list_representatives(
    session: AsyncSession,
    context: dict[str, Any],
    query: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    filters = query or {}
    where_company = "and company_id = :company_id" if filters.get("company_id") else ""
    result = await session.execute(
        text(
            f"""
            select *
            from public.company_representatives
            where tenant_id = :tenant_id
              and coalesce(is_deleted, false) = false
              {where_company}
            order by updated_at desc, created_at desc
            limit 200
            """
        ),
        {"tenant_id": context["tenant_id"], "company_id": filters.get("company_id")},
    )
    return [dict(row) for row in result.mappings().all()]


async def find_representative_by_master_for_company(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
    person_id: str | None,
    organization_id: str | None,
    *,
    exclude_id: str | None = None,
) -> dict[str, Any] | None:
    if not person_id and not organization_id:
        return None
    column = "person_id" if person_id else "organization_id"
    value = person_id or organization_id
    exclude = "and id <> :exclude_id" if exclude_id else ""
    result = await session.execute(
        text(
            f"""
            select *
            from public.company_representatives
            where tenant_id = :tenant_id
              and company_id = :company_id
              and {column} = :master_id
              and coalesce(is_deleted, false) = false
              {exclude}
            limit 1
            """
        ),
        {
            "tenant_id": tenant_id,
            "company_id": company_id,
            "master_id": value,
            "exclude_id": exclude_id,
        },
    )
    row = result.mappings().one_or_none()
    return dict(row) if row else None


async def assert_unique_representative_card(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    person_id: str | None,
    organization_id: str | None,
    *,
    exclude_id: str | None = None,
) -> None:
    duplicate = await find_representative_by_master_for_company(
        session,
        context["tenant_id"],
        company_id,
        person_id,
        organization_id,
        exclude_id=exclude_id,
    )
    if duplicate:
        raise DomainError(
            "Bu sirket icin ayni kisi/kurum adina temsilci karti zaten var.",
            "DUPLICATE_REPRESENTATIVE_CARD",
            status.HTTP_409_CONFLICT,
            {"representative_id": duplicate.get("id")},
        )


def assert_representative_belongs_to_company(
    representative: dict[str, Any],
    company_id: str,
) -> None:
    if str(representative.get("company_id")) != company_id:
        raise DomainError(
            "Secilen temsilci bu sirkete bagli degil.",
            "REPRESENTATIVE_COMPANY_MISMATCH",
            status.HTTP_409_CONFLICT,
        )


def assert_representative_record_status(
    representative: dict[str, Any],
    allowed_statuses: set[str],
) -> None:
    current = representative_card_status(representative)
    if current not in allowed_statuses:
        raise DomainError(
            "Temsilci karti bu islem icin uygun durumda degil.",
            "REPRESENTATIVE_STATUS_NOT_ALLOWED",
            status.HTTP_409_CONFLICT,
            {
                "record_status": representative.get("record_status"),
                "allowed": sorted(allowed_statuses),
            },
        )


async def create_representative_card(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
) -> dict[str, Any]:
    payload = strip_system_fields(payload)
    guard_representative_card_patch(payload)
    await assert_unique_representative_card(
        session,
        context,
        str(payload["company_id"]),
        payload.get("person_id"),
        payload.get("organization_id"),
    )
    representative_id = str(uuid4())
    display_name = _representative_display_name(payload)
    full_name = payload.get("full_name") or display_name
    representative_profile = _merge_representative_profile(
        payload.get("representative_profile"), payload
    )
    authority_documents = (
        payload.get("authority_documents") or payload.get("representative_documents") or []
    )
    result = await session.execute(
        text(
            """
            insert into public.company_representatives (
              id, tenant_id, company_id, person_id, organization_id, person_kind,
              source_type, source_id,
              display_name, full_name, phone, email, notes, status, record_status,
              representative_profile, photo_logo, authority_documents, created_at,
              updated_at, version, is_deleted
            )
            values (
              :id, :tenant_id, :company_id, :person_id, :organization_id, :person_kind,
              :source_type, :source_id,
              :display_name, :full_name, :phone, :email, :notes, 'Taslak', 'draft',
              cast(:representative_profile as jsonb), cast(:photo_logo as jsonb),
              cast(:authority_documents as jsonb), now(), now(), 1, false
            )
            returning *
            """
        ),
        {
            "id": representative_id,
            "tenant_id": context["tenant_id"],
            "company_id": payload["company_id"],
            "person_id": payload.get("person_id"),
            "organization_id": payload.get("organization_id"),
            "person_kind": payload.get("person_kind")
            or payload.get("person_or_entity_type")
            or "person",
            "source_type": payload.get("source_type"),
            "source_id": payload.get("source_id"),
            "display_name": display_name,
            "full_name": full_name,
            "phone": payload.get("phone"),
            "email": payload.get("email"),
            "notes": payload.get("notes"),
            "representative_profile": json.dumps(
                representative_profile, ensure_ascii=False, default=str
            ),
            "photo_logo": json.dumps(
                payload.get("photo_logo") or [], ensure_ascii=False, default=str
            ),
            "authority_documents": json.dumps(authority_documents, ensure_ascii=False, default=str),
        },
    )
    return dict(result.mappings().one())


async def create_representative_draft(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
) -> dict[str, Any]:
    return await create_representative_card(session, context, payload)


async def update_representative_card(
    session: AsyncSession,
    context: dict[str, Any],
    representative_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    payload = strip_system_fields(payload)
    guard_representative_card_patch(payload)
    representative = await get_representative_by_id(
        session, context["tenant_id"], representative_id
    )
    if not representative:
        raise DomainError("Temsilci kaydi bulunamadi.", "REPRESENTATIVE_NOT_FOUND", 404)
    base_version = payload.get("base_version")
    if base_version is not None and int(representative.get("version") or 0) != int(base_version):
        raise DomainError(
            "Temsilci kaydi baska bir islem tarafindan guncellendi.",
            "VERSION_CONFLICT",
            status.HTTP_409_CONFLICT,
        )
    allowed = {
        key: payload.get(key)
        for key in [
            "display_name",
            "full_name",
            "phone",
            "email",
            "notes",
            "photo_logo",
            "authority_documents",
            "representative_profile",
        ]
        if key in payload
    }
    if "representative_documents" in payload and "authority_documents" not in allowed:
        allowed["authority_documents"] = payload["representative_documents"]
    if any(field in payload for field in {"first_name", "last_name", "trade_name", "display_name"}):
        allowed["display_name"] = payload.get("display_name") or _representative_display_name(
            {**representative, **payload}
        )
    if any(field in payload for field in {"first_name", "last_name", "trade_name", "full_name"}):
        allowed["full_name"] = (
            payload.get("full_name")
            or allowed.get("display_name")
            or _representative_display_name({**representative, **payload})
        )
    next_profile = _merge_representative_profile(
        representative.get("representative_profile"), payload
    )
    if next_profile != (representative.get("representative_profile") or {}):
        allowed["representative_profile"] = next_profile
    if not allowed:
        raise DomainError("Guncellenecek kart alani bulunamadi.", "NO_CHANGED_FIELDS", 400)
    assignments: list[str] = []
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "representative_id": representative_id,
    }
    for key, value in allowed.items():
        if key in REPRESENTATIVE_JSON_FIELDS:
            assignments.append(f"{key} = cast(:{key} as jsonb)")
            default_json: list[Any] | dict[str, Any] = [] if key != "representative_profile" else {}
            params[key] = json.dumps(value or default_json, ensure_ascii=False, default=str)
        else:
            assignments.append(f"{key} = :{key}")
            params[key] = value
    result = await session.execute(
        text(
            f"""
            update public.company_representatives
            set {", ".join(assignments)},
                updated_at = now(),
                version = coalesce(version, 0) + 1
            where tenant_id = :tenant_id
              and id = :representative_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        params,
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Temsilci kaydi bulunamadi.", "REPRESENTATIVE_NOT_FOUND", 404)
    return dict(row)


async def assert_representative_can_be_hard_deleted(
    session: AsyncSession,
    context: dict[str, Any],
    representative_id: str,
) -> dict[str, Any]:
    representative = await get_representative_by_id(
        session, context["tenant_id"], representative_id
    )
    if not representative:
        raise DomainError("Temsilci kaydi bulunamadi.", "REPRESENTATIVE_NOT_FOUND", 404)
    await can_hard_delete_representative_draft(
        session,
        representative,
        tenant_id=context["tenant_id"],
    )
    return representative


async def delete_representative_draft(
    session: AsyncSession,
    context: dict[str, Any],
    representative_id: str,
) -> dict[str, Any]:
    await assert_representative_can_be_hard_deleted(session, context, representative_id)
    await session.execute(
        text(
            """
            delete from public.company_representatives
            where tenant_id = :tenant_id
              and id = :representative_id
              and coalesce(is_deleted, false) = false
            """
        ),
        {"tenant_id": context["tenant_id"], "representative_id": representative_id},
    )
    return {
        "id": representative_id,
        "hardDeleted": True,
        "message": "Temsilci karti taslagi kalici olarak silindi.",
    }


def _scope_from_row(row: dict[str, Any]) -> dict[str, Any]:
    raw_scope = row.get("scope")
    scope_value: dict[str, Any] = raw_scope if isinstance(raw_scope, dict) else {}
    scope_type = row.get("scope_type") or scope_value.get("scope_type") or "company_wide"
    return {
        "scope_type": scope_type,
        "branch_id": row.get("branch_id") or scope_value.get("branch_id"),
        "organization_unit_id": row.get("organization_unit_id")
        or scope_value.get("organization_unit_id"),
        "facility_id": row.get("facility_id") or scope_value.get("facility_id"),
        "scope_label": row.get("scope_label") or scope_value.get("scope_label"),
        "scope_notes": row.get("scope_notes") or scope_value.get("scope_notes"),
    }


def current_authority_from_row(row: dict[str, Any]) -> dict[str, Any]:
    scope = _scope_from_row(row)
    authority_types = row.get("authority_types") or []
    if not isinstance(authority_types, list):
        authority_types = []
    return {
        **row,
        "authority_status": row.get("authority_status") or row.get("authority_record_status"),
        "authority_record_status": row.get("authority_record_status")
        or row.get("authority_status"),
        "authority_types": authority_types,
        "primary_authority_type": authority_types[0] if authority_types else None,
        **scope,
        "scope": scope,
        "warnings": row.get("warnings") or [],
    }


async def get_current_authority(
    session: AsyncSession,
    context: dict[str, Any],
    representative_id: str,
) -> dict[str, Any] | None:
    if await table_exists(session, "public.v_current_representative_authorities"):
        result = await session.execute(
            text(
                """
                select *
                from public.v_current_representative_authorities
                where tenant_id = :tenant_id
                  and representative_id = :representative_id
                limit 1
                """
            ),
            {"tenant_id": context["tenant_id"], "representative_id": representative_id},
        )
        row = result.mappings().one_or_none()
        if row:
            return current_authority_from_row(dict(row))

    result = await session.execute(
        text(
            """
            select *
            from public.company_representative_authority_transactions
            where tenant_id = :tenant_id
              and representative_id = :representative_id
              and coalesce(is_deleted, false) = false
              and approval_status = 'approved'
              and workflow_status = 'approved'
            order by effective_date desc, created_at desc
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "representative_id": representative_id},
    )
    row = result.mappings().one_or_none()
    return current_authority_from_row(dict(row)) if row else None


async def list_authorities_for_branch(
    session: AsyncSession,
    context: dict[str, Any],
    branch_id: str,
    *,
    include_company_wide: bool = False,
) -> list[dict[str, Any]]:
    if await table_exists(session, "public.v_current_representative_authorities"):
        company_clause = "or scope_type = 'company_wide'" if include_company_wide else ""
        result = await session.execute(
            text(
                f"""
                select *
                from public.v_current_representative_authorities
                where tenant_id = :tenant_id
                  and (branch_id = :branch_id {company_clause})
                order by display_name asc
                """
            ),
            {"tenant_id": context["tenant_id"], "branch_id": branch_id},
        )
        return [current_authority_from_row(dict(row)) for row in result.mappings().all()]
    return []


async def list_authorities_for_company(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    filters: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    if not await table_exists(session, "public.v_current_representative_authorities"):
        return []
    scope_filter = ""
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "company_id": company_id}
    for key in ["branch_id", "organization_unit_id", "facility_id", "scope_type"]:
        value = (filters or {}).get(key)
        if value:
            scope_filter += f" and {key} = :{key}"
            params[key] = value
    result = await session.execute(
        text(
            f"""
            select *
            from public.v_current_representative_authorities
            where tenant_id = :tenant_id
              and company_id = :company_id
              {scope_filter}
            order by display_name asc
            """
        ),
        params,
    )
    return [current_authority_from_row(dict(row)) for row in result.mappings().all()]
