from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.operations.service import table_exists


def _status(record: dict[str, Any], *fields: str) -> str:
    for field in fields:
        value = str(record.get(field) or "").strip().lower()
        if value:
            return value
    return "draft"


def _is_draft(record: dict[str, Any], *fields: str) -> bool:
    return _status(record, *fields) in {"draft", "taslak"}


async def _count_rows(
    session: AsyncSession,
    table_name: str,
    where_sql: str,
    params: dict[str, Any],
) -> int:
    if not await table_exists(session, f"public.{table_name}"):
        return 0
    result = await session.execute(
        text(f"select count(*) as count from public.{table_name} where {where_sql}"),
        params,
    )
    return int(result.mappings().one()["count"] or 0)


async def has_related_records(
    session: AsyncSession,
    entity_type: str,
    entity_id: str,
    *,
    tenant_id: str,
) -> bool:
    if entity_type == "company":
        checks = [
            (
                "company_partners",
                "tenant_id = :tenant_id and company_id = :entity_id "
                "and coalesce(is_deleted, false) = false",
            ),
            (
                "company_representatives",
                "tenant_id = :tenant_id and company_id = :entity_id "
                "and coalesce(is_deleted, false) = false",
            ),
            (
                "company_branches",
                "tenant_id = :tenant_id and company_id = :entity_id "
                "and coalesce(is_deleted, false) = false",
            ),
            ("company_lifecycle_events", "tenant_id = :tenant_id and company_id = :entity_id"),
            (
                "company_official_change_transactions",
                "tenant_id = :tenant_id and company_id = :entity_id "
                "and coalesce(is_deleted, false) = false",
            ),
            (
                "ownership_transactions",
                "tenant_id = :tenant_id and company_id = :entity_id "
                "and coalesce(is_deleted, false) = false",
            ),
        ]
    elif entity_type == "company_partner":
        checks = [
            (
                "ownership_transactions",
                "tenant_id = :tenant_id and coalesce(is_deleted, false) = false and "
                "(affected_partner_id = :entity_id or from_partner_id = :entity_id "
                "or to_partner_id = :entity_id)",
            ),
            (
                "partner_ownership_lifecycle_events",
                "tenant_id = :tenant_id and partner_id = :entity_id",
            ),
            ("v_current_ownership", "tenant_id = :tenant_id and partner_id = :entity_id"),
        ]
    elif entity_type == "company_representative":
        checks = [
            (
                "company_representative_authority_transactions",
                "tenant_id = :tenant_id and representative_id = :entity_id "
                "and coalesce(is_deleted, false) = false",
            ),
            (
                "v_current_representative_authorities",
                "tenant_id = :tenant_id and representative_id = :entity_id",
            ),
        ]
    else:
        checks = []

    params = {"tenant_id": tenant_id, "entity_id": entity_id}
    for table_name, where_sql in checks:
        if await _count_rows(session, table_name, where_sql, params) > 0:
            return True
    return False


async def can_hard_delete_company_draft(
    session: AsyncSession,
    company: dict[str, Any],
    *,
    tenant_id: str,
) -> None:
    if not _is_draft(company, "record_status", "company_status"):
        raise DomainError(
            "Aktif veya resmi surece girmis sirket dogrudan silinemez. "
            "Terkin/Tasfiye islemini kullanin.",
            "COMPANY_DELETE_REQUIRES_OFFICIAL_OPERATION",
            409,
        )
    if await has_related_records(session, "company", str(company["id"]), tenant_id=tenant_id):
        raise DomainError(
            "Iliskili kayitlari olan taslak sirket dogrudan silinemez.",
            "COMPANY_DELETE_HAS_RELATED_RECORDS",
            409,
        )


async def can_hard_delete_partner_draft(
    session: AsyncSession,
    partner: dict[str, Any],
    *,
    tenant_id: str,
) -> None:
    if not _is_draft(partner, "record_status", "status"):
        raise DomainError(
            "Aktif veya islem gecmisi olan ortak dogrudan silinemez. "
            "Ortakliktan Cikis/Pay Devri islemini kullanin.",
            "PARTNER_DELETE_REQUIRES_OWNERSHIP_EXIT",
            409,
        )
    if await has_related_records(
        session, "company_partner", str(partner["id"]), tenant_id=tenant_id
    ):
        raise DomainError(
            "Islem gecmisi olan ortak dogrudan silinemez.",
            "PARTNER_DELETE_HAS_OWNERSHIP_HISTORY",
            409,
        )


async def can_hard_delete_representative_draft(
    session: AsyncSession,
    representative: dict[str, Any],
    *,
    tenant_id: str,
) -> None:
    if not _is_draft(representative, "record_status", "status"):
        raise DomainError(
            "Aktif veya islem gecmisi olan temsilci dogrudan silinemez. "
            "Sonlandirma islemini kullanin.",
            "REPRESENTATIVE_DELETE_REQUIRES_TERMINATION",
            409,
        )
    if await has_related_records(
        session, "company_representative", str(representative["id"]), tenant_id=tenant_id
    ):
        raise DomainError(
            "Islem gecmisi olan temsilci dogrudan silinemez.",
            "REPRESENTATIVE_DELETE_HAS_AUTHORITY_HISTORY",
            409,
        )
