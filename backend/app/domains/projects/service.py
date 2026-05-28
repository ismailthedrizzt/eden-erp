# ruff: noqa: E501

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

PROJECT_MODULE_KEY = "project_management"
PROJECT_TABLE = "public.project_projects"
TASK_TABLE = "public.project_tasks"
COMMENT_TABLE = "public.project_task_comments"
ATTACHMENT_TABLE = "public.project_task_attachments"
HISTORY_TABLE = "public.project_task_history"

PROJECT_VIEW_PERMISSION = "projects.view"
PROJECT_EDIT_PERMISSION = "projects.edit"
PROJECT_CREATE_PERMISSION = "projects.create"
PROJECT_DELETE_PERMISSION = "projects.delete"
PROJECT_ADMIN_PERMISSION = "projects.admin"
TASK_VIEW_PERMISSION = "tasks.view"
TASK_CREATE_PERMISSION = "tasks.create"
TASK_EDIT_PERMISSION = "tasks.edit"
TASK_ASSIGN_PERMISSION = "tasks.assign"
TASK_TRANSITION_PERMISSION = "tasks.transition"
TASK_COMMENT_PERMISSION = "tasks.comment"
TASK_ATTACHMENTS_PERMISSION = "tasks.attachmentsManage"
TASK_DELETE_PERMISSION = "tasks.delete"

OPEN_TASK_STATUSES = {"backlog", "todo", "in_progress", "blocked", "review"}
FINAL_TASK_STATUSES = {"done", "cancelled"}
FINAL_PROJECT_STATUSES = {"completed", "cancelled"}


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


async def ensure_project_tables(
    session: AsyncSession,
    *,
    tasks: bool = False,
    comments: bool = False,
    attachments: bool = False,
    history: bool = False,
) -> None:
    if not await table_exists(session, PROJECT_TABLE):
        raise DomainError(
            "Proje altyapisi hazir degil. Kurulum Merkezi'nden Proje ve Gorevler modulunu tamamlayin.",
            "PROJECTS_TABLE_MISSING",
            status.HTTP_409_CONFLICT,
            {"module_key": PROJECT_MODULE_KEY},
        )
    if tasks and not await table_exists(session, TASK_TABLE):
        raise DomainError(
            "Proje gorevi altyapisi hazir degil. Kurulum Merkezi'nden Proje ve Gorevler modulunu tamamlayin.",
            "PROJECT_TASKS_TABLE_MISSING",
            status.HTTP_409_CONFLICT,
            {"module_key": PROJECT_MODULE_KEY},
        )
    if comments and not await table_exists(session, COMMENT_TABLE):
        raise DomainError(
            "Gorev yorum altyapisi hazir degil.",
            "PROJECT_TASK_COMMENTS_TABLE_MISSING",
            status.HTTP_409_CONFLICT,
        )
    if attachments and not await table_exists(session, ATTACHMENT_TABLE):
        raise DomainError(
            "Gorev ek altyapisi hazir degil.",
            "PROJECT_TASK_ATTACHMENTS_TABLE_MISSING",
            status.HTTP_409_CONFLICT,
        )
    if history and not await table_exists(session, HISTORY_TABLE):
        raise DomainError(
            "Gorev gecmis altyapisi hazir degil.",
            "PROJECT_TASK_HISTORY_TABLE_MISSING",
            status.HTTP_409_CONFLICT,
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
    return row_to_dict(row)


async def assert_branch_valid(
    session: AsyncSession,
    context: dict[str, Any],
    branch_id: str | None,
    company_id: str,
) -> None:
    if not branch_id or not await table_exists(session, "public.company_branches"):
        return
    result = await session.execute(
        text(
            """
            select id, company_id, record_status, status
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
    if str(row["company_id"]) != str(company_id):
        raise DomainError(
            "Secilen sube bu sirkete bagli degil.",
            "BRANCH_COMPANY_MISMATCH",
            status.HTTP_409_CONFLICT,
        )


async def assert_organization_unit_valid(
    session: AsyncSession,
    context: dict[str, Any],
    organization_unit_id: str | None,
    company_id: str,
) -> None:
    if not organization_unit_id or not await table_exists(session, "public.organization_units"):
        return
    result = await session.execute(
        text(
            """
            select id, company_id, status, active
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
    if str(row["company_id"]) != str(company_id):
        raise DomainError(
            "Secilen organizasyon birimi bu sirkete bagli degil.",
            "ORGANIZATION_UNIT_COMPANY_MISMATCH",
            status.HTTP_409_CONFLICT,
        )


async def assert_facility_valid(
    session: AsyncSession,
    context: dict[str, Any],
    facility_id: str | None,
    company_id: str,
) -> None:
    if not facility_id or not await table_exists(session, "public.company_facilities"):
        return
    result = await session.execute(
        text(
            """
            select id, company_id, status, record_status
            from public.company_facilities
            where tenant_id = :tenant_id
              and id = :facility_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "facility_id": facility_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Tesis/lokasyon bulunamadi.", "FACILITY_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    if str(row["company_id"]) != str(company_id):
        raise DomainError(
            "Secilen tesis/lokasyon bu sirkete bagli degil.",
            "FACILITY_COMPANY_MISMATCH",
            status.HTTP_409_CONFLICT,
        )


def assert_version(current: Mapping[str, Any], base_version: int | None) -> None:
    if base_version is None:
        return
    if int(current.get("version") or 0) != int(base_version):
        raise DomainError(
            "Kayit baska bir islem tarafindan guncellendi. Lutfen kaydi yenileyin.",
            "VERSION_CONFLICT",
            status.HTTP_409_CONFLICT,
        )


def status_is_final(value: object) -> bool:
    return str(value or "") in FINAL_TASK_STATUSES


def task_is_open(value: object) -> bool:
    return str(value or "") in OPEN_TASK_STATUSES
