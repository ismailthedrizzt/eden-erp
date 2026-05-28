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

PRODUCT_MODULE_KEY = "product_services"
PRODUCT_TABLE = "public.product_catalog"

PRODUCT_VIEW_PERMISSION = "products.view"
PRODUCT_CREATE_PERMISSION = "products.create"
PRODUCT_EDIT_PERMISSION = "products.edit"
PRODUCT_DELETE_PERMISSION = "products.delete"


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


async def ensure_product_table(session: AsyncSession) -> None:
    if not await table_exists(session, PRODUCT_TABLE):
        raise DomainError(
            "Urun/Hizmet katalog altyapisi hazir degil. Kurulum Merkezi'nden Urun ve Hizmetler modulunu tamamlayin.",
            "PRODUCT_CATALOG_TABLE_MISSING",
            status.HTTP_409_CONFLICT,
            {"module_key": PRODUCT_MODULE_KEY},
        )


def assert_company_scope(context: dict[str, Any], company_id: str | None, *, write: bool = False) -> None:
    if not company_id:
        return
    scope_key = "writable_company_scope_ids" if write else "company_scope_ids"
    scope = context.get(scope_key) or context.get("company_scope_ids")
    if scope and str(company_id) not in {str(item) for item in scope}:
        raise DomainError(
            "Bu kayit erisim kapsaminiz disinda.",
            "COMPANY_SCOPE_DENIED",
            status.HTTP_403_FORBIDDEN,
            {"company_id": company_id},
        )


async def assert_company_exists(session: AsyncSession, context: dict[str, Any], company_id: str | None) -> None:
    if not company_id or not await table_exists(session, "public.companies"):
        return
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
        {"tenant_id": context["tenant_id"], "company_id": company_id},
    )
    if not result.mappings().one_or_none():
        raise DomainError("Bagli sirket kaydi bulunamadi.", "COMPANY_NOT_FOUND", status.HTTP_404_NOT_FOUND)


def assert_version(current: Mapping[str, Any], base_version: int | None) -> None:
    if base_version is None:
        return
    if int(current.get("version") or 0) != int(base_version):
        raise DomainError(
            "Kayit baska bir islem tarafindan guncellendi. Lutfen kaydi yenileyin.",
            "VERSION_CONFLICT",
            status.HTTP_409_CONFLICT,
        )


def add_months(value: date, months: int | None) -> date | None:
    if not months:
        return None
    month = value.month - 1 + months
    year = value.year + month // 12
    month = month % 12 + 1
    day = min(value.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
    return date(year, month, day)


def warranty_status_for(warranty_end_date: date | None, today: date | None = None) -> str:
    if not warranty_end_date:
        return "unknown"
    current = today or date.today()
    return "in_warranty" if current <= warranty_end_date else "out_of_warranty"
