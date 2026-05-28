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

CRM_MODULE_KEY = "crm"
MASTER_PERSON_TABLE = "public.master_persons"
MASTER_ORGANIZATION_TABLE = "public.master_organizations"
STAKEHOLDER_TABLE = "public.crm_stakeholders"
INTERACTION_TABLE = "public.crm_interactions"


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
    return {
        "page": page,
        "pageSize": page_size,
        "total": total,
        "totalPages": max(1, (total + page_size - 1) // page_size),
    }


async def ensure_crm_tables(session: AsyncSession, *, master: bool = False, stakeholders: bool = False, interactions: bool = False) -> None:
    if master:
        if not await table_exists(session, MASTER_PERSON_TABLE) or not await table_exists(session, MASTER_ORGANIZATION_TABLE):
            raise DomainError(
                "CRM master data altyapisi hazir degil. Kurulum Merkezi'nden CRM/Paydaslar modulunu tamamlayin.",
                "CRM_MASTER_DATA_MISSING",
                status.HTTP_409_CONFLICT,
                {"module_key": CRM_MODULE_KEY},
            )
    if stakeholders and not await table_exists(session, STAKEHOLDER_TABLE):
        raise DomainError(
            "CRM paydas altyapisi hazir degil. Kurulum Merkezi'nden CRM/Paydaslar modulunu tamamlayin.",
            "CRM_STAKEHOLDERS_MISSING",
            status.HTTP_409_CONFLICT,
            {"module_key": CRM_MODULE_KEY},
        )
    if interactions and not await table_exists(session, INTERACTION_TABLE):
        raise DomainError(
            "CRM etkilesim altyapisi hazir degil. Kurulum Merkezi'nden CRM/Paydaslar modulunu tamamlayin.",
            "CRM_INTERACTIONS_MISSING",
            status.HTTP_409_CONFLICT,
            {"module_key": CRM_MODULE_KEY},
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


async def assert_company_exists(session: AsyncSession, context: dict[str, Any], company_id: str) -> None:
    if not await table_exists(session, "public.companies"):
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
        raise DomainError("Bagli sirket kaydi bulunamadi.", "COMPANY_NOT_FOUND", status.HTTP_404_NOT_FOUND, {"company_id": company_id})


def assert_version(current: Mapping[str, Any], base_version: int | None) -> None:
    if base_version is None:
        return
    if int(current.get("version") or 0) != int(base_version):
        raise DomainError("Kayit baska bir islem tarafindan guncellendi. Lutfen kaydi yenileyin.", "VERSION_CONFLICT", status.HTTP_409_CONFLICT)


def mask_identity(value: str | None) -> str | None:
    if not value:
        return None
    text_value = str(value)
    if len(text_value) <= 4:
        return "*" * len(text_value)
    return f"{text_value[:2]}{'*' * max(2, len(text_value) - 4)}{text_value[-2:]}"


def stakeholder_cari_role(stakeholder_type: str) -> str:
    if stakeholder_type == "customer":
        return "customer"
    if stakeholder_type == "supplier":
        return "supplier"
    if stakeholder_type == "customer_supplier":
        return "both"
    if stakeholder_type == "public_institution":
        return "public_institution"
    return "stakeholder"


def stakeholder_account_type(stakeholder_type: str) -> str:
    if stakeholder_type == "customer_supplier":
        return "customer_supplier"
    role = stakeholder_cari_role(stakeholder_type)
    return role if role in {"customer", "supplier", "public_institution", "stakeholder"} else "other"
