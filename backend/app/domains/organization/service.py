from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError


def is_unit_active(unit: dict[str, Any] | None) -> bool:
    if not unit or unit.get("is_deleted") is True:
        return False
    status_value = str(unit.get("status") or "").lower()
    return bool(unit.get("active", True)) and status_value in {"active", "aktif"}


async def get_unit_by_id(
    session: AsyncSession,
    tenant_id: str,
    unit_id: str,
) -> dict[str, Any] | None:
    result = await session.execute(
        text(
            """
            select *
            from public.organization_units
            where tenant_id = :tenant_id
              and id = :unit_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "unit_id": unit_id},
    )
    row = result.mappings().one_or_none()
    return dict(row) if row else None


async def list_units_for_company(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
) -> list[dict[str, Any]]:
    result = await session.execute(
        text(
            """
            select *
            from public.organization_units
            where tenant_id = :tenant_id
              and company_id = :company_id
              and coalesce(is_deleted, false) = false
            order by sort_order asc, name asc
            """
        ),
        {"tenant_id": tenant_id, "company_id": company_id},
    )
    return [dict(row) for row in result.mappings().all()]


async def get_company_root_unit_id(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
) -> str | None:
    result = await session.execute(
        text(
            """
            select id
            from public.organization_units
            where tenant_id = :tenant_id
              and company_id = :company_id
              and parent_unit_id is null
              and coalesce(is_deleted, false) = false
            order by created_at asc
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "company_id": company_id},
    )
    row = result.mappings().one_or_none()
    return str(row["id"]) if row else None


async def _get_or_create_branch_unit_type(session: AsyncSession) -> str:
    existing = await session.execute(
        text("select id from public.organization_unit_types where slug = 'branch' limit 1")
    )
    row = existing.mappings().one_or_none()
    if row:
        return str(row["id"])

    unit_type_id = str(uuid4())
    await session.execute(
        text(
            """
            insert into public.organization_unit_types (id, name, slug, color, icon, sort_order, is_active)
            values (:id, 'Şube', 'branch', '#2563eb', 'building-2', 30, true)
            on conflict (slug) do update set updated_at = now()
            returning id
            """
        ),
        {"id": unit_type_id},
    )
    result = await session.execute(
        text("select id from public.organization_unit_types where slug = 'branch' limit 1")
    )
    return str(result.mappings().one()["id"])


async def create_branch_organization_unit(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
) -> dict[str, Any]:
    tenant_id = context["tenant_id"]
    company_id = payload["company_id"]
    parent_unit_id = payload.get("parent_unit_id") or await get_company_root_unit_id(
        session, tenant_id, company_id
    )
    if parent_unit_id:
        parent = await get_unit_by_id(session, tenant_id, parent_unit_id)
        if not parent:
            raise DomainError("Hedef organizasyon birimi bulunamadı.", "ORGANIZATION_UNIT_NOT_FOUND", 404)
        assert_unit_belongs_to_company(parent, company_id)
        assert_unit_active(parent)

    unit_type_id = await _get_or_create_branch_unit_type(session)
    unit_id = str(uuid4())
    history = json.dumps(
        [{"event": "branch_opening_created", "operation_id": context.get("operation_id")}],
        ensure_ascii=False,
    )
    result = await session.execute(
        text(
            """
            insert into public.organization_units (
              id, tenant_id, company_id, parent_unit_id, unit_type_id, name, type, short_name,
              location_name, status, start_date, notes, history, active, is_deleted,
              created_at, updated_at
            )
            values (
              :id, :tenant_id, :company_id, :parent_unit_id, :unit_type_id, :name, 'branch',
              :short_name, :location_name, 'active', :start_date, :notes,
              cast(:history as jsonb), true, false, now(), now()
            )
            returning *
            """
        ),
        {
            "id": unit_id,
            "tenant_id": tenant_id,
            "company_id": company_id,
            "parent_unit_id": parent_unit_id,
            "unit_type_id": unit_type_id,
            "name": payload.get("organization_unit_name") or payload.get("branch_name"),
            "short_name": payload.get("branch_short_name"),
            "location_name": payload.get("location_name"),
            "start_date": payload.get("start_date"),
            "notes": payload.get("notes"),
            "history": history,
        },
    )
    return dict(result.mappings().one())


async def set_organization_unit_passive(
    session: AsyncSession,
    context: dict[str, Any],
    unit_id: str,
    end_date: str | None,
) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            update public.organization_units
            set status = 'passive',
                active = false,
                end_date = coalesce(:end_date, end_date),
                updated_at = now()
            where tenant_id = :tenant_id
              and id = :unit_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        {"tenant_id": context["tenant_id"], "unit_id": unit_id, "end_date": end_date},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Organizasyon birimi bulunamadı.", "ORGANIZATION_UNIT_NOT_FOUND", 404)
    return dict(row)


async def would_create_cycle(
    session: AsyncSession,
    tenant_id: str,
    unit_id: str,
    target_parent_unit_id: str,
) -> bool:
    current_id: str | None = target_parent_unit_id
    seen: set[str] = set()
    while current_id:
        if current_id == unit_id or current_id in seen:
            return True
        seen.add(current_id)
        parent = await get_unit_by_id(session, tenant_id, current_id)
        current_id = str(parent["parent_unit_id"]) if parent and parent.get("parent_unit_id") else None
    return False


async def reassign_organization_unit(
    session: AsyncSession,
    context: dict[str, Any],
    unit_id: str,
    target_parent_unit_id: str,
) -> dict[str, Any]:
    tenant_id = context["tenant_id"]
    unit = await get_unit_by_id(session, tenant_id, unit_id)
    target = await get_unit_by_id(session, tenant_id, target_parent_unit_id)
    if not unit or not target:
        raise DomainError("Organizasyon birimi bulunamadı.", "ORGANIZATION_UNIT_NOT_FOUND", 404)
    assert_unit_belongs_to_company(target, str(unit["company_id"]))
    assert_unit_active(target)
    if await would_create_cycle(session, tenant_id, unit_id, target_parent_unit_id):
        raise DomainError(
            "Organizasyon bağlantısı döngü oluşturamaz.",
            "ORGANIZATION_UNIT_CYCLE",
            status.HTTP_409_CONFLICT,
        )
    result = await session.execute(
        text(
            """
            update public.organization_units
            set parent_unit_id = :target_parent_unit_id,
                updated_at = now()
            where tenant_id = :tenant_id
              and id = :unit_id
            returning *
            """
        ),
        {
            "tenant_id": tenant_id,
            "unit_id": unit_id,
            "target_parent_unit_id": target_parent_unit_id,
        },
    )
    return dict(result.mappings().one())


async def keep_organization_unit_open_after_branch_closing(
    session: AsyncSession,
    context: dict[str, Any],
    unit_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    unit = await get_unit_by_id(session, context["tenant_id"], unit_id)
    if not unit:
        raise DomainError("Organizasyon birimi bulunamadı.", "ORGANIZATION_UNIT_NOT_FOUND", 404)
    history = list(unit.get("history") or [])
    history.append(
        {
            "event": "branch_closed_keep_unit_open",
            "operation_id": context.get("operation_id"),
            "end_date": payload.get("end_date"),
        }
    )
    result = await session.execute(
        text(
            """
            update public.organization_units
            set history = cast(:history as jsonb),
                updated_at = now()
            where tenant_id = :tenant_id
              and id = :unit_id
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "unit_id": unit_id,
            "history": json.dumps(history, ensure_ascii=False),
        },
    )
    return dict(result.mappings().one())


def assert_unit_belongs_to_company(unit: dict[str, Any], company_id: str) -> None:
    if str(unit.get("company_id")) != company_id:
        raise DomainError("Seçilen organizasyon birimi bu şirkete bağlı değil.", "UNIT_COMPANY_MISMATCH", 409)


def assert_unit_active(unit: dict[str, Any]) -> None:
    if not is_unit_active(unit):
        raise DomainError("Kapalı veya pasif organizasyon birimi seçilemez.", "UNIT_NOT_ACTIVE", 409)
