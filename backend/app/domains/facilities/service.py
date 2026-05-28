from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.policies.field_control import reject_operation_controlled_patch

FACILITY_CARD_FIELDS = {"facility_name", "name", "phone", "email", "notes", "metadata_json"}


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


async def list_facilities(
    session: AsyncSession,
    context: dict[str, Any],
    query: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    filters = query or {}
    where = ["f.tenant_id = :tenant_id", "coalesce(f.is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"]}
    if filters.get("company_id"):
        where.append("f.company_id = :company_id")
        params["company_id"] = filters["company_id"]
    if filters.get("branch_id"):
        where.append("f.branch_id = :branch_id")
        params["branch_id"] = filters["branch_id"]
    if filters.get("search"):
        where.append(
            "(f.facility_name ilike :search or f.city ilike :search or f.address ilike :search)"
        )
        params["search"] = f"%{filters['search']}%"
    result = await session.execute(
        text(
            f"""
            select f.*, c.trade_name as company_name, b.branch_name as branch_name
            from public.company_facilities f
            left join public.companies c on c.id = f.company_id and c.tenant_id = f.tenant_id
            left join public.company_branches b on b.id = f.branch_id and b.tenant_id = f.tenant_id
            where {" and ".join(where)}
            order by f.updated_at desc, f.created_at desc
            limit :limit
            """
        ),
        {**params, "limit": int(filters.get("limit") or 200)},
    )
    return [dict(row) for row in result.mappings().all()]


async def get_facility_active_relations_summary(
    session: AsyncSession,
    context: dict[str, Any],
    facility_id: str,
) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            select count(*) filter (
                     where lower(coalesce(record_status, status, '')) in ('active', 'aktif')
                   ) as active_branch_count,
                   count(*) as related_branch_count
            from public.company_branches
            where tenant_id = :tenant_id
              and facility_id = :facility_id
              and coalesce(is_deleted, false) = false
            """
        ),
        {"tenant_id": context["tenant_id"], "facility_id": facility_id},
    )
    row = result.mappings().one()
    return {
        "active_branch_count": int(row["active_branch_count"] or 0),
        "related_branch_count": int(row["related_branch_count"] or 0),
    }


async def get_facility_detail(
    session: AsyncSession,
    context: dict[str, Any],
    facility_id: str,
) -> dict[str, Any]:
    facility = await get_facility_by_id(session, context["tenant_id"], facility_id)
    if not facility:
        raise DomainError("Tesis/lokasyon kaydi bulunamadi.", "FACILITY_NOT_FOUND", 404)
    company_result = await session.execute(
        text(
            """
            select id, trade_name, short_name, record_status, company_status
            from public.companies
            where tenant_id = :tenant_id
              and id = :company_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "company_id": facility.get("company_id")},
    )
    branch_result = await session.execute(
        text(
            """
            select id, branch_name, branch_short_name, record_status, status
            from public.company_branches
            where tenant_id = :tenant_id
              and facility_id = :facility_id
              and coalesce(is_deleted, false) = false
            order by updated_at desc
            limit 20
            """
        ),
        {"tenant_id": context["tenant_id"], "facility_id": facility_id},
    )
    related_branches = [dict(row) for row in branch_result.mappings().all()]
    company_row = company_result.mappings().one_or_none()
    return {
        "facility": facility,
        "company": dict(company_row) if company_row else None,
        "branch": related_branches[0] if related_branches else None,
        "related_branches": related_branches,
        "active_relations_summary": await get_facility_active_relations_summary(
            session, context, facility_id
        ),
        "warnings": [],
    }


def reject_operation_controlled_facility_patch(payload: dict[str, Any]) -> None:
    reject_operation_controlled_patch("facility", payload)


async def update_facility_card(
    session: AsyncSession,
    context: dict[str, Any],
    facility_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    reject_operation_controlled_facility_patch(payload)
    facility = await get_facility_by_id(session, context["tenant_id"], facility_id)
    if not facility:
        raise DomainError("Tesis/lokasyon kaydi bulunamadi.", "FACILITY_NOT_FOUND", 404)
    base_version = payload.get("base_version")
    if base_version is not None and int(facility.get("version") or 0) != int(base_version):
        raise DomainError("Tesis/lokasyon kaydi guncellenmis.", "VERSION_CONFLICT", 409)
    patch = {key: value for key, value in payload.items() if key in FACILITY_CARD_FIELDS}
    if "name" in patch and "facility_name" not in patch:
        patch["facility_name"] = patch.pop("name")
    if not patch:
        raise DomainError(
            "Guncellenecek tesis/lokasyon kart alani bulunamadi.", "NO_CHANGED_FIELDS", 400
        )
    assignments: list[str] = []
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "facility_id": facility_id,
        "user_id": context.get("user_id"),
    }
    for field, value in patch.items():
        if field == "metadata_json":
            metadata = dict(facility.get("metadata_json") or {})
            metadata.update(value or {})
            assignments.append("metadata_json = cast(:metadata_json as jsonb)")
            params["metadata_json"] = json.dumps(metadata, ensure_ascii=False, default=str)
        else:
            assignments.append(f"{field} = :{field}")
            params[field] = value
    result = await session.execute(
        text(
            f"""
            update public.company_facilities
            set {", ".join(assignments)},
                updated_by = :user_id,
                updated_at = now(),
                version = coalesce(version, 0) + 1
            where tenant_id = :tenant_id
              and id = :facility_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        params,
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Tesis/lokasyon kaydi bulunamadi.", "FACILITY_NOT_FOUND", 404)
    return await get_facility_detail(session, context, facility_id)


async def create_facility(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
) -> dict[str, Any]:
    tenant_id = context["tenant_id"]
    company_id = str(payload.get("company_id") or "")
    facility_name = str(payload.get("facility_name") or payload.get("name") or "").strip()
    if not company_id:
        raise DomainError("Bagli sirket secilmelidir.", "COMPANY_REQUIRED", 400)
    if not facility_name:
        raise DomainError("Tesis/lokasyon adi zorunludur.", "FACILITY_NAME_REQUIRED", 400)
    await _assert_company_exists(session, tenant_id, company_id)
    branch_id = payload.get("related_branch_id") or payload.get("branch_id")
    if branch_id:
        await _assert_branch_belongs_to_company(session, tenant_id, company_id, str(branch_id))
    metadata = {
        "source": "facility_module",
        "coordinates": payload.get("coordinates"),
    }
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
              :id, :tenant_id, :company_id, :branch_id, :facility_name, :facility_type,
              :country, :city, :district, :neighborhood, :address, :postal_code, :phone, :email,
              'active', 'active', :start_date, :notes, cast(:metadata_json as jsonb),
              :user_id, :user_id, 1, false
            )
            returning *
            """
        ),
        {
            "id": str(uuid4()),
            "tenant_id": tenant_id,
            "company_id": company_id,
            "branch_id": branch_id,
            "facility_name": facility_name,
            "facility_type": payload.get("facility_type") or "office",
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
            "metadata_json": json.dumps(metadata, ensure_ascii=False, default=str),
            "user_id": context.get("user_id"),
        },
    )
    return dict(result.mappings().one())


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


async def validate_facility_same_company(
    session: AsyncSession,
    facility_id: str,
    company_id: str,
    tenant_id: str,
) -> dict[str, Any]:
    facility = await get_facility_by_id(session, tenant_id, facility_id)
    if not facility:
        raise DomainError("Tesis/lokasyon kaydi bulunamadi.", "FACILITY_NOT_FOUND", 404)
    assert_facility_belongs_to_company(facility, company_id)
    return facility


def build_facility_display_label(facility: dict[str, Any] | None) -> str:
    if not facility:
        return "Tesis/Lokasyon"
    return str(facility.get("facility_name") or "Tesis/Lokasyon")


async def _assert_company_exists(session: AsyncSession, tenant_id: str, company_id: str) -> None:
    result = await session.execute(
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
        {"tenant_id": tenant_id, "company_id": company_id},
    )
    if not result.mappings().one_or_none():
        raise DomainError("Bagli sirket bulunamadi.", "COMPANY_NOT_FOUND", 404)


async def _assert_branch_belongs_to_company(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
    branch_id: str,
) -> None:
    result = await session.execute(
        text(
            """
            select id, record_status, status
            from public.company_branches
            where tenant_id = :tenant_id
              and id = :branch_id
              and company_id = :company_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "company_id": company_id, "branch_id": branch_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Iliskili sube ayni sirket altinda bulunamadi.", "BRANCH_NOT_FOUND", 404)
    status_value = str(row.get("record_status") or row.get("status") or "").lower()
    if status_value in {"closed", "passive", "kapali"}:
        raise DomainError(
            "Kapali veya pasif sube yeni tesis/lokasyon baglantisi icin kullanilamaz.",
            "BRANCH_NOT_ACTIVE",
            409,
        )


def assert_facility_belongs_to_company(facility: dict[str, Any], company_id: str) -> None:
    if str(facility.get("company_id")) != company_id:
        raise DomainError(
            "Seçilen tesis/lokasyon bu şirkete bağlı değil.", "FACILITY_COMPANY_MISMATCH", 409
        )


def assert_facility_active(facility: dict[str, Any]) -> None:
    if not is_facility_active(facility):
        raise DomainError("Kapalı veya pasif tesis/lokasyon seçilemez.", "FACILITY_NOT_ACTIVE", 409)
