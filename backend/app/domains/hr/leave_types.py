from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.hr.schemas import (
    LeaveTypeCreateRequest,
    LeaveTypeListQuery,
    LeaveTypeUpdateRequest,
    ListResult,
)
from app.domains.hr.service import (
    assert_company_exists,
    assert_company_scope,
    assert_version,
    ensure_hr_deepening_tables,
    list_meta,
    row_to_dict,
)

DEFAULT_LEAVE_TYPES: list[dict[str, Any]] = [
    {
        "leave_type_key": "annual",
        "leave_type_name": "Yillik Izin",
        "category": "annual",
        "paid": True,
        "requires_document": False,
        "requires_approval": True,
        "default_days_per_year": 14,
        "carry_over_allowed": True,
    },
    {
        "leave_type_key": "sick",
        "leave_type_name": "Hastalik Raporu",
        "category": "sick",
        "paid": True,
        "requires_document": True,
        "default_days_per_year": 0,
    },
    {
        "leave_type_key": "unpaid",
        "leave_type_name": "Ucretsiz Izin",
        "category": "unpaid",
        "paid": False,
        "default_days_per_year": 0,
        "negative_balance_allowed": True,
    },
    {
        "leave_type_key": "paid_excuse",
        "leave_type_name": "Mazeret Izni",
        "category": "paid_excuse",
        "paid": True,
        "default_days_per_year": 0,
        "negative_balance_allowed": True,
    },
    {
        "leave_type_key": "marriage",
        "leave_type_name": "Evlilik Izni",
        "category": "marriage",
        "paid": True,
        "default_days_per_year": 3,
    },
    {
        "leave_type_key": "bereavement",
        "leave_type_name": "Vefat Izni",
        "category": "bereavement",
        "paid": True,
        "default_days_per_year": 3,
    },
    {
        "leave_type_key": "maternity",
        "leave_type_name": "Dogum Izni",
        "category": "maternity",
        "paid": True,
        "requires_document": True,
        "default_days_per_year": 0,
        "negative_balance_allowed": True,
    },
    {
        "leave_type_key": "paternity",
        "leave_type_name": "Babalik Izni",
        "category": "paternity",
        "paid": True,
        "default_days_per_year": 5,
    },
    {
        "leave_type_key": "administrative",
        "leave_type_name": "Idari Izin",
        "category": "administrative",
        "paid": True,
        "default_days_per_year": 0,
        "negative_balance_allowed": True,
    },
    {
        "leave_type_key": "other",
        "leave_type_name": "Diger",
        "category": "other",
        "paid": True,
        "default_days_per_year": 0,
        "negative_balance_allowed": True,
    },
]

LEAVE_TYPE_SORT_COLUMNS = {
    "leave_type_name": "leave_type_name",
    "category": "category",
    "active": "active",
    "updated_at": "updated_at",
    "created_at": "created_at",
}


async def ensure_default_leave_types(session: AsyncSession, context: dict[str, Any]) -> None:
    await ensure_hr_deepening_tables(session, leave_types=True)
    for item in DEFAULT_LEAVE_TYPES:
        await session.execute(
            text(
                """
                insert into public.hr_leave_types (
                  tenant_id, company_id, leave_type_key, leave_type_name, category,
                  paid, requires_document, requires_approval, affects_payroll,
                  affects_attendance, default_days_per_year, carry_over_allowed,
                  max_carry_over_days, negative_balance_allowed, active, notes,
                  created_by, updated_by
                )
                values (
                  :tenant_id, null, :leave_type_key, :leave_type_name, :category,
                  :paid, :requires_document, :requires_approval, :affects_payroll,
                  :affects_attendance, :default_days_per_year,
                  :carry_over_allowed, 0, :negative_balance_allowed, true,
                  'Tenant-level lazy seed', :user_id, :user_id
                )
                on conflict do nothing
                """
            ),
            {
                "tenant_id": context["tenant_id"],
                "user_id": context.get("user_id"),
                "paid": item.get("paid", True),
                "requires_document": item.get("requires_document", False),
                "requires_approval": item.get("requires_approval", True),
                "affects_payroll": item.get("affects_payroll", True),
                "affects_attendance": item.get("affects_attendance", True),
                "carry_over_allowed": item.get("carry_over_allowed", False),
                "negative_balance_allowed": item.get("negative_balance_allowed", False),
                **item,
            },
        )


async def list_leave_types(
    session: AsyncSession,
    context: dict[str, Any],
    query: LeaveTypeListQuery,
) -> ListResult:
    await ensure_default_leave_types(session, context)
    filters = ["tenant_id = :tenant_id", "coalesce(is_deleted, false) = false"]
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "limit": query.page_size,
        "offset": (query.page - 1) * query.page_size,
    }
    if query.company_id:
        assert_company_scope(context, query.company_id)
        filters.append("(company_id is null or company_id = :company_id)")
        params["company_id"] = query.company_id
    if query.category:
        filters.append("category = :category")
        params["category"] = query.category
    if query.active is not None:
        filters.append("active = :active")
        params["active"] = query.active
    if query.search:
        filters.append("(leave_type_name ilike :search or leave_type_key ilike :search)")
        params["search"] = f"%{query.search}%"
    sort = LEAVE_TYPE_SORT_COLUMNS.get(query.sort, "leave_type_name")
    direction = "asc" if query.direction.lower() == "asc" else "desc"
    result = await session.execute(
        text(
            f"""
            select *, count(*) over() as total_count
            from public.hr_leave_types
            where {" and ".join(filters)}
            order by case when company_id is null then 0 else 1 end, {sort} {direction}, id desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    rows = [row_to_dict(row) for row in result.mappings()]
    total = int(rows[0].pop("total_count")) if rows else 0
    for row in rows[1:]:
        row.pop("total_count", None)
    return ListResult(data=rows, meta=list_meta(query.page, query.page_size, total))


async def get_leave_type(
    session: AsyncSession,
    tenant_id: str,
    leave_type_id: str,
) -> dict[str, Any] | None:
    await ensure_hr_deepening_tables(session, leave_types=True)
    result = await session.execute(
        text(
            """
            select *
            from public.hr_leave_types
            where tenant_id = :tenant_id
              and id = :leave_type_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "leave_type_id": leave_type_id},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def create_leave_type(
    session: AsyncSession,
    context: dict[str, Any],
    request: LeaveTypeCreateRequest,
) -> dict[str, Any]:
    await ensure_hr_deepening_tables(session, leave_types=True)
    payload = request.model_dump()
    company_id = payload.get("company_id")
    if company_id:
        assert_company_scope(context, str(company_id), write=True)
        await assert_company_exists(session, context, str(company_id))
    result = await session.execute(
        text(
            """
            insert into public.hr_leave_types (
              tenant_id, company_id, leave_type_key, leave_type_name, category, paid,
              requires_document, requires_approval, affects_payroll, affects_attendance,
              default_days_per_year, carry_over_allowed, max_carry_over_days,
              negative_balance_allowed, active, notes, created_by, updated_by
            )
            values (
              :tenant_id, :company_id, :leave_type_key, :leave_type_name, :category,
              :paid, :requires_document, :requires_approval, :affects_payroll,
              :affects_attendance, :default_days_per_year, :carry_over_allowed,
              :max_carry_over_days, :negative_balance_allowed, :active, :notes,
              :user_id, :user_id
            )
            returning *
            """
        ),
        {"tenant_id": context["tenant_id"], "user_id": context.get("user_id"), **payload},
    )
    return row_to_dict(result.mappings().one())


async def update_leave_type(
    session: AsyncSession,
    context: dict[str, Any],
    leave_type_id: str,
    request: LeaveTypeUpdateRequest,
) -> dict[str, Any]:
    current = await get_leave_type(session, context["tenant_id"], leave_type_id)
    if not current:
        raise DomainError(
            "Izin turu bulunamadi.", "LEAVE_TYPE_NOT_FOUND", status.HTTP_404_NOT_FOUND
        )
    if current.get("company_id"):
        assert_company_scope(context, str(current["company_id"]), write=True)
    assert_version(current, request.base_version)
    payload = request.model_dump(exclude_unset=True, exclude={"base_version"})
    if payload.get("company_id"):
        assert_company_scope(context, str(payload["company_id"]), write=True)
    if not payload:
        return current
    assignments = [f"{key} = :{key}" for key in payload]
    assignments.extend(["updated_by = :user_id", "updated_at = now()", "version = version + 1"])
    result = await session.execute(
        text(
            f"""
            update public.hr_leave_types
            set {", ".join(assignments)}
            where tenant_id = :tenant_id
              and id = :leave_type_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "leave_type_id": leave_type_id,
            "user_id": context.get("user_id"),
            **payload,
        },
    )
    return row_to_dict(result.mappings().one())
