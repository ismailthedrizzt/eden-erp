from __future__ import annotations

from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.accounting.cari_accounts import (
    create_cari_account,
    delete_cari_account,
    get_cari_account,
    list_cari_accounts,
    update_cari_account,
)
from app.domains.accounting.cari_transactions import (
    create_cari_transaction,
    delete_cari_transaction,
    get_cari_account_summary,
    get_cari_transaction,
    get_company_accounting_summary,
    list_cari_transactions,
    update_cari_transaction,
)
from app.domains.accounting.schemas import (
    CariAccountCreateRequest,
    CariAccountListQuery,
    CariAccountUpdateRequest,
    CariTransactionCreateRequest,
    CariTransactionListQuery,
    CariTransactionUpdateRequest,
)
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]
DateFromQuery = Annotated[date | None, Query(alias="dateFrom")]
DateToQuery = Annotated[date | None, Query(alias="dateTo")]


@router.get("/cari-accounts", response_model=ApiSuccess[dict[str, Any]])
async def list_accounts(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    cari_role: str | None = Query(default=None),
    record_status: str | None = Query(default=None),
    balance_status: str | None = Query(default=None),
    city: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    sort: str = Query(default="account_name"),
    direction: str = Query(default="asc"),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.view")
    tenant_id = require_tenant(context)
    try:
        result = await list_cari_accounts(
            session,
            service_context(context, tenant_id),
            CariAccountListQuery(
                company_id=company_id,
                cari_role=cari_role,
                record_status=record_status,
                balance_status=balance_status,
                city=city,
                search=search,
                page=page,
                page_size=page_size,
                sort=sort,
                direction=direction,
            ),
        )
        return ApiSuccess(data={"data": result.data, "meta": result.meta})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/cari-accounts", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def create_account(
    request: CariAccountCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            account = await create_cari_account(
                session,
                service_context(context, tenant_id),
                request,
            )
        return ApiSuccess(data=account, message="Cari kart olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/cari-accounts/{account_id}", response_model=ApiSuccess[dict[str, Any]])
async def get_account(
    account_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.view")
    tenant_id = require_tenant(context)
    try:
        account = await get_cari_account(session, tenant_id, account_id)
        if not account:
            raise DomainError("Cari kart bulunamadi.", "CARI_ACCOUNT_NOT_FOUND", 404)
        return ApiSuccess(data=account)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/cari-accounts/{account_id}", response_model=ApiSuccess[dict[str, Any]])
async def update_account(
    account_id: str,
    payload: CariAccountUpdateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            account = await update_cari_account(
                session,
                service_context(context, tenant_id),
                account_id,
                payload,
            )
        return ApiSuccess(data=account, message="Cari kart guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.delete("/cari-accounts/{account_id}", response_model=ApiSuccess[dict[str, Any]])
async def delete_account(
    account_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await delete_cari_account(
                session,
                service_context(context, tenant_id),
                account_id,
            )
        return ApiSuccess(data=result, message=result.get("message"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/cari-accounts/{account_id}/summary", response_model=ApiSuccess[dict[str, Any]])
async def get_account_summary(
    account_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.view")
    tenant_id = require_tenant(context)
    try:
        summary = await get_cari_account_summary(
            session,
            service_context(context, tenant_id),
            account_id,
        )
        return ApiSuccess(data=summary.model_dump())
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/company/{company_id}/summary", response_model=ApiSuccess[dict[str, Any]])
async def get_company_summary(
    company_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.view")
    tenant_id = require_tenant(context)
    try:
        summary = await get_company_accounting_summary(
            session,
            service_context(context, tenant_id),
            company_id,
        )
        return ApiSuccess(data=summary.model_dump())
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/cari-transactions", response_model=ApiSuccess[dict[str, Any]])
async def list_transactions(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    account_id: str | None = Query(default=None),
    transaction_type: str | None = Query(default=None),
    direction: str | None = Query(default=None),
    date_from: DateFromQuery = None,
    date_to: DateToQuery = None,
    document_status: str | None = Query(default=None),
    payment_method: str | None = Query(default=None),
    category: str | None = Query(default=None),
    reconciliation_status: str | None = Query(default=None),
    status_value: str | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    sort: str = Query(default="transaction_date"),
    sort_direction: str = Query(default="desc", alias="sortDirection"),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.view")
    tenant_id = require_tenant(context)
    try:
        result = await list_cari_transactions(
            session,
            service_context(context, tenant_id),
            CariTransactionListQuery(
                company_id=company_id,
                account_id=account_id,
                transaction_type=transaction_type,
                direction=direction,
                date_from=date_from,
                date_to=date_to,
                document_status=document_status,
                payment_method=payment_method,
                category=category,
                reconciliation_status=reconciliation_status,
                status=status_value,
                search=search,
                page=page,
                page_size=page_size,
                sort=sort,
                direction_sort=sort_direction,
            ),
        )
        return ApiSuccess(data={"data": result.data, "meta": result.meta})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/cari-transactions", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def create_transaction(
    request: CariTransactionCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.transactionCreate")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            transaction = await create_cari_transaction(
                session,
                service_context(context, tenant_id),
                request,
            )
        return ApiSuccess(data=transaction, message="Cari hareket olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/cari-transactions/{transaction_id}", response_model=ApiSuccess[dict[str, Any]])
async def get_transaction(
    transaction_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.view")
    tenant_id = require_tenant(context)
    try:
        transaction = await get_cari_transaction(session, tenant_id, transaction_id)
        if not transaction:
            raise DomainError("Cari hareket bulunamadi.", "CARI_TRANSACTION_NOT_FOUND", 404)
        return ApiSuccess(data=transaction)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/cari-transactions/{transaction_id}", response_model=ApiSuccess[dict[str, Any]])
async def update_transaction(
    transaction_id: str,
    payload: CariTransactionUpdateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            transaction = await update_cari_transaction(
                session,
                service_context(context, tenant_id),
                transaction_id,
                payload,
            )
        message = (
            "Cari hareket iptal edildi."
            if transaction.get("status") == "cancelled"
            else "Cari hareket guncellendi."
        )
        return ApiSuccess(data=transaction, message=message)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.delete("/cari-transactions/{transaction_id}", response_model=ApiSuccess[dict[str, Any]])
async def delete_transaction(
    transaction_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "accounting.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await delete_cari_transaction(
                session,
                service_context(context, tenant_id),
                transaction_id,
            )
        return ApiSuccess(data=result, message=result.get("message"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


def ensure_permission(context: RequestContext, permission_key: str) -> None:
    if not has_permission(context, permission_key):
        raise DomainError(
            "Bu islem icin yetkiniz bulunmuyor.",
            "PERMISSION_DENIED",
            status.HTTP_403_FORBIDDEN,
        )


def service_context(context: RequestContext, tenant_id: str) -> dict[str, Any]:
    return {
        "tenant_id": tenant_id,
        "user_id": context.user_id,
        "permissions": context.permissions,
        "company_scope_ids": context.company_scope_ids,
        "writable_company_scope_ids": context.writable_company_scope_ids,
    }
