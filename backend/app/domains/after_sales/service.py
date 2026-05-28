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
from app.domains.products.service import add_months, warranty_status_for

AFTER_SALES_MODULE_KEY = "after_sales"
ASSET_TABLE = "public.after_sales_installed_assets"
REQUEST_TABLE = "public.after_sales_service_requests"
RECORD_TABLE = "public.after_sales_service_records"

AFTER_SALES_VIEW_PERMISSION = "afterSales.view"
AFTER_SALES_EDIT_PERMISSION = "afterSales.edit"
AFTER_SALES_ASSET_CREATE_PERMISSION = "afterSales.assetCreate"
AFTER_SALES_REQUEST_CREATE_PERMISSION = "afterSales.requestCreate"
AFTER_SALES_REQUEST_ASSIGN_PERMISSION = "afterSales.requestAssign"
AFTER_SALES_SERVICE_RECORD_CREATE_PERMISSION = "afterSales.serviceRecordCreate"
AFTER_SALES_SERVICE_COMPLETE_PERMISSION = "afterSales.serviceComplete"
AFTER_SALES_ADMIN_PERMISSION = "afterSales.admin"


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


async def ensure_after_sales_tables(session: AsyncSession, *, assets: bool = False, requests: bool = False, records: bool = False) -> None:
    if assets and not await table_exists(session, ASSET_TABLE):
        raise DomainError("Kurulu urun altyapisi hazir degil.", "AFTER_SALES_ASSETS_TABLE_MISSING", status.HTTP_409_CONFLICT, {"module_key": AFTER_SALES_MODULE_KEY})
    if requests and not await table_exists(session, REQUEST_TABLE):
        raise DomainError("Servis talebi altyapisi hazir degil.", "AFTER_SALES_REQUESTS_TABLE_MISSING", status.HTTP_409_CONFLICT, {"module_key": AFTER_SALES_MODULE_KEY})
    if records and not await table_exists(session, RECORD_TABLE):
        raise DomainError("Servis kaydi altyapisi hazir degil.", "AFTER_SALES_RECORDS_TABLE_MISSING", status.HTTP_409_CONFLICT, {"module_key": AFTER_SALES_MODULE_KEY})


def assert_company_scope(context: dict[str, Any], company_id: str, *, write: bool = False) -> None:
    scope_key = "writable_company_scope_ids" if write else "company_scope_ids"
    scope = context.get(scope_key) or context.get("company_scope_ids")
    if scope and str(company_id) not in {str(item) for item in scope}:
        raise DomainError("Bu kayit erisim kapsaminiz disinda.", "COMPANY_SCOPE_DENIED", status.HTTP_403_FORBIDDEN, {"company_id": company_id})


async def assert_company_exists(session: AsyncSession, context: dict[str, Any], company_id: str) -> None:
    if not await table_exists(session, "public.companies"):
        return
    result = await session.execute(
        text(
            """
            select id
            from public.companies
            where tenant_id = :tenant_id and id = :company_id and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "company_id": company_id},
    )
    if not result.mappings().one_or_none():
        raise DomainError("Bagli sirket kaydi bulunamadi.", "COMPANY_NOT_FOUND", status.HTTP_404_NOT_FOUND)


async def assert_branch_valid(session: AsyncSession, context: dict[str, Any], branch_id: str | None, company_id: str) -> None:
    if not branch_id or not await table_exists(session, "public.company_branches"):
        return
    result = await session.execute(
        text(
            """
            select id, company_id
            from public.company_branches
            where tenant_id = :tenant_id and id = :branch_id and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "branch_id": branch_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Sube kaydi bulunamadi.", "BRANCH_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    if str(row["company_id"]) != str(company_id):
        raise DomainError("Secilen sube bu sirkete bagli degil.", "BRANCH_COMPANY_MISMATCH", status.HTTP_409_CONFLICT)


async def assert_facility_valid(session: AsyncSession, context: dict[str, Any], facility_id: str | None, company_id: str) -> None:
    if not facility_id or not await table_exists(session, "public.company_facilities"):
        return
    result = await session.execute(
        text(
            """
            select id, company_id
            from public.company_facilities
            where tenant_id = :tenant_id and id = :facility_id and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": context["tenant_id"], "facility_id": facility_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Tesis/lokasyon bulunamadi.", "FACILITY_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    if str(row["company_id"]) != str(company_id):
        raise DomainError("Secilen tesis/lokasyon bu sirkete bagli degil.", "FACILITY_COMPANY_MISMATCH", status.HTTP_409_CONFLICT)


def assert_version(current: Mapping[str, Any], base_version: int | None) -> None:
    if base_version is None:
        return
    if int(current.get("version") or 0) != int(base_version):
        raise DomainError("Kayit baska bir islem tarafindan guncellendi. Lutfen kaydi yenileyin.", "VERSION_CONFLICT", status.HTTP_409_CONFLICT)


async def get_serviceable_product(session: AsyncSession, tenant_id: str, product_id: str, *, require_after_sales: bool = False) -> dict[str, Any]:
    if not await table_exists(session, "public.product_catalog"):
        raise DomainError("Urun/Hizmet katalog altyapisi hazir degil.", "PRODUCT_CATALOG_TABLE_MISSING", status.HTTP_409_CONFLICT)
    result = await session.execute(
        text(
            """
            select *
            from public.product_catalog
            where tenant_id = :tenant_id and id = :product_id and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "product_id": product_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Urun/Hizmet kaydi bulunamadi.", "PRODUCT_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    product = row_to_dict(row)
    if require_after_sales and not bool(product.get("after_sales_enabled")):
        raise DomainError("Bu urun satis sonrasi envanter kaydinda kullanilamaz.", "PRODUCT_AFTER_SALES_DISABLED", status.HTTP_409_CONFLICT)
    return product


def derive_warranty(product: Mapping[str, Any], installation_date: date | None, warranty_start_date: date | None, warranty_end_date: date | None, warranty_status: str | None) -> tuple[date | None, date | None, str]:
    start = warranty_start_date or installation_date
    end = warranty_end_date or (add_months(start, int(product.get("warranty_months") or 0)) if start else None)
    status_value = warranty_status or warranty_status_for(end)
    return start, end, status_value


async def create_project_task_for_service(session: AsyncSession, context: dict[str, Any], *, company_id: str, title: str, description: str | None, priority: str, assignee_user_id: str | None, assignee_employee_id: str | None, related_entity_type: str, related_entity_id: str, due_date: date | None = None) -> dict[str, Any] | None:
    if not await table_exists(session, "public.project_tasks"):
        return None
    result = await session.execute(
        text(
            """
            select count(*) + 1 as next_no
            from public.project_tasks
            where tenant_id = :tenant_id
            """
        ),
        {"tenant_id": context["tenant_id"]},
    )
    issue_key = f"SRV-{int(result.mappings().one()['next_no']):06d}"
    inserted = await session.execute(
        text(
            """
            insert into public.project_tasks (
              tenant_id, company_id, issue_key, title, description, issue_type, status,
              priority, assignee_user_id, assignee_employee_id, reporter_user_id, due_date,
              related_module, related_entity_type, related_entity_id, labels, metadata_json,
              created_by, updated_by
            )
            values (
              :tenant_id, :company_id, :issue_key, :title, :description, 'support', 'todo',
              :priority, :assignee_user_id, :assignee_employee_id, :reporter_user_id, :due_date,
              'after_sales', :related_entity_type, :related_entity_id, :labels, cast(:metadata_json as jsonb),
              :user_id, :user_id
            )
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "company_id": company_id,
            "issue_key": issue_key,
            "title": title,
            "description": description,
            "priority": priority,
            "assignee_user_id": assignee_user_id,
            "assignee_employee_id": assignee_employee_id,
            "reporter_user_id": context.get("user_id"),
            "due_date": due_date,
            "related_entity_type": related_entity_type,
            "related_entity_id": related_entity_id,
            "labels": ["after-sales", "service"],
            "metadata_json": json_dumps({"source": "after_sales"}),
            "user_id": context.get("user_id"),
        },
    )
    return row_to_dict(inserted.mappings().one())
