from __future__ import annotations

import json
from collections.abc import Mapping
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.operations.service import table_exists

HR_MODULE_KEY = "hr"
EMPLOYEE_TABLE = "public.hr_employees"
EMPLOYMENT_RECORD_TABLE = "public.hr_employment_records"
EMPLOYMENT_TRANSACTION_TABLE = "public.hr_employment_transactions"
DOCUMENT_TABLE = "public.hr_employee_documents"

VIEW_PERMISSION = "hr.view"
EDIT_PERMISSION = "hr.edit"
EMPLOYEE_CREATE_PERMISSION = "hr.employeeCreate"
EMPLOYMENT_START_PERMISSION = "hr.employmentStart"
EMPLOYMENT_TERMINATE_PERMISSION = "hr.employmentTerminate"
ASSIGNMENT_CHANGE_PERMISSION = "hr.assignmentChange"
DOCUMENTS_MANAGE_PERMISSION = "hr.documentsManage"
SENSITIVE_VIEW_PERMISSION = "hr.sensitiveView"

CONTROLLED_EMPLOYEE_FIELDS = {
    "company_id",
    "branch_id",
    "organization_unit_id",
    "position_id",
    "job_title",
    "employment_status",
    "employment_type",
    "start_date",
    "end_date",
    "termination_reason",
    "sgk_status",
    "sgk_workplace_registry_no",
    "work_location_type",
    "manager_employee_id",
    "salary_type",
    "currency",
}


def json_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=False, default=str)


def json_list_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else [], ensure_ascii=False, default=str)


def row_to_dict(row: Any) -> dict[str, Any]:
    return {key: normalize_value(value) for key, value in dict(row).items()}


def normalize_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return value
    if isinstance(value, (date, datetime)):
        return value
    return value


def list_meta(page: int, page_size: int, total: int) -> dict[str, int]:
    total_pages = max(1, (total + page_size - 1) // page_size)
    return {"page": page, "pageSize": page_size, "total": total, "totalPages": total_pages}


async def ensure_hr_tables(
    session: AsyncSession,
    *,
    employment: bool = False,
    documents: bool = False,
) -> None:
    if not await table_exists(session, EMPLOYEE_TABLE):
        raise DomainError(
            "IK calisan altyapisi hazir degil. Kurulum Merkezi'nden IK modulunu tamamlayin.",
            "HR_EMPLOYEES_MISSING",
            status.HTTP_409_CONFLICT,
            {"module_key": HR_MODULE_KEY},
        )
    if employment and not await table_exists(session, EMPLOYMENT_RECORD_TABLE):
        raise DomainError(
            "IK istihdam kaydi altyapisi hazir degil. Kurulum Merkezi'nden IK modulunu tamamlayin.",
            "HR_EMPLOYMENT_RECORDS_MISSING",
            status.HTTP_409_CONFLICT,
            {"module_key": HR_MODULE_KEY},
        )
    if employment and not await table_exists(session, EMPLOYMENT_TRANSACTION_TABLE):
        raise DomainError(
            "IK istihdam islem altyapisi hazir degil. Kurulum Merkezi'nden IK modulunu tamamlayin.",
            "HR_EMPLOYMENT_TRANSACTIONS_MISSING",
            status.HTTP_409_CONFLICT,
            {"module_key": HR_MODULE_KEY},
        )
    if documents and not await table_exists(session, DOCUMENT_TABLE):
        raise DomainError(
            "IK ozluk belge altyapisi hazir degil. Kurulum Merkezi'nden IK modulunu tamamlayin.",
            "HR_EMPLOYEE_DOCUMENTS_MISSING",
            status.HTTP_409_CONFLICT,
            {"module_key": HR_MODULE_KEY},
        )


def assert_company_scope(context: dict[str, Any], company_id: str, *, write: bool = False) -> None:
    scope_key = "writable_company_scope_ids" if write else "company_scope_ids"
    scope = context.get(scope_key) or context.get("company_scope_ids")
    if scope and str(company_id) not in {str(item) for item in scope}:
        raise DomainError(
            "Bu kayit erisim kapsaminiz disinda.",
            "COMPANY_SCOPE_DENIED",
            status.HTTP_403_FORBIDDEN,
            {"company_id": company_id},
        )


async def assert_company_exists(
    session: AsyncSession,
    context: dict[str, Any],
    company_id: str,
    *,
    active_required: bool = False,
) -> dict[str, Any] | None:
    if not await table_exists(session, "public.companies"):
        return None
    result = await session.execute(
        text(
            """
            select id, record_status, company_status, is_deleted
            from public.companies
            where tenant_id = :tenant_id
              and id = :company_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "company_id": company_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError(
            "Bagli sirket kaydi bulunamadi.",
            "COMPANY_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
            {"company_id": company_id},
        )
    company = row_to_dict(row)
    if active_required and str(company.get("record_status") or "").lower() in {"draft", "taslak"}:
        raise DomainError(
            "Ise giris yalnizca aktif sirketlerde baslatilabilir.",
            "COMPANY_NOT_ACTIVE",
            status.HTTP_409_CONFLICT,
            {"company_id": company_id},
        )
    return company


async def assert_branch_valid(
    session: AsyncSession,
    context: dict[str, Any],
    branch_id: str | None,
    company_id: str,
) -> dict[str, Any] | None:
    if not branch_id or not await table_exists(session, "public.company_branches"):
        return None
    result = await session.execute(
        text(
            """
            select id, company_id, branch_name, branch_short_name, record_status, status
            from public.company_branches
            where tenant_id = :tenant_id
              and id = :branch_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "branch_id": branch_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Sube kaydi bulunamadi.", "BRANCH_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    branch = row_to_dict(row)
    if str(branch.get("company_id")) != str(company_id):
        raise DomainError(
            "Secilen sube bu sirkete bagli degil.",
            "BRANCH_COMPANY_MISMATCH",
            status.HTTP_409_CONFLICT,
        )
    status_value = str(branch.get("record_status") or branch.get("status") or "").lower()
    if status_value in {"closed", "passive", "pasif", "kapali", "deleted"}:
        raise DomainError(
            "Kapali veya pasif subeye yeni aktif istihdam baglanamaz.",
            "BRANCH_NOT_ACTIVE",
            status.HTTP_409_CONFLICT,
        )
    return branch


async def assert_organization_unit_valid(
    session: AsyncSession,
    context: dict[str, Any],
    organization_unit_id: str | None,
    company_id: str,
) -> dict[str, Any] | None:
    if not organization_unit_id or not await table_exists(session, "public.organization_units"):
        return None
    result = await session.execute(
        text(
            """
            select id, company_id, name, short_name, status, active
            from public.organization_units
            where tenant_id = :tenant_id
              and id = :organization_unit_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "organization_unit_id": organization_unit_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError(
            "Organizasyon birimi bulunamadi.",
            "ORGANIZATION_UNIT_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
        )
    unit = row_to_dict(row)
    if str(unit.get("company_id")) != str(company_id):
        raise DomainError(
            "Secilen organizasyon birimi bu sirkete bagli degil.",
            "ORGANIZATION_UNIT_COMPANY_MISMATCH",
            status.HTTP_409_CONFLICT,
        )
    status_value = str(unit.get("status") or "active").lower()
    if unit.get("active") is False or status_value in {"closed", "passive", "pasif", "kapali"}:
        raise DomainError(
            "Kapali veya pasif organizasyon birimine aktif istihdam baglanamaz.",
            "ORGANIZATION_UNIT_NOT_ACTIVE",
            status.HTTP_409_CONFLICT,
        )
    return unit


async def assert_position_valid(
    session: AsyncSession,
    context: dict[str, Any],
    position_id: str | None,
    company_id: str,
    organization_unit_id: str | None = None,
) -> dict[str, Any] | None:
    if not position_id or not await table_exists(session, "public.positions"):
        return None
    result = await session.execute(
        text(
            """
            select p.id, p.unit_id, p.title, p.status, ou.company_id
            from public.positions p
            join public.organization_units ou
              on ou.id = p.unit_id and ou.tenant_id = :tenant_id
            where p.id = :position_id
              and coalesce(p.is_deleted, false) = false
              and coalesce(ou.is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "position_id": position_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Pozisyon bulunamadi.", "POSITION_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    position = row_to_dict(row)
    if str(position.get("company_id")) != str(company_id):
        raise DomainError(
            "Secilen pozisyon bu sirkete bagli degil.",
            "POSITION_COMPANY_MISMATCH",
            status.HTTP_409_CONFLICT,
        )
    if organization_unit_id and str(position.get("unit_id")) != str(organization_unit_id):
        raise DomainError(
            "Secilen pozisyon secilen organizasyon birimi altinda degil.",
            "POSITION_UNIT_MISMATCH",
            status.HTTP_409_CONFLICT,
        )
    if str(position.get("status") or "active").lower() in {"closed", "passive", "pasif", "kapali"}:
        raise DomainError(
            "Kapali veya pasif pozisyona aktif istihdam baglanamaz.",
            "POSITION_NOT_ACTIVE",
            status.HTTP_409_CONFLICT,
        )
    return position


def assert_version(current: Mapping[str, Any], base_version: int | None) -> None:
    if base_version is None:
        return
    if int(current.get("version") or 0) != int(base_version):
        raise DomainError(
            "Kayit baska bir islem tarafindan guncellendi. Lutfen kaydi yenileyin.",
            "VERSION_CONFLICT",
            status.HTTP_409_CONFLICT,
        )


def reject_controlled_employee_patch(payload: dict[str, Any]) -> None:
    blocked = sorted(CONTROLLED_EMPLOYEE_FIELDS.intersection(payload.keys()))
    if not blocked:
        return
    raise DomainError(
        "Istihdam, pozisyon, SGK ve ise giris/cikis bilgileri calisan kartindan "
        "dogrudan degistirilemez. Ilgili IK islemini baslatin.",
        "HR_EMPLOYMENT_FIELD_LOCKED",
        status.HTTP_409_CONFLICT,
        {"fields": blocked},
    )
