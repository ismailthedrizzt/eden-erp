from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.operations.service import table_exists
from app.domains.representatives.schemas import AUTHORITY_CONTROLLED_FIELDS

ACTIVE_CARD_STATUSES = {"active", "aktif"}
DRAFT_CARD_STATUSES = {"draft", "taslak", ""}
PASSIVE_CARD_STATUSES = {"passive", "pasif"}
ACTIVE_AUTHORITY_STATUSES = {"active", "aktif"}
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
    blocked = sorted(field for field in payload if field in AUTHORITY_CONTROLLED_FIELDS)
    if blocked:
        raise DomainError(
            "Temsil yetkisi alanlari kart guncellemesiyle degistirilemez. "
            "Ilgili temsil yetkisi islemini kullanin.",
            "OPERATION_CONTROLLED_FIELDS",
            status.HTTP_409_CONFLICT,
            {"fields": blocked},
        )


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
    return dict(row) if row else None


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
    await assert_unique_representative_card(
        session,
        context,
        str(payload["company_id"]),
        payload.get("person_id"),
        payload.get("organization_id"),
    )
    representative_id = str(uuid4())
    result = await session.execute(
        text(
            """
            insert into public.company_representatives (
              id, tenant_id, company_id, person_id, organization_id, person_kind,
              display_name, full_name, phone, email, notes, status, record_status,
              representative_profile, photo_logo, created_at, updated_at, version,
              is_deleted
            )
            values (
              :id, :tenant_id, :company_id, :person_id, :organization_id, :person_kind,
              :display_name, :full_name, :phone, :email, :notes, 'Taslak', 'draft',
              cast(:representative_profile as jsonb), cast(:photo_logo as jsonb),
              now(), now(), 1, false
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
            "person_kind": payload.get("person_kind") or "person",
            "display_name": payload.get("display_name") or payload.get("full_name") or "Temsilci",
            "full_name": payload.get("full_name") or payload.get("display_name") or "Temsilci",
            "phone": payload.get("phone"),
            "email": payload.get("email"),
            "notes": payload.get("notes"),
            "representative_profile": json.dumps(
                payload.get("representative_profile") or {}, ensure_ascii=False, default=str
            ),
            "photo_logo": json.dumps(payload.get("photo_logo") or [], ensure_ascii=False),
        },
    )
    return dict(result.mappings().one())


async def update_representative_card(
    session: AsyncSession,
    context: dict[str, Any],
    representative_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
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
            "job_title",
            "photo_logo",
            "representative_profile",
        ]
        if key in payload
    }
    if not allowed:
        raise DomainError("Guncellenecek kart alani bulunamadi.", "NO_CHANGED_FIELDS", 400)
    assignments: list[str] = []
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "representative_id": representative_id,
        "user_id": context.get("user_id"),
    }
    for key, value in allowed.items():
        assignments.append(f"{key} = :{key}")
        params[key] = (
            json.dumps(value, ensure_ascii=False, default=str)
            if isinstance(value, (dict, list))
            else value
        )
    result = await session.execute(
        text(
            f"""
            update public.company_representatives
            set {", ".join(assignments)},
                updated_at = now(),
                updated_by = :user_id,
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
