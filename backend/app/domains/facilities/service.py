from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError


def is_facility_active(facility: dict[str, Any] | None) -> bool:
    if not facility or facility.get("is_deleted") is True:
        return False
    return str(facility.get("record_status") or facility.get("status") or "").lower() in {
        "active",
        "aktif",
        "reusable",
    }


async def get_facility_by_id(
    session: AsyncSession,
    tenant_id: str,
    facility_id: str,
) -> dict[str, Any] | None:
    result = await session.execute(
        text(
            """
            select *
            from public.company_facilities
            where tenant_id = :tenant_id
              and id = :facility_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "facility_id": facility_id},
    )
    row = result.mappings().one_or_none()
    return dict(row) if row else None


async def list_facilities_for_company(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
) -> list[dict[str, Any]]:
    result = await session.execute(
        text(
            """
            select *
            from public.company_facilities
            where tenant_id = :tenant_id
              and company_id = :company_id
              and coalesce(is_deleted, false) = false
            order by facility_name asc
            """
        ),
        {"tenant_id": tenant_id, "company_id": company_id},
    )
    return [dict(row) for row in result.mappings().all()]


async def create_facility_for_branch(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
) -> dict[str, Any]:
    facility_id = str(uuid4())
    metadata_json = json.dumps(
        {
            "source": "branch_opening",
            "branch_id": payload.get("branch_id"),
            "operation_id": context.get("operation_id"),
        },
        ensure_ascii=False,
    )
    result = await session.execute(
        text(
            """
            insert into public.company_facilities (
              id, tenant_id, company_id, branch_id, facility_name, facility_type,
              country, city, district, neighborhood, address, postal_code, phone, email,
              status, record_status, start_date, notes, metadata_json,
              created_by, updated_by, version, is_deleted
            )
            values (
              :id, :tenant_id, :company_id, :branch_id, :facility_name, 'branch_location',
              :country, :city, :district, :neighborhood, :address, :postal_code, :phone, :email,
              'active', 'active', :start_date, :notes, cast(:metadata_json as jsonb),
              :user_id, :user_id, 1, false
            )
            returning *
            """
        ),
        {
            "id": facility_id,
            "tenant_id": context["tenant_id"],
            "company_id": payload["company_id"],
            "branch_id": payload.get("branch_id"),
            "facility_name": payload.get("facility_name") or payload.get("branch_name"),
            "country": payload.get("country"),
            "city": payload.get("city"),
            "district": payload.get("district"),
            "neighborhood": payload.get("neighborhood"),
            "address": payload.get("address"),
            "postal_code": payload.get("postal_code"),
            "phone": payload.get("phone"),
            "email": payload.get("email"),
            "start_date": payload.get("start_date"),
            "notes": payload.get("notes"),
            "metadata_json": metadata_json,
            "user_id": context.get("user_id"),
        },
    )
    return dict(result.mappings().one())


async def link_facility_to_branch(
    session: AsyncSession,
    context: dict[str, Any],
    facility_id: str,
    branch_id: str,
) -> dict[str, Any]:
    facility = await get_facility_by_id(session, context["tenant_id"], facility_id)
    if not facility:
        raise DomainError("Tesis/lokasyon kaydı bulunamadı.", "FACILITY_NOT_FOUND", 404)
    metadata = dict(facility.get("metadata_json") or {})
    metadata["branch_id"] = branch_id
    result = await session.execute(
        text(
            """
            update public.company_facilities
            set branch_id = :branch_id,
                metadata_json = cast(:metadata_json as jsonb),
                updated_by = :user_id,
                updated_at = now(),
                version = coalesce(version, 0) + 1
            where tenant_id = :tenant_id
              and id = :facility_id
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "facility_id": facility_id,
            "branch_id": branch_id,
            "metadata_json": json.dumps(metadata, ensure_ascii=False),
            "user_id": context.get("user_id"),
        },
    )
    return dict(result.mappings().one())


async def set_facility_passive(
    session: AsyncSession,
    context: dict[str, Any],
    facility_id: str,
    end_date: str | None,
) -> dict[str, Any]:
    return await _update_facility_after_branch_closing(
        session,
        context,
        facility_id,
        status_value="closed",
        record_status="closed",
        end_date=end_date,
        metadata_key="branch_closed_deactivate",
    )


async def keep_facility_open_after_branch_closing(
    session: AsyncSession,
    context: dict[str, Any],
    facility_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    return await _update_facility_after_branch_closing(
        session,
        context,
        facility_id,
        status_value=None,
        record_status=None,
        end_date=payload.get("end_date"),
        metadata_key="branch_closed_keep_open",
    )


async def mark_facility_reusable(
    session: AsyncSession,
    context: dict[str, Any],
    facility_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    return await _update_facility_after_branch_closing(
        session,
        context,
        facility_id,
        status_value="reusable",
        record_status="active",
        end_date=payload.get("end_date"),
        metadata_key="branch_closed_reusable",
    )


async def _update_facility_after_branch_closing(
    session: AsyncSession,
    context: dict[str, Any],
    facility_id: str,
    *,
    status_value: str | None,
    record_status: str | None,
    end_date: str | None,
    metadata_key: str,
) -> dict[str, Any]:
    facility = await get_facility_by_id(session, context["tenant_id"], facility_id)
    if not facility:
        raise DomainError("Tesis/lokasyon kaydı bulunamadı.", "FACILITY_NOT_FOUND", 404)
    metadata = dict(facility.get("metadata_json") or {})
    metadata[metadata_key] = {
        "operation_id": context.get("operation_id"),
        "end_date": end_date,
    }
    result = await session.execute(
        text(
            """
            update public.company_facilities
            set status = coalesce(:status_value, status),
                record_status = coalesce(:record_status, record_status),
                end_date = coalesce(:end_date, end_date),
                metadata_json = cast(:metadata_json as jsonb),
                updated_by = :user_id,
                updated_at = now(),
                version = coalesce(version, 0) + 1
            where tenant_id = :tenant_id
              and id = :facility_id
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "facility_id": facility_id,
            "status_value": status_value,
            "record_status": record_status,
            "end_date": end_date,
            "metadata_json": json.dumps(metadata, ensure_ascii=False),
            "user_id": context.get("user_id"),
        },
    )
    return dict(result.mappings().one())


def build_facility_display_label(facility: dict[str, Any] | None) -> str:
    if not facility:
        return "Tesis/Lokasyon"
    return str(facility.get("facility_name") or "Tesis/Lokasyon")


def assert_facility_belongs_to_company(facility: dict[str, Any], company_id: str) -> None:
    if str(facility.get("company_id")) != company_id:
        raise DomainError("Seçilen tesis/lokasyon bu şirkete bağlı değil.", "FACILITY_COMPANY_MISMATCH", 409)


def assert_facility_active(facility: dict[str, Any]) -> None:
    if not is_facility_active(facility):
        raise DomainError("Kapalı veya pasif tesis/lokasyon seçilemez.", "FACILITY_NOT_ACTIVE", 409)
