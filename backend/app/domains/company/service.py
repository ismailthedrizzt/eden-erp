from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError


COMPANY_ACTIVE_VALUES = {"active", "aktif", "opened", "open"}
COMPANY_BLOCKED_VALUES = {"draft", "taslak", "liquidation", "tasfiye", "deregistered", "terkin", "passive", "closed"}


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


def get_company_lifecycle(company: dict[str, Any] | None) -> str:
    if not company:
        return "unknown"
    if company.get("is_deleted") is True:
        return "deregistered"
    return str(company.get("record_status") or company.get("company_status") or "draft").lower()


def assert_company_active(company: dict[str, Any] | None) -> None:
    lifecycle = get_company_lifecycle(company)
    if not company:
        raise DomainError("Şirket kaydı bulunamadı.", "COMPANY_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    if lifecycle not in COMPANY_ACTIVE_VALUES:
        raise DomainError(
            message="Şube işlemi yalnızca aktif şirketlerde başlatılabilir.",
            code="COMPANY_NOT_ACTIVE",
            status_code=status.HTTP_409_CONFLICT,
            details={"record_status": company.get("record_status"), "company_status": company.get("company_status")},
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
