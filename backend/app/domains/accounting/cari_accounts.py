from __future__ import annotations

from decimal import Decimal
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.accounting.schemas import (
    CariAccountCreateRequest,
    CariAccountListQuery,
    CariAccountUpdateRequest,
    ListResult,
)
from app.domains.accounting.service import (
    assert_company_exists,
    assert_company_scope,
    assert_version,
    ensure_accounting_tables,
    json_dumps,
    json_list_dumps,
    list_meta,
    row_to_dict,
)

ACCOUNT_SORT_COLUMNS = {
    "account_code": "account_code",
    "account_name": "account_name",
    "cari_role": "cari_role",
    "current_balance": "current_balance",
    "risk_limit": "risk_limit",
    "record_status": "record_status",
    "city": "city",
    "updated_at": "updated_at",
    "created_at": "created_at",
}

ACCOUNT_MUTABLE_COLUMNS = {
    "account_code",
    "account_name",
    "account_type",
    "cari_role",
    "linked_entity_type",
    "linked_entity_id",
    "tax_number",
    "tax_office",
    "identity_number",
    "country",
    "city",
    "district",
    "address",
    "phone",
    "email",
    "iban",
    "bank_account_references",
    "currency",
    "opening_balance",
    "risk_limit",
    "payment_terms",
    "record_status",
    "notes",
    "metadata_json",
}

JSON_COLUMNS = {"metadata_json"}
JSON_LIST_COLUMNS = {"bank_account_references"}


async def list_cari_accounts(
    session: AsyncSession,
    context: dict[str, Any],
    query: CariAccountListQuery,
) -> ListResult:
    await ensure_accounting_tables(session, transactions=True)
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
    if query.cari_role:
        where.append("cari_role = :cari_role")
        params["cari_role"] = query.cari_role
    if query.record_status:
        where.append("record_status = :record_status")
        params["record_status"] = query.record_status
    if query.city:
        where.append("city = :city")
        params["city"] = query.city
    if query.balance_status == "debit":
        where.append("current_balance > 0")
    elif query.balance_status == "credit":
        where.append("current_balance < 0")
    elif query.balance_status == "zero":
        where.append("current_balance = 0")
    elif query.balance_status == "risk":
        where.append("risk_limit is not null and abs(current_balance) > risk_limit")
    if query.search:
        where.append(
            "(account_name ilike :search or account_code ilike :search or tax_number ilike :search)"
        )
        params["search"] = f"%{query.search}%"

    where_sql = " and ".join(where)
    sort_column = ACCOUNT_SORT_COLUMNS.get(query.sort, "account_name")
    direction = "desc" if query.direction.lower() == "desc" else "asc"
    count_result = await session.execute(
        text(f"select count(*) from public.accounting_cari_accounts where {where_sql}"),
        params,
    )
    total = int(count_result.scalar_one() or 0)
    result = await session.execute(
        text(
            f"""
            select *,
              (
                select max(transaction_date)
                from public.accounting_cari_transactions t
                where t.tenant_id = accounting_cari_accounts.tenant_id
                  and t.account_id = accounting_cari_accounts.id
                  and coalesce(t.is_deleted, false) = false
              ) as last_transaction_date
            from public.accounting_cari_accounts
            where {where_sql}
            order by {sort_column} {direction}, id desc
            limit :limit offset :offset
            """
        ),
        params,
    )
    return ListResult(
        data=[row_to_dict(row) for row in result.mappings().all()],
        meta=list_meta(query.page, query.page_size, total),
    )


async def get_cari_account(
    session: AsyncSession,
    tenant_id: str,
    account_id: str,
) -> dict[str, Any] | None:
    await ensure_accounting_tables(session)
    result = await session.execute(
        text(
            """
            select *
            from public.accounting_cari_accounts
            where tenant_id = :tenant_id
              and id = :account_id
              and coalesce(is_deleted, false) = false
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "account_id": account_id},
    )
    row = result.mappings().one_or_none()
    return row_to_dict(row) if row else None


async def create_cari_account(
    session: AsyncSession,
    context: dict[str, Any],
    request: CariAccountCreateRequest,
) -> dict[str, Any]:
    await ensure_accounting_tables(session)
    payload = request.model_dump(exclude_none=True)
    company_id = str(payload["company_id"])
    assert_company_scope(context, company_id, write=True)
    await assert_company_exists(session, context, company_id)
    await assert_unique_cari_account(session, context, payload)
    account_id = str(uuid4())
    account_code = payload.get("account_code") or await next_account_code(
        session,
        context["tenant_id"],
        company_id,
    )
    opening_balance = Decimal(str(payload.get("opening_balance") or "0"))
    result = await session.execute(
        text(
            """
            insert into public.accounting_cari_accounts (
              id, tenant_id, company_id, account_code, account_name, account_type, cari_role,
              linked_entity_type, linked_entity_id, tax_number, tax_office, identity_number,
              country, city, district, address, phone, email, iban, bank_account_references,
              currency, opening_balance, current_balance, risk_limit, payment_terms,
              record_status, notes, metadata_json, created_by, updated_by, created_at, updated_at,
              version, is_deleted
            )
            values (
              :id, :tenant_id, :company_id, :account_code, :account_name, :account_type, :cari_role,
              :linked_entity_type, :linked_entity_id, :tax_number, :tax_office, :identity_number,
              :country, :city, :district, :address, :phone, :email, :iban,
              cast(:bank_account_references as jsonb), :currency, :opening_balance,
              :current_balance, :risk_limit, :payment_terms, :record_status, :notes,
              cast(:metadata_json as jsonb), :created_by, :updated_by, now(), now(), 1, false
            )
            returning *
            """
        ),
        {
            **payload,
            "id": account_id,
            "tenant_id": context["tenant_id"],
            "account_code": account_code,
            "opening_balance": opening_balance,
            "current_balance": opening_balance,
            "bank_account_references": json_list_dumps(payload.get("bank_account_references")),
            "metadata_json": json_dumps(payload.get("metadata_json")),
            "created_by": context.get("user_id"),
            "updated_by": context.get("user_id"),
        },
    )
    return row_to_dict(result.mappings().one())


async def update_cari_account(
    session: AsyncSession,
    context: dict[str, Any],
    account_id: str,
    request: CariAccountUpdateRequest,
) -> dict[str, Any]:
    current = await get_cari_account(session, context["tenant_id"], account_id)
    if not current:
        raise DomainError(
            "Cari kart bulunamadi.",
            "CARI_ACCOUNT_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
        )
    await ensure_accounting_tables(session, transactions=True)
    assert_company_scope(context, str(current["company_id"]), write=True)
    payload = request.model_dump(exclude_unset=True, exclude_none=True)
    assert_version(current, payload.pop("base_version", None))
    patch = {key: value for key, value in payload.items() if key in ACCOUNT_MUTABLE_COLUMNS}
    if not patch:
        raise DomainError(
            "Guncellenecek cari kart alani bulunamadi.",
            "NO_CHANGED_FIELDS",
            status.HTTP_400_BAD_REQUEST,
        )
    await assert_unique_cari_account(session, context, {**current, **patch}, exclude_id=account_id)
    assignments: list[str] = []
    params: dict[str, Any] = {
        "tenant_id": context["tenant_id"],
        "account_id": account_id,
        "updated_by": context.get("user_id"),
    }
    for key, value in patch.items():
        if key in JSON_COLUMNS:
            assignments.append(f"{key} = cast(:{key} as jsonb)")
            params[key] = json_dumps(value)
        elif key in JSON_LIST_COLUMNS:
            assignments.append(f"{key} = cast(:{key} as jsonb)")
            params[key] = json_list_dumps(value)
        else:
            assignments.append(f"{key} = :{key}")
            params[key] = value
    assignments.extend(["updated_by = :updated_by", "updated_at = now()", "version = version + 1"])
    result = await session.execute(
        text(
            f"""
            update public.accounting_cari_accounts
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
            "Cari kart bulunamadi.",
            "CARI_ACCOUNT_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
        )
    return row_to_dict(row)


async def delete_cari_account(
    session: AsyncSession,
    context: dict[str, Any],
    account_id: str,
) -> dict[str, Any]:
    current = await get_cari_account(session, context["tenant_id"], account_id)
    if not current:
        raise DomainError(
            "Cari kart bulunamadi.",
            "CARI_ACCOUNT_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
        )
    assert_company_scope(context, str(current["company_id"]), write=True)
    count_result = await session.execute(
        text(
            """
            select count(*)
            from public.accounting_cari_transactions
            where tenant_id = :tenant_id
              and account_id = :account_id
              and coalesce(is_deleted, false) = false
            """
        ),
        {"tenant_id": context["tenant_id"], "account_id": account_id},
    )
    if int(count_result.scalar_one() or 0) > 0:
        raise DomainError(
            "Hareketi olan cari kart silinemez. "
            "Once hareketler iptal edilmeli veya mutabakatlanmalidir.",
            "CARI_ACCOUNT_HAS_TRANSACTIONS",
            status.HTTP_409_CONFLICT,
        )
    await session.execute(
        text(
            """
            update public.accounting_cari_accounts
            set is_deleted = true,
                record_status = 'passive',
                updated_by = :updated_by,
                updated_at = now(),
                version = version + 1
            where tenant_id = :tenant_id
              and id = :account_id
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "account_id": account_id,
            "updated_by": context.get("user_id"),
        },
    )
    return {"id": account_id, "deleted": True, "message": "Cari kart silindi."}


async def assert_unique_cari_account(
    session: AsyncSession,
    context: dict[str, Any],
    payload: dict[str, Any],
    *,
    exclude_id: str | None = None,
) -> None:
    exclude = "and id <> :exclude_id" if exclude_id else ""
    if payload.get("account_code"):
        result = await session.execute(
            text(
                f"""
                select id
                from public.accounting_cari_accounts
                where tenant_id = :tenant_id
                  and company_id = :company_id
                  and account_code = :account_code
                  and coalesce(is_deleted, false) = false
                  {exclude}
                limit 1
                """
            ),
            {
                "tenant_id": context["tenant_id"],
                "company_id": payload.get("company_id"),
                "account_code": payload.get("account_code"),
                "exclude_id": exclude_id,
            },
        )
        row = result.mappings().one_or_none()
        if row:
            raise DomainError(
                "Bu cari kodu ayni sirket icin zaten kullaniliyor.",
                "DUPLICATE_CARI_ACCOUNT_CODE",
                status.HTTP_409_CONFLICT,
                {"account_id": row["id"]},
            )

    linked_type = payload.get("linked_entity_type")
    linked_id = payload.get("linked_entity_id")
    if not linked_type or not linked_id or linked_type == "miscellaneous":
        return
    result = await session.execute(
        text(
            f"""
            select id
            from public.accounting_cari_accounts
            where tenant_id = :tenant_id
              and company_id = :company_id
              and linked_entity_type = :linked_entity_type
              and linked_entity_id = :linked_entity_id
              and coalesce(is_deleted, false) = false
              {exclude}
            limit 1
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "company_id": payload.get("company_id"),
            "linked_entity_type": linked_type,
            "linked_entity_id": linked_id,
            "exclude_id": exclude_id,
        },
    )
    row = result.mappings().one_or_none()
    if row:
        raise DomainError(
            "Bu kisi/kurum icin cari kart zaten var. "
            "Yeni kart yerine mevcut master baglantisini kullanin.",
            "DUPLICATE_LINKED_CARI_ACCOUNT",
            status.HTTP_409_CONFLICT,
            {"account_id": row["id"]},
        )


async def next_account_code(session: AsyncSession, tenant_id: str, company_id: str) -> str:
    result = await session.execute(
        text(
            """
            select count(*)
            from public.accounting_cari_accounts
            where tenant_id = :tenant_id
              and company_id = :company_id
            """
        ),
        {"tenant_id": tenant_id, "company_id": company_id},
    )
    next_number = int(result.scalar_one() or 0) + 1
    return f"CAR-{next_number:06d}"
