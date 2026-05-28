from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.policies.field_control import reject_operation_controlled_patch

ORGANIZATION_UNIT_CARD_FIELDS = {"name", "short_name", "parent_unit_id", "notes", "metadata_json"}


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


async def list_organization_units(
    session: AsyncSession,
    context: dict[str, Any],
    query: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    filters = query or {}
    where = ["coalesce(ou.is_deleted, false) = false"]
    params: dict[str, Any] = {}
    if filters.get("tenant_id") or context.get("tenant_id"):
        where.append("ou.tenant_id = :tenant_id")
        params["tenant_id"] = filters.get("tenant_id") or context.get("tenant_id")
    if filters.get("company_id"):
        where.append("ou.company_id = :company_id")
        params["company_id"] = filters["company_id"]
    if filters.get("search"):
        where.append(
            "(ou.name ilike :search or ou.short_name ilike :search or ou.code ilike :search)"
        )
        params["search"] = f"%{filters['search']}%"
    result = await session.execute(
        text(
            f"""
            select ou.*, c.trade_name as company_name, b.branch_name as branch_name
            from public.organization_units ou
            left join public.companies c on c.id = ou.company_id
            left join public.company_branches b on b.organization_unit_id = ou.id
              and coalesce(b.is_deleted, false) = false
            where {" and ".join(where)}
            order by ou.sort_order asc, ou.name asc
            limit :limit
            """
        ),
        {**params, "limit": int(filters.get("limit") or 200)},
    )
    return [dict(row) for row in result.mappings().all()]


async def list_organization_unit_types(session: AsyncSession) -> list[dict[str, Any]]:
    result = await session.execute(
        text(
            """
            select id, name, slug, color, icon, parent_type_id, sort_order, is_active
            from public.organization_unit_types
            where coalesce(is_active, true) = true
            order by sort_order asc, name asc
            """
        )
    )
    return [dict(row) for row in result.mappings().all()]


async def list_positions_for_organization(
    session: AsyncSession,
    context: dict[str, Any],
    query: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    filters = query or {}
    where = ["ou.tenant_id = :tenant_id", "coalesce(p.is_deleted, false) = false"]
    params: dict[str, Any] = {"tenant_id": context["tenant_id"]}
    if filters.get("unit_id"):
        where.append("p.unit_id = :unit_id")
        params["unit_id"] = filters["unit_id"]
    if filters.get("company_id"):
        where.append("ou.company_id = :company_id")
        params["company_id"] = filters["company_id"]
    result = await session.execute(
        text(
            f"""
            select p.*, ou.company_id, ou.name as organization_unit_name
            from public.positions p
            join public.organization_units ou on ou.id = p.unit_id
            where {" and ".join(where)}
            order by p.updated_at desc, p.created_at desc
            limit :limit
            """
        ),
        {**params, "limit": int(filters.get("limit") or 300)},
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
            insert into public.organization_unit_types (
              id, name, slug, color, icon, sort_order, is_active
            )
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
            raise DomainError(
                "Hedef organizasyon birimi bulunamadı.", "ORGANIZATION_UNIT_NOT_FOUND", 404
            )
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
        current_id = (
            str(parent["parent_unit_id"]) if parent and parent.get("parent_unit_id") else None
        )
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


async def get_unit_dependents_summary(
    session: AsyncSession,
    context: dict[str, Any],
    unit_id: str,
) -> dict[str, Any]:
    child_result = await session.execute(
        text(
            """
            select count(*) as count
            from public.organization_units
            where tenant_id = :tenant_id
              and parent_unit_id = :unit_id
              and coalesce(is_deleted, false) = false
            """
        ),
        {"tenant_id": context["tenant_id"], "unit_id": unit_id},
    )
    position_result = await session.execute(
        text(
            """
            select count(*) as count
            from public.positions
            where unit_id = :unit_id
              and coalesce(is_deleted, false) = false
            """
        ),
        {"unit_id": unit_id},
    )
    return {
        "child_unit_count": int(child_result.mappings().one()["count"] or 0),
        "position_count": int(position_result.mappings().one()["count"] or 0),
    }


async def get_organization_unit_detail(
    session: AsyncSession,
    context: dict[str, Any],
    unit_id: str,
) -> dict[str, Any]:
    unit = await get_unit_by_id(session, context["tenant_id"], unit_id)
    if not unit:
        raise DomainError("Organizasyon birimi bulunamadi.", "ORGANIZATION_UNIT_NOT_FOUND", 404)
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
        {"tenant_id": context["tenant_id"], "company_id": unit.get("company_id")},
    )
    children = await session.execute(
        text(
            """
            select id, name, type, status, active
            from public.organization_units
            where tenant_id = :tenant_id
              and parent_unit_id = :unit_id
              and coalesce(is_deleted, false) = false
            order by sort_order asc, name asc
            """
        ),
        {"tenant_id": context["tenant_id"], "unit_id": unit_id},
    )
    branch = await session.execute(
        text(
            """
            select id, branch_name, branch_short_name, record_status, status
            from public.company_branches
            where tenant_id = :tenant_id
              and organization_unit_id = :unit_id
              and coalesce(is_deleted, false) = false
            order by updated_at desc
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "unit_id": unit_id},
    )
    parent = (
        await get_unit_by_id(session, context["tenant_id"], str(unit["parent_unit_id"]))
        if unit.get("parent_unit_id")
        else None
    )
    company_row = company_result.mappings().one_or_none()
    branch_row = branch.mappings().one_or_none()
    dependents = await get_unit_dependents_summary(session, context, unit_id)
    return {
        "unit": unit,
        "company": dict(company_row) if company_row else None,
        "parent_unit": parent,
        "child_units": [dict(row) for row in children.mappings().all()],
        "related_branch": dict(branch_row) if branch_row else None,
        "positions_summary": {"position_count": dependents["position_count"]},
        "employees_summary": {},
        "warnings": [],
    }


def reject_operation_controlled_organization_unit_patch(payload: dict[str, Any]) -> None:
    reject_operation_controlled_patch("organization_unit", payload)


async def validate_parent_unit(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    unit_id: str,
    parent_unit_id: str | None,
) -> None:
    if not parent_unit_id:
        return
    if parent_unit_id == unit_id:
        raise DomainError(
            "Organizasyon birimi kendi altina baglanamaz.",
            "ORGANIZATION_UNIT_CYCLE",
            status.HTTP_409_CONFLICT,
        )
    parent = await get_unit_by_id(session, context["tenant_id"], parent_unit_id)
    if not parent:
        raise DomainError(
            "Hedef organizasyon birimi bulunamadi.", "ORGANIZATION_UNIT_NOT_FOUND", 404
        )
    assert_unit_belongs_to_company(parent, company_id)
    assert_unit_active(parent)
    if await would_create_cycle(session, context["tenant_id"], unit_id, parent_unit_id):
        raise DomainError(
            "Organizasyon baglantisi dongu olusturamaz.",
            "ORGANIZATION_UNIT_CYCLE",
            status.HTTP_409_CONFLICT,
        )


async def update_organization_unit_card(
    session: AsyncSession,
    context: dict[str, Any],
    unit_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    reject_operation_controlled_organization_unit_patch(payload)
    unit = await get_unit_by_id(session, context["tenant_id"], unit_id)
    if not unit:
        raise DomainError("Organizasyon birimi bulunamadi.", "ORGANIZATION_UNIT_NOT_FOUND", 404)
    patch = {key: value for key, value in payload.items() if key in ORGANIZATION_UNIT_CARD_FIELDS}
    if not patch:
        raise DomainError(
            "Guncellenecek organizasyon birimi alani bulunamadi.", "NO_CHANGED_FIELDS", 400
        )
    await validate_parent_unit(
        session,
        context,
        str(unit.get("company_id")),
        unit_id,
        patch.get("parent_unit_id"),
    )
    history = list(unit.get("history") or [])
    if "metadata_json" in patch:
        history.append(
            {"event": "card_metadata_updated", "metadata_json": patch.pop("metadata_json")}
        )
    assignments: list[str] = []
    params: dict[str, Any] = {"tenant_id": context["tenant_id"], "unit_id": unit_id}
    for field, value in patch.items():
        assignments.append(f"{field} = :{field}")
        params[field] = value
    assignments.append("history = cast(:history as jsonb)")
    params["history"] = json.dumps(history, ensure_ascii=False, default=str)
    result = await session.execute(
        text(
            f"""
            update public.organization_units
            set {", ".join(assignments)},
                updated_at = now()
            where tenant_id = :tenant_id
              and id = :unit_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        params,
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Organizasyon birimi bulunamadi.", "ORGANIZATION_UNIT_NOT_FOUND", 404)
    return await get_organization_unit_detail(session, context, unit_id)


async def create_position_for_unit(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
) -> dict[str, Any]:
    unit_id = str(payload.get("organization_unit_id") or payload.get("unit_id") or "")
    title = str(payload.get("position_title") or payload.get("title") or "").strip()
    if not unit_id:
        raise DomainError("Organizasyon birimi secilmelidir.", "ORGANIZATION_UNIT_REQUIRED", 400)
    if not title:
        raise DomainError("Pozisyon unvani zorunludur.", "POSITION_TITLE_REQUIRED", 400)
    unit = await get_unit_by_id(session, context["tenant_id"], unit_id)
    if not unit:
        raise DomainError("Organizasyon birimi bulunamadi.", "ORGANIZATION_UNIT_NOT_FOUND", 404)
    assert_unit_active(unit)
    if payload.get("company_id") and str(unit.get("company_id")) != str(payload["company_id"]):
        raise DomainError(
            "Pozisyonun sirketi organizasyon birimiyle uyusmuyor.",
            "POSITION_COMPANY_MISMATCH",
            status.HTTP_409_CONFLICT,
        )
    planned = int(payload.get("headcount_planned") or payload.get("norm_count") or 1)
    actual = int(payload.get("headcount_actual") or payload.get("active_count") or 0)
    if planned < 0 or actual < 0:
        raise DomainError("Kadro adetleri negatif olamaz.", "POSITION_HEADCOUNT_INVALID", 400)
    result = await session.execute(
        text(
            """
            insert into public.positions (
              id, tenant_id, unit_id, title, grade, is_manager, norm_count, active_count,
              budget_code, work_type, status, notes, history, is_deleted, created_at, updated_at
            )
            values (
              :id, :tenant_id, :unit_id, :title, :grade, :is_manager, :norm_count, :active_count,
              :budget_code, :work_type, :status, :notes, '[]'::jsonb, false, now(), now()
            )
            returning *
            """
        ),
        {
            "id": str(uuid4()),
            "tenant_id": context["tenant_id"],
            "unit_id": unit_id,
            "title": title,
            "grade": payload.get("grade") or payload.get("position_type"),
            "is_manager": bool(payload.get("is_manager") or False),
            "norm_count": planned,
            "active_count": actual,
            "budget_code": payload.get("budget_code") or payload.get("position_code"),
            "work_type": payload.get("employment_type") or payload.get("work_type"),
            "status": payload.get("status") or "open",
            "notes": payload.get("notes"),
        },
    )
    return dict(result.mappings().one())


async def link_unit_to_branch(
    session: AsyncSession,
    context: dict[str, Any],
    unit_id: str,
    branch_id: str,
) -> dict[str, Any]:
    unit = await get_unit_by_id(session, context["tenant_id"], unit_id)
    if not unit:
        raise DomainError("Organizasyon birimi bulunamadi.", "ORGANIZATION_UNIT_NOT_FOUND", 404)
    result = await session.execute(
        text(
            """
            update public.company_branches
            set organization_unit_id = :unit_id,
                updated_at = now(),
                updated_by = :user_id
            where tenant_id = :tenant_id
              and id = :branch_id
              and company_id = :company_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "unit_id": unit_id,
            "branch_id": branch_id,
            "company_id": unit.get("company_id"),
            "user_id": context.get("user_id"),
        },
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Sube kaydi bulunamadi.", "BRANCH_NOT_FOUND", 404)
    return dict(row)


async def create_organization_unit(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
) -> dict[str, Any]:
    tenant_id = context["tenant_id"]
    company_id = str(payload.get("company_id") or "")
    name = str(payload.get("name") or "").strip()
    if not company_id:
        raise DomainError("Bagli sirket secilmelidir.", "COMPANY_REQUIRED", 400)
    if not name:
        raise DomainError(
            "Organizasyon birimi adi zorunludur.",
            "ORGANIZATION_UNIT_NAME_REQUIRED",
            400,
        )
    await _assert_company_exists(session, tenant_id, company_id)
    parent_unit_id = payload.get("parent_unit_id") or None
    if parent_unit_id:
        parent = await get_unit_by_id(session, tenant_id, str(parent_unit_id))
        if not parent:
            raise DomainError(
                "Hedef organizasyon birimi bulunamadi.", "ORGANIZATION_UNIT_NOT_FOUND", 404
            )
        assert_unit_belongs_to_company(parent, company_id)
        assert_unit_active(parent)

    duplicate = await session.execute(
        text(
            """
            select id
            from public.organization_units
            where tenant_id = :tenant_id
              and company_id = :company_id
              and lower(name) = lower(:name)
              and coalesce(parent_unit_id::text, '') = coalesce(:parent_unit_id, '')
              and coalesce(active, true) = true
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {
            "tenant_id": tenant_id,
            "company_id": company_id,
            "name": name,
            "parent_unit_id": str(parent_unit_id) if parent_unit_id else None,
        },
    )
    if duplicate.mappings().one_or_none():
        raise DomainError(
            "Ayni ust birim altinda ayni isimde aktif organizasyon birimi var.",
            "ORGANIZATION_UNIT_DUPLICATE",
            status.HTTP_409_CONFLICT,
        )

    related_branch_id = payload.get("related_branch_id") or payload.get("branch_id")
    if related_branch_id:
        await _assert_branch_belongs_to_company(
            session,
            tenant_id,
            company_id,
            str(related_branch_id),
        )

    unit_id = str(uuid4())
    history = json.dumps(
        [{"event": "organization_unit_created", "source": "organization_module"}],
        ensure_ascii=False,
    )
    result = await session.execute(
        text(
            """
            insert into public.organization_units (
              id, tenant_id, company_id, parent_unit_id, unit_type_id, name, type, short_name,
              status, start_date, notes, history, active, is_deleted, created_at, updated_at
            )
            values (
              :id, :tenant_id, :company_id, :parent_unit_id, :unit_type_id, :name, :unit_type,
              :short_name, 'active', :start_date, :notes, cast(:history as jsonb),
              true, false, now(), now()
            )
            returning *
            """
        ),
        {
            "id": unit_id,
            "tenant_id": tenant_id,
            "company_id": company_id,
            "parent_unit_id": parent_unit_id,
            "unit_type_id": payload.get("unit_type_id") or None,
            "unit_type": payload.get("unit_type") or payload.get("type") or "department",
            "name": name,
            "short_name": payload.get("short_name"),
            "start_date": payload.get("start_date"),
            "notes": payload.get("notes"),
            "history": history,
        },
    )
    row = dict(result.mappings().one())
    if related_branch_id:
        await link_unit_to_branch(session, context, unit_id, str(related_branch_id))
    return row


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
            "Kapali veya pasif sube yeni organizasyon baglantisi icin kullanilamaz.",
            "BRANCH_NOT_ACTIVE",
            status.HTTP_409_CONFLICT,
        )


def assert_unit_belongs_to_company(unit: dict[str, Any], company_id: str) -> None:
    if str(unit.get("company_id")) != company_id:
        raise DomainError(
            "Seçilen organizasyon birimi bu şirkete bağlı değil.", "UNIT_COMPANY_MISMATCH", 409
        )


def assert_unit_active(unit: dict[str, Any]) -> None:
    if not is_unit_active(unit):
        raise DomainError(
            "Kapalı veya pasif organizasyon birimi seçilemez.", "UNIT_NOT_ACTIVE", 409
        )
