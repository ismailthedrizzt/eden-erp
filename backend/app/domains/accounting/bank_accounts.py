from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.accounting.schemas import (
    BankAccountCreateRequest,
    BankAccountListQuery,
    BankAccountUpdateRequest,
    ListResult,
)
from app.domains.accounting.service import (
    BANK_ACCOUNT_TABLE,
    assert_company_exists,
    assert_company_scope,
    assert_version,
    ensure_accounting_deepening_tables,
    json_dumps,
    list_meta,
    row_to_financial_dict,
)

BANK_ACCOUNT_SORT_COLUMNS = {
    "bank_name": "bank_name",
    "account_name": "account_name",
    "currency": "currency",
    "account_type": "account_type",
    "current_balance": "current_balance",
    "last_import_at": "last_import_at",
    "updated_at": "updated_at",
    "created_at": "created_at",
}

BANK_ACCOUNT_MUTABLE_COLUMNS = {
    "bank_name",
    "bank_code",
    "branch_name",
    "branch_code",
    "account_name",
    "account_no",
    "iban",
    "currency",
    "account_type",
    "is_active",
    "opening_balance",
    "current_balance",
    "integration_status",
    "notes",
    "metadata_json",
}


async def list_bank_accounts(
    session: AsyncSession,
    context: dict[str, Any],
    query: BankAccountListQuery,
) -> ListResult:
    await ensure_accounting_deepening_tables(session, BANK_ACCOUNT_TABLE)
    where = ["tenant_id = :tenant_id", "coalesce(is_deleted, false) = false"]
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "limit": query.page_size,
        "offset": (query.page - 1) * query.page_size,
    }
    if query.company_id:
        assert_company_scope(context, query.company_id)
        where.append("company_id = :company_id")
        params["company_id"] = query.company_id
    elif context.get("company_scope_ids"):
        where.append("company_id = any(cast(:company_scope_ids as uuid[]))")
        params["company_scope_ids"] = context["company_scope_ids"]
    if query.account_type:
        where.append("account_type = :account_type")
        params["account_type"] = query.account_type
    if query.is_active is not None:
        where.append("is_active = :is_active")
        params["is_active"] = query.is_active
    if query.currency:
        where.append("currency = :currency")
        params["currency"] = query.currency.upper()
    if query.integration_status:
        where.append("integration_status = :integration_status")
        params["integration_status"] = query.integration_status
    if query.search:
        where.append(
            "(bank_name ilike :search or account_name ilike :search or iban ilike :search)"
        )
        params["search"] = f"%{query.search}%"

    where_sql = " and ".join(where)
    sort_column = BANK_ACCOUNT_SORT_COLUMNS.get(query.sort, "bank_name")
    direction = "desc" if query.direction.lower() == "desc" else "asc"
    total_result = await session.execute(
        text(f"select count(*) from public.accounting_bank_accounts where {where_sql}"),
        params,
    )
    result = await session.execute(
        text(
            f"""
            select *
            from public.accounting_bank_accounts
            where {where_sql}
            order by {sort_column} {direction}, id desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    total = int(total_result.scalar_one() or 0)
    return ListResult(
        data=[row_to_financial_dict(row) for row in result.mappings().all()],
        meta=list_meta(query.page, query.page_size, total),
    )


async def get_bank_account(
    session: AsyncSession,
    tenant_id: str,
    account_id: str,
) -> dict[str, Any] | None:
    await ensure_accounting_deepening_tables(session, BANK_ACCOUNT_TABLE)
    result = await session.execute(
        text(
            """
            select *
            from public.accounting_bank_accounts
            where tenant_id = :tenant_id
              and id = :account_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "account_id": account_id},
    )
    row = result.mappings().one_or_none()
    return row_to_financial_dict(row) if row else None


async def create_bank_account(
    session: AsyncSession,
    context: dict[str, Any],
    request: BankAccountCreateRequest,
) -> dict[str, Any]:
    await ensure_accounting_deepening_tables(session, BANK_ACCOUNT_TABLE)
    payload = request.model_dump(exclude_none=True)
    company_id = str(payload["company_id"])
    assert_company_scope(context, company_id, write=True)
    await assert_company_exists(session, context, company_id)
    await assert_unique_bank_account(session, context, payload)
    result = await session.execute(
        text(
            """
            insert into public.accounting_bank_accounts (
              id, tenant_id, company_id, bank_name, bank_code, branch_name, branch_code,
              account_name, account_no, iban, currency, account_type, is_active,
              opening_balance, current_balance, integration_status, notes, metadata_json,
              created_by, updated_by, created_at, updated_at, version, is_deleted
            )
            values (
              :id, :tenant_id, :company_id, :bank_name, :bank_code, :branch_name, :branch_code,
              :account_name, :account_no, :iban, :currency, :account_type, :is_active,
              :opening_balance, :current_balance, :integration_status, :notes,
              cast(:metadata_json as jsonb), :created_by, :updated_by, now(), now(), 1, false
            )
            returning *
            """
        ),
        {
            **payload,
            "id": str(uuid4()),
            "tenant_id": context["tenant_id"],
            "metadata_json": json_dumps(payload.get("metadata_json")),
            "created_by": context.get("user_id"),
            "updated_by": context.get("user_id"),
        },
    )
    return row_to_financial_dict(result.mappings().one())


async def update_bank_account(
    session: AsyncSession,
    context: dict[str, Any],
    account_id: str,
    request: BankAccountUpdateRequest,
) -> dict[str, Any]:
    current = await get_bank_account(session, context["tenant_id"], account_id)
    if not current:
        raise DomainError(
            "Banka hesabi bulunamadi.", "BANK_ACCOUNT_NOT_FOUND", status.HTTP_404_NOT_FOUND
        )
    assert_company_scope(context, str(current["company_id"]), write=True)
    payload = request.model_dump(exclude_unset=True, exclude_none=True)
    assert_version(current, payload.pop("base_version", None))
    patch = {key: value for key, value in payload.items() if key in BANK_ACCOUNT_MUTABLE_COLUMNS}
    if not patch:
        raise DomainError(
            "Guncellenecek banka hesabi alani bulunamadi.",
            "NO_CHANGED_FIELDS",
            status.HTTP_400_BAD_REQUEST,
        )
    await assert_unique_bank_account(session, context, {**current, **patch}, exclude_id=account_id)
    assignments: list[str] = []
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "account_id": account_id,
        "updated_by": context.get("user_id"),
    }
    for key, value in patch.items():
        if key == "metadata_json":
            assignments.append("metadata_json = cast(:metadata_json as jsonb)")
            params[key] = json_dumps(value)
        else:
            assignments.append(f"{key} = :{key}")
            params[key] = value
    assignments.extend(["updated_by = :updated_by", "updated_at = now()", "version = version + 1"])
    result = await session.execute(
        text(
            f"""
            update public.accounting_bank_accounts
            set {", ".join(assignments)}
            where tenant_id = :tenant_id
              and id = :account_id
              and coalesce(is_deleted, false) = false
            returning *
            """
        ),
        params,
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError(
            "Banka hesabi bulunamadi.", "BANK_ACCOUNT_NOT_FOUND", status.HTTP_404_NOT_FOUND
        )
    return row_to_financial_dict(row)


async def delete_bank_account(
    session: AsyncSession,
    context: dict[str, Any],
    account_id: str,
) -> dict[str, Any]:
    current = await get_bank_account(session, context["tenant_id"], account_id)
    if not current:
        raise DomainError(
            "Banka hesabi bulunamadi.", "BANK_ACCOUNT_NOT_FOUND", status.HTTP_404_NOT_FOUND
        )
    assert_company_scope(context, str(current["company_id"]), write=True)
    await session.execute(
        text(
            """
            update public.accounting_bank_accounts
            set is_deleted = true,
                is_active = false,
                updated_by = :updated_by,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id and id = :account_id
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "account_id": account_id,
            "updated_by": context.get("user_id"),
        },
    )
    return {"id": account_id, "deleted": True, "message": "Banka hesabi pasife alindi."}


async def assert_unique_bank_account(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
    *,
    exclude_id: str | None = None,
) -> None:
    iban = payload.get("iban")
    if not iban:
        return
    exclude = "and id <> :exclude_id" if exclude_id else ""
    result = await session.execute(
        text(
            f"""
            select id
            from public.accounting_bank_accounts
            where tenant_id = :tenant_id
              and company_id = :company_id
              and iban = :iban
              and coalesce(is_deleted, false) = false
              {exclude}
            limit 1
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "company_id": payload.get("company_id"),
            "iban": iban,
            "exclude_id": exclude_id,
        },
    )
    row = result.mappings().one_or_none()
    if row:
        raise DomainError(
            "Bu IBAN ayni sirket icin zaten kullaniliyor.",
            "DUPLICATE_BANK_ACCOUNT_IBAN",
            status.HTTP_409_CONFLICT,
            {"account_id": row["id"]},
        )
