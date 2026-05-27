from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.policies.schemas import AccessContext


async def _resolve_company_id(
    session: AsyncSession,
    table: str,
    record_id: str,
) -> str | None:
    result = await session.execute(
        text(
            f"""
            select company_id
            from public.{table}
            where id = :record_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"record_id": record_id},
    )
    row = result.mappings().one_or_none()
    return str(row["company_id"]) if row and row.get("company_id") else None


def _company_scope_allowed(context: AccessContext, company_id: str | None) -> bool:
    if not company_id:
        return False
    if not context.company_scope:
        return True
    return company_id in context.company_scope


async def can_access_company(
    session: AsyncSession,
    context: AccessContext,
    company_id: str,
) -> bool:
    _ = session
    return bool(context.tenant_id) and _company_scope_allowed(context, company_id)


async def can_write_company(session: AsyncSession, context: AccessContext, company_id: str) -> bool:
    return await can_access_company(session, context, company_id)


async def resolve_branch_company(session: AsyncSession, branch_id: str) -> str | None:
    return await _resolve_company_id(session, "company_branches", branch_id)


async def resolve_facility_company(session: AsyncSession, facility_id: str) -> str | None:
    return await _resolve_company_id(session, "facilities", facility_id)


async def resolve_unit_company(session: AsyncSession, unit_id: str) -> str | None:
    return await _resolve_company_id(session, "organization_units", unit_id)


async def can_access_branch(session: AsyncSession, context: AccessContext, branch_id: str) -> bool:
    company_id = await resolve_branch_company(session, branch_id)
    return _company_scope_allowed(context, company_id)


async def can_write_branch(session: AsyncSession, context: AccessContext, branch_id: str) -> bool:
    return await can_access_branch(session, context, branch_id)


async def can_access_organization_unit(
    session: AsyncSession,
    context: AccessContext,
    unit_id: str,
) -> bool:
    company_id = await resolve_unit_company(session, unit_id)
    return _company_scope_allowed(context, company_id)


async def can_write_organization_unit(
    session: AsyncSession,
    context: AccessContext,
    unit_id: str,
) -> bool:
    return await can_access_organization_unit(session, context, unit_id)


async def can_access_facility(
    session: AsyncSession,
    context: AccessContext,
    facility_id: str,
) -> bool:
    company_id = await resolve_facility_company(session, facility_id)
    return _company_scope_allowed(context, company_id)


async def can_write_facility(
    session: AsyncSession,
    context: AccessContext,
    facility_id: str,
) -> bool:
    return await can_access_facility(session, context, facility_id)


def assert_same_company_scope(items: list[dict[str, Any]]) -> str | None:
    company_ids = {str(item.get("company_id")) for item in items if item.get("company_id")}
    if len(company_ids) > 1:
        raise DomainError(
            "Secilen kayitlar ayni sirket kapsaminda degil.",
            "COMPANY_SCOPE_MISMATCH",
            409,
        )
    return next(iter(company_ids), None)
