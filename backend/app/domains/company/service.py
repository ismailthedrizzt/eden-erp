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
from app.policies.delete_guards import can_hard_delete_company_draft
from app.policies.field_control import reject_operation_controlled_patch, strip_system_fields

COMPANY_ACTIVE_VALUES = {"active", "aktif", "opened", "open"}
COMPANY_BLOCKED_VALUES = {
    "draft",
    "taslak",
    "liquidation",
    "tasfiye",
    "deregistered",
    "terkin",
    "passive",
    "closed",
}

OFFICIAL_COMPANY_FIELDS = {
    "trade_name",
    "short_name",
    "tax_office",
    "mersis_number",
    "trade_registry_number",
    "trade_registry_office",
    "electronic_notification_address",
    "e_invoice_taxpayer",
    "e_archive_taxpayer",
    "e_waybill_taxpayer",
    "sgk_workplace_registry_no",
    "sgk_province",
    "sgk_branch",
    "country",
    "city",
    "district",
    "address",
    "postal_code",
    "nace_codes",
    "risk_class",
    "activity_subject",
}

JSON_COMPANY_FIELDS = {"nace_codes"}
COMPANY_CARD_FIELDS = {
    "phone",
    "email",
    "website",
    "logo_url",
    "hero_images",
    "hero_documents",
    "default_currency",
    "default_language",
    "time_zone",
    "fiscal_year_start",
}
COMPANY_DRAFT_CARD_FIELDS = {
    "trade_name",
    "short_name",
    "tax_number",
    "tax_office",
    "company_type",
    "country",
    "city",
    "district",
    "address",
    "postal_code",
    "foundation_date",
}
JSON_COMPANY_CARD_FIELDS = {"hero_images", "hero_documents"}
COMPANY_CARD_METADATA_FIELDS = {"contact_points", "notes", "metadata_json"}


async def get_company_by_id(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
) -> dict[str, Any] | None:
    result = await session.execute(
        text(
            """
            select *
            from public.companies
            where tenant_id = :tenant_id
              and id = :company_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "company_id": company_id},
    )
    row = result.mappings().one_or_none()
    return dict(row) if row else None


def is_company_draft(company: dict[str, Any] | None) -> bool:
    return get_company_lifecycle(company) in {"draft", "taslak", ""}


def reject_operation_controlled_company_patch(
    payload: dict[str, Any],
    current_company: dict[str, Any] | None,
) -> None:
    reject_operation_controlled_patch("company", payload, current_company)


def normalize_company_card_patch(
    request: dict[str, Any],
    current_company: dict[str, Any],
) -> dict[str, Any]:
    request = strip_system_fields(request)
    reject_operation_controlled_company_patch(request, current_company)
    allowed_fields = set(COMPANY_CARD_FIELDS)
    if is_company_draft(current_company):
        allowed_fields.update(COMPANY_DRAFT_CARD_FIELDS)
    return {
        field: value
        for field, value in request.items()
        if field in allowed_fields and value is not None
    }


async def create_company_draft(
    session: AsyncSession,
    context: dict[str, Any],
    request: dict[str, Any],
) -> dict[str, Any]:
    company_id = str(uuid4())
    values = {
        "id": company_id,
        "tenant_id": context["tenant_id"],
        "organization_id": request.get("organization_id"),
        "trade_name": request.get("trade_name"),
        "short_name": request.get("short_name"),
        "tax_number": request.get("tax_number"),
        "tax_office": request.get("tax_office"),
        "company_type": request.get("company_type"),
        "country": request.get("country") or "Turkiye",
        "city": request.get("city"),
        "district": request.get("district"),
        "address": request.get("address"),
        "postal_code": request.get("postal_code"),
        "phone": request.get("phone"),
        "email": request.get("email"),
        "website": request.get("website"),
        "logo_url": request.get("logo_url"),
        "hero_images": json.dumps(
            request.get("hero_images") or [], ensure_ascii=False, default=str
        ),
        "hero_documents": json.dumps(
            request.get("hero_documents") or [], ensure_ascii=False, default=str
        ),
        "created_by": context.get("user_id"),
        "updated_by": context.get("user_id"),
    }
    if not values["trade_name"]:
        raise DomainError("Taslak sirket icin ticari unvan zorunludur.", "TRADE_NAME_REQUIRED", 400)

    result = await session.execute(
        text(
            """
            insert into public.companies (
              id, tenant_id, organization_id, trade_name, short_name, tax_number,
              tax_office, company_type, country, city, district, address, postal_code,
              phone, email, website, logo_url, hero_images, hero_documents,
              record_status, company_status, is_deleted, created_by, updated_by,
              created_at, updated_at, version
            )
            values (
              :id, :tenant_id, :organization_id, :trade_name, :short_name, :tax_number,
              :tax_office, :company_type, :country, :city, :district, :address,
              :postal_code, :phone, :email, :website, :logo_url,
              cast(:hero_images as jsonb), cast(:hero_documents as jsonb),
              'draft', 'draft', false, :created_by, :updated_by, now(), now(), 1
            )
            returning *
            """
        ),
        values,
    )
    return dict(result.mappings().one())


def _company_card_metadata(
    current_company: dict[str, Any],
    request: dict[str, Any],
    user_id: str | None,
) -> dict[str, Any] | None:
    metadata_payload = {
        field: request[field]
        for field in COMPANY_CARD_METADATA_FIELDS
        if field in request and request[field] is not None
    }
    if not metadata_payload:
        return None

    field_history = dict(current_company.get("field_history") or {})
    current_metadata = field_history.get("card_metadata")
    if not isinstance(current_metadata, dict):
        current_metadata = {}
    next_metadata = {
        **current_metadata,
        **metadata_payload,
        "updated_at": datetime.now(UTC).isoformat(),
        "updated_by": user_id,
        "source": "fastapi_card_crud",
    }
    if current_metadata == next_metadata:
        return None
    field_history["card_metadata"] = next_metadata
    return field_history


async def hydrate_company_detail_for_card_response(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
) -> dict[str, Any]:
    company = await get_company_by_id(session, context["tenant_id"], company_id)
    if not company:
        raise DomainError(
            "Sirket kaydi bulunamadi.", "COMPANY_NOT_FOUND", status.HTTP_404_NOT_FOUND
        )
    return company


async def update_company_card(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    request: dict[str, Any],
) -> dict[str, Any]:
    company = await get_company_by_id(session, context["tenant_id"], company_id)
    if not company:
        raise DomainError(
            "Sirket kaydi bulunamadi.", "COMPANY_NOT_FOUND", status.HTTP_404_NOT_FOUND
        )

    detect_company_version_conflict(
        company,
        request.get("base_version"),
        request.get("base_updated_at"),
    )
    patch = normalize_company_card_patch(request, company)
    changed_patch = {field: value for field, value in patch.items() if company.get(field) != value}
    field_history = _company_card_metadata(company, request, context.get("user_id"))

    if not changed_patch and field_history is None:
        raise DomainError(
            "Guncellenecek sirket kart alani bulunamadi.",
            "NO_CHANGED_FIELDS",
            status.HTTP_400_BAD_REQUEST,
        )

    assignments: list[str] = []
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "company_id": company_id,
        "updated_by": context.get("user_id"),
    }
    for field, value in changed_patch.items():
        if field in JSON_COMPANY_CARD_FIELDS:
            assignments.append(f"{field} = cast(:{field} as jsonb)")
            params[field] = json.dumps(value or [], ensure_ascii=False, default=str)
        else:
            assignments.append(f"{field} = :{field}")
            params[field] = value
    if field_history is not None:
        assignments.append("field_history = cast(:field_history as jsonb)")
        params["field_history"] = json.dumps(field_history, ensure_ascii=False, default=str)
    assignments.extend(
        [
            "updated_at = now()",
            "updated_by = :updated_by",
            "version = coalesce(version, 0) + 1",
        ]
    )
    result = await session.execute(
        text(
            f"""
            update public.companies
            set {", ".join(assignments)}
            where tenant_id = :tenant_id
              and id = :company_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        params,
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError(
            "Sirket kaydi guncellenemedi.", "COMPANY_UPDATE_FAILED", status.HTTP_409_CONFLICT
        )
    return dict(row)


async def assert_company_can_be_hard_deleted(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
) -> dict[str, Any]:
    company = await get_company_by_id(session, context["tenant_id"], company_id)
    if not company:
        raise DomainError(
            "Sirket kaydi bulunamadi.", "COMPANY_NOT_FOUND", status.HTTP_404_NOT_FOUND
        )
    await can_hard_delete_company_draft(session, company, tenant_id=context["tenant_id"])
    return company


async def delete_company_draft(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
) -> dict[str, Any]:
    await assert_company_can_be_hard_deleted(session, context, company_id)
    await session.execute(
        text(
            """
            delete from public.companies
            where tenant_id = :tenant_id
              and id = :company_id
              and coalesce(is_deleted, false) = false
            """
        ),
        {"tenant_id": context["tenant_id"], "company_id": company_id},
    )
    return {
        "id": company_id,
        "hardDeleted": True,
        "message": "Taslak sirket karti silindi.",
    }


def get_company_lifecycle(company: dict[str, Any] | None) -> str:
    if not company:
        return "unknown"
    if company.get("is_deleted") is True:
        return "deregistered"
    return str(company.get("record_status") or company.get("company_status") or "draft").lower()


def assert_company_active(company: dict[str, Any] | None) -> None:
    lifecycle = get_company_lifecycle(company)
    if not company:
        raise DomainError(
            "Şirket kaydı bulunamadı.",
            "COMPANY_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
        )
    if lifecycle not in COMPANY_ACTIVE_VALUES:
        raise DomainError(
            message="Şube işlemi yalnızca aktif şirketlerde başlatılabilir.",
            code="COMPANY_NOT_ACTIVE",
            status_code=status.HTTP_409_CONFLICT,
            details={
                "record_status": company.get("record_status"),
                "company_status": company.get("company_status"),
            },
        )


def assert_company_active_for_official_change(
    company: dict[str, Any] | None,
    change_type: str,
) -> None:
    lifecycle = get_company_lifecycle(company)
    if not company:
        raise DomainError(
            "Şirket kaydı bulunamadı.",
            "COMPANY_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
        )
    if lifecycle == "draft":
        raise DomainError(
            message=(
                "Taslak şirketlerde bu alanları taslak düzenleme ekranından güncelleyebilirsiniz."
            ),
            code="COMPANY_DRAFT_OFFICIAL_CHANGE_NOT_REQUIRED",
            status_code=status.HTTP_409_CONFLICT,
            details={"change_type": change_type},
        )
    if lifecycle in {"liquidation", "tasfiye"}:
        raise DomainError(
            message="Tasfiye sürecindeki şirketlerde bu resmi değişiklik başlatılamaz.",
            code="COMPANY_IN_LIQUIDATION",
            status_code=status.HTTP_409_CONFLICT,
            details={"change_type": change_type},
        )
    if lifecycle in {"deregistered", "terkin"}:
        raise DomainError(
            message="Terkin edilmiş şirketlerde resmi değişiklik başlatılamaz.",
            code="COMPANY_DEREGISTERED",
            status_code=status.HTTP_409_CONFLICT,
            details={"change_type": change_type},
        )
    if lifecycle not in COMPANY_ACTIVE_VALUES:
        raise DomainError(
            message="Resmi değişiklik yalnızca aktif şirketlerde başlatılabilir.",
            code="COMPANY_NOT_ACTIVE",
            status_code=status.HTTP_409_CONFLICT,
            details={
                "record_status": company.get("record_status"),
                "company_status": company.get("company_status"),
            },
        )


def assert_company_not_deregistered(company: dict[str, Any] | None) -> None:
    if get_company_lifecycle(company) == "deregistered":
        raise DomainError(
            message="Terkin edilmiş şirketlerde resmi işlem başlatılamaz.",
            code="COMPANY_DEREGISTERED",
            status_code=status.HTTP_409_CONFLICT,
        )


def assert_company_writable_scope(_context: dict[str, Any], _company_id: str) -> None:
    # Production JWT and scope claims will replace this migration-stage header guard.
    return None


async def _get_related_row(
    session: AsyncSession,
    table_name: str,
    tenant_id: str,
    company_id: str,
) -> dict[str, Any] | None:
    if not await table_exists(session, f"public.{table_name}"):
        return None
    result = await session.execute(
        text(
            f"""
            select *
            from public.{table_name}
            where tenant_id = :tenant_id
              and company_id = :company_id
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "company_id": company_id},
    )
    row = result.mappings().one_or_none()
    return dict(row) if row else None


async def get_company_context(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
) -> dict[str, Any]:
    company = await get_company_by_id(session, tenant_id, company_id)
    return {
        "company": company,
        "public_tax": await _get_related_row(session, "company_public_tax", tenant_id, company_id),
        "public_sgk": await _get_related_row(session, "company_public_sgk", tenant_id, company_id),
        "public_registry": await _get_related_row(
            session, "company_public_registry", tenant_id, company_id
        ),
        "public_channels": await _get_related_row(
            session, "company_public_channels", tenant_id, company_id
        ),
    }


def detect_company_version_conflict(
    company: dict[str, Any],
    base_version: int | None,
    base_updated_at: str | None,
) -> None:
    if base_version is not None and int(company.get("version") or 0) != int(base_version):
        raise DomainError(
            "Şirket kaydı siz görüntüledikten sonra güncellenmiş. Lütfen sayfayı yenileyin.",
            "VERSION_CONFLICT",
            status.HTTP_409_CONFLICT,
        )
    if base_updated_at:
        current = company.get("updated_at")
        current_value = (
            current.isoformat()
            if current is not None and hasattr(current, "isoformat")
            else str(current or "")
        )
        if current_value and current_value != base_updated_at:
            raise DomainError(
                "Şirket kaydı siz görüntüledikten sonra güncellenmiş. Lütfen sayfayı yenileyin.",
                "VERSION_CONFLICT",
                status.HTTP_409_CONFLICT,
            )


def _append_field_history(
    company: dict[str, Any],
    patch: dict[str, Any],
    user_id: str | None,
) -> dict[str, Any]:
    history = dict(company.get("field_history") or {})
    changed_at = datetime.now(UTC).isoformat()
    for field, new_value in patch.items():
        old_value = company.get(field)
        entries = history.get(field)
        if not isinstance(entries, list):
            entries = []
        entries.append(
            {
                "old_value": old_value,
                "new_value": new_value,
                "changed_at": changed_at,
                "changed_by": user_id,
                "source": "fastapi_official_change",
            }
        )
        history[field] = entries
    return history


def _changed_fields(current: dict[str, Any], patch: dict[str, Any]) -> list[str]:
    return [field for field, value in patch.items() if current.get(field) != value]


async def update_company_official_fields(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    patch: dict[str, Any],
    base_version: int | None = None,
    base_updated_at: str | None = None,
) -> dict[str, Any]:
    company = await get_company_by_id(session, context["tenant_id"], company_id)
    if not company:
        raise DomainError(
            "Şirket kaydı bulunamadı.",
            "COMPANY_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
        )
    detect_company_version_conflict(company, base_version, base_updated_at)

    invalid_fields = set(patch) - OFFICIAL_COMPANY_FIELDS
    if invalid_fields:
        raise DomainError(
            "Bu işlem desteklenmeyen resmi alanlar içeriyor.",
            "UNSUPPORTED_OFFICIAL_FIELD",
            status.HTTP_400_BAD_REQUEST,
            {"fields": sorted(invalid_fields)},
        )

    clean_patch = {key: value for key, value in patch.items() if key in OFFICIAL_COMPANY_FIELDS}
    changed_fields = _changed_fields(company, clean_patch)
    if not changed_fields:
        raise DomainError(
            "Güncellenecek resmi alan bulunamadı.",
            "NO_CHANGED_FIELDS",
            status.HTTP_400_BAD_REQUEST,
        )

    changed_patch = {field: clean_patch[field] for field in changed_fields}
    field_history = _append_field_history(company, changed_patch, context.get("user_id"))
    assignments: list[str] = []
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "company_id": company_id,
        "updated_by": context.get("user_id"),
        "field_history": json.dumps(field_history, ensure_ascii=False, default=str),
    }
    for field, value in changed_patch.items():
        if field in JSON_COMPANY_FIELDS:
            assignments.append(f"{field} = cast(:{field} as jsonb)")
            params[field] = json.dumps(value or [], ensure_ascii=False, default=str)
        else:
            assignments.append(f"{field} = :{field}")
            params[field] = value
    assignments.extend(
        [
            "field_history = cast(:field_history as jsonb)",
            "updated_at = now()",
            "updated_by = :updated_by",
            "version = coalesce(version, 0) + 1",
        ]
    )
    result = await session.execute(
        text(
            f"""
            update public.companies
            set {", ".join(assignments)}
            where tenant_id = :tenant_id
              and id = :company_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        params,
    )
    updated = result.mappings().one_or_none()
    if not updated:
        raise DomainError(
            "Şirket kaydı güncellenemedi.",
            "COMPANY_UPDATE_FAILED",
            status.HTTP_409_CONFLICT,
        )
    return {
        "company": dict(updated),
        "previous_company": company,
        "changed_fields": changed_fields,
        "patch": changed_patch,
    }


async def _sync_public_row(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    *,
    table_name: str,
    patch: dict[str, Any],
) -> tuple[dict[str, Any] | None, list[str]]:
    if not patch:
        return None, []
    if not await table_exists(session, f"public.{table_name}"):
        return None, [
            f"İlgili kamu kayıt alanı henüz hazır olmadığı için {table_name} eşitlemesi atlandı."
        ]

    columns = ["tenant_id", "company_id", *patch.keys(), "history"]
    values = [
        ":tenant_id",
        ":company_id",
        *[f":{field}" for field in patch],
        "cast(:history as jsonb)",
    ]
    update_set = [f"{field} = excluded.{field}" for field in patch]
    update_set.extend(
        [
            "tenant_id = coalesce(excluded.tenant_id, public." + table_name + ".tenant_id)",
            "updated_at = now()",
        ]
    )
    update_set.append(
        "history = coalesce(public."
        + table_name
        + ".history, '[]'::jsonb) || jsonb_build_array(cast(:history_entry as jsonb))"
    )
    history_entry = {
        "source": "fastapi_official_change",
        "operation_id": context.get("operation_id"),
        "changed_by": context.get("user_id"),
        "changed_at": datetime.now(UTC).isoformat(),
        "patch": patch,
    }
    params = {
        "tenant_id": context["tenant_id"],
        "company_id": company_id,
        "history": json.dumps([history_entry], ensure_ascii=False, default=str),
        "history_entry": json.dumps(history_entry, ensure_ascii=False, default=str),
        **patch,
    }
    result = await session.execute(
        text(
            f"""
            insert into public.{table_name} ({", ".join(columns)})
            values ({", ".join(values)})
            on conflict (company_id) do update
            set {", ".join(update_set)}
            returning *
            """
        ),
        params,
    )
    row = result.mappings().one_or_none()
    return (dict(row) if row else None), []


async def sync_public_tax_row(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    patch: dict[str, Any],
) -> tuple[dict[str, Any] | None, list[str]]:
    mapped: dict[str, Any] = {}
    if "tax_office" in patch:
        mapped["tax_office"] = patch["tax_office"]
    if "e_invoice_taxpayer" in patch:
        mapped["e_invoice_taxpayer"] = patch["e_invoice_taxpayer"]
    if "e_archive_taxpayer" in patch:
        mapped["e_archive_taxpayer"] = patch["e_archive_taxpayer"]
    if "e_waybill_taxpayer" in patch:
        mapped["e_waybill_enabled"] = patch["e_waybill_taxpayer"]
    return await _sync_public_row(
        session,
        context,
        company_id,
        table_name="company_public_tax",
        patch=mapped,
    )


async def sync_public_sgk_row(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    patch: dict[str, Any],
) -> tuple[dict[str, Any] | None, list[str]]:
    mapped: dict[str, Any] = {}
    if "sgk_workplace_registry_no" in patch:
        mapped["workplace_registry_no"] = patch["sgk_workplace_registry_no"]
    if "sgk_province" in patch:
        mapped["province"] = patch["sgk_province"]
    if "sgk_branch" in patch:
        mapped["branch"] = patch["sgk_branch"]
    if "risk_class" in patch:
        mapped["risk_class"] = patch["risk_class"]
    if "nace_code" in patch:
        mapped["nace_code"] = patch["nace_code"]
    return await _sync_public_row(
        session,
        context,
        company_id,
        table_name="company_public_sgk",
        patch=mapped,
    )


async def sync_public_registry_row(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    patch: dict[str, Any],
) -> tuple[dict[str, Any] | None, list[str]]:
    mapped: dict[str, Any] = {}
    if "mersis_number" in patch:
        mapped["mersis_number"] = patch["mersis_number"]
    if "trade_registry_number" in patch:
        mapped["trade_registry_no"] = patch["trade_registry_number"]
    if "trade_registry_office" in patch:
        mapped["registry_office"] = patch["trade_registry_office"]
    return await _sync_public_row(
        session,
        context,
        company_id,
        table_name="company_public_registry",
        patch=mapped,
    )


async def sync_public_channels_row(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    patch: dict[str, Any],
) -> tuple[dict[str, Any] | None, list[str]]:
    mapped: dict[str, Any] = {}
    if "electronic_notification_address" in patch:
        mapped["e_notification_address"] = patch["electronic_notification_address"]
        mapped["e_notification_active"] = bool(patch["electronic_notification_address"])
    return await _sync_public_row(
        session,
        context,
        company_id,
        table_name="company_public_channels",
        patch=mapped,
    )
