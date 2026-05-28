# ruff: noqa: E501
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.import_export.schemas import ValidationIssue
from app.domains.operations.service import table_exists


@dataclass(slots=True)
class DuplicateResult:
    duplicate: bool
    issues: list[ValidationIssue]


def duplicate_key(entity_type: str, row: dict[str, Any]) -> str | None:
    if entity_type == "cari_account":
        return _join(row.get("company_id"), row.get("account_code")) or _join(row.get("company_id"), row.get("tax_number"))
    if entity_type == "stakeholder":
        if row.get("master_entity_type") == "person":
            return _join("person", row.get("nationality"), row.get("identity_number")) or _join("person", row.get("nationality"), row.get("passport_no"))
        return _join("organization", row.get("country"), row.get("tax_number")) or _join("organization", row.get("trade_name"), row.get("city"))
    if entity_type == "product_catalog":
        return _join(row.get("product_code")) or _join(row.get("brand"), row.get("model"))
    if entity_type == "employee_draft":
        return _join(row.get("company_id"), row.get("employee_no")) or _join(row.get("identity_number"))
    if entity_type == "facility":
        return _join(row.get("company_id"), row.get("name"))
    if entity_type == "organization_unit":
        return _join(row.get("company_id"), row.get("parent_unit_id"), row.get("name"))
    if entity_type == "company_draft":
        return _join(row.get("tax_number")) or _join(row.get("trade_name"), row.get("city"))
    if entity_type in {"partner_draft", "representative_draft"}:
        return _join(row.get("company_id"), row.get("identity_number")) or _join(row.get("company_id"), row.get("tax_number"))
    return None


async def detect_existing_duplicate(
    session: AsyncSession,
    tenant_id: str,
    entity_type: str,
    row: dict[str, Any],
    row_number: int,
) -> DuplicateResult:
    duplicate_id = await _find_existing_id(session, tenant_id, entity_type, row)
    if not duplicate_id:
        return DuplicateResult(duplicate=False, issues=[])
    return DuplicateResult(
        duplicate=True,
        issues=[
            ValidationIssue(
                row_number=row_number,
                field=None,
                code="EXISTING_RECORD_DUPLICATE",
                message="Benzer veya ayni ana kayit zaten mevcut.",
                suggested_fix="Satiri atlayin veya tekil kayit ekranindan kontrollu guncelleyin.",
                original_value={"existing_id": duplicate_id},
            )
        ],
    )


def detect_file_duplicate(
    seen: set[str],
    entity_type: str,
    row: dict[str, Any],
    row_number: int,
) -> DuplicateResult:
    key = duplicate_key(entity_type, row)
    if not key:
        return DuplicateResult(duplicate=False, issues=[])
    if key in seen:
        return DuplicateResult(
            duplicate=True,
            issues=[
                ValidationIssue(
                    row_number=row_number,
                    field=None,
                    code="FILE_ROW_DUPLICATE",
                    message="Dosya icinde ayni duplicate anahtarina sahip satir var.",
                    suggested_fix="Tek kayit birakin veya satirlari ayristirin.",
                    original_value=key,
                )
            ],
        )
    seen.add(key)
    return DuplicateResult(duplicate=False, issues=[])


async def _find_existing_id(
    session: AsyncSession,
    tenant_id: str,
    entity_type: str,
    row: dict[str, Any],
) -> str | None:
    if entity_type == "cari_account":
        return await _scalar_existing(
            session,
            "public.accounting_cari_accounts",
            """
            tenant_id = :tenant_id and company_id = cast(:company_id as uuid)
            and coalesce(is_deleted, false) = false
            and (
              (:account_code is not null and account_code = :account_code)
              or (:tax_number is not null and tax_number = :tax_number)
            )
            """,
            {
                "tenant_id": tenant_id,
                "company_id": row.get("company_id"),
                "account_code": row.get("account_code"),
                "tax_number": row.get("tax_number"),
            },
        )
    if entity_type == "product_catalog":
        return await _scalar_existing(
            session,
            "public.product_catalog",
            "tenant_id = :tenant_id and coalesce(is_deleted, false) = false and product_code = :product_code",
            {"tenant_id": tenant_id, "product_code": row.get("product_code")},
        ) if row.get("product_code") else None
    if entity_type == "employee_draft":
        return await _scalar_existing(
            session,
            "public.hr_employees",
            """
            tenant_id = :tenant_id and company_id = cast(:company_id as uuid)
            and coalesce(is_deleted, false) = false
            and (
              (:employee_no is not null and employee_no = :employee_no)
              or (:identity_number is not null and identity_number = :identity_number)
            )
            """,
            {
                "tenant_id": tenant_id,
                "company_id": row.get("company_id"),
                "employee_no": row.get("employee_no"),
                "identity_number": row.get("identity_number"),
            },
        )
    if entity_type == "facility":
        return await _scalar_existing(
            session,
            "public.company_facilities",
            "tenant_id = :tenant_id and company_id = cast(:company_id as uuid) and lower(facility_name) = lower(:name) and coalesce(is_deleted, false) = false",
            {"tenant_id": tenant_id, "company_id": row.get("company_id"), "name": row.get("name")},
        )
    if entity_type == "organization_unit":
        return await _scalar_existing(
            session,
            "public.organization_units",
            """
            tenant_id = :tenant_id and company_id = cast(:company_id as uuid)
            and lower(name) = lower(:name)
            and coalesce(parent_unit_id::text, '') = coalesce(:parent_unit_id, '')
            and coalesce(is_deleted, false) = false
            """,
            {
                "tenant_id": tenant_id,
                "company_id": row.get("company_id"),
                "name": row.get("name"),
                "parent_unit_id": row.get("parent_unit_id"),
            },
        )
    if entity_type == "company_draft":
        return await _scalar_existing(
            session,
            "public.companies",
            """
            tenant_id = :tenant_id and coalesce(is_deleted, false) = false
            and (
              (:tax_number is not null and tax_number = :tax_number)
              or (:trade_name is not null and lower(trade_name) = lower(:trade_name))
            )
            """,
            {"tenant_id": tenant_id, "tax_number": row.get("tax_number"), "trade_name": row.get("trade_name")},
        )
    return None


async def _scalar_existing(
    session: AsyncSession,
    table_name: str,
    where_sql: str,
    params: dict[str, Any],
) -> str | None:
    if not await table_exists(session, table_name):
        return None
    result = await session.execute(
        text(f"select id from {table_name} where {where_sql} limit 1"),
        params,
    )
    row = result.mappings().one_or_none()
    return str(row["id"]) if row else None


def _join(*parts: Any) -> str | None:
    values = [str(part).strip().lower() for part in parts if str(part or "").strip()]
    if len(values) != len(parts):
        return None
    return "|".join(values)
