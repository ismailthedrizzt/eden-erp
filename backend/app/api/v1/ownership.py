from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.company.service import get_company_by_id
from app.domains.ownership.current import get_current_ownership_for_company
from app.domains.ownership.schemas import OwnershipTransactionRequest
from app.domains.ownership.transactions import perform_ownership_transaction
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])

RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


class OwnershipTransactionRecordResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    company_id: str | None = None
    transaction_no: str | None = None
    transaction_type: str | None = None
    approval_status: str | None = None
    workflow_status: str | None = None
    operation_id: str | None = None
    process_instance_id: str | None = None


class OwnershipTransactionListResponse(BaseModel):
    data: list[OwnershipTransactionRecordResponse]
    meta: dict[str, Any] = Field(default_factory=dict)


class OwnershipTransactionMutationResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    transaction: dict[str, Any] | None = None
    transactions: list[dict[str, Any]] = Field(default_factory=list)
    partner: dict[str, Any] | None = None
    company: dict[str, Any] | None = None
    current_ownership: list[dict[str, Any]] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


@router.get("/current", response_model=ApiSuccess[list[dict[str, Any]]])
async def get_current_ownership(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str = Query(...),
) -> ApiSuccess[list[dict[str, Any]]]:
    tenant_id = require_tenant(context)
    company = await get_company_by_id(session, tenant_id, company_id)
    if not company:
        raise domain_error_to_http(
            DomainError("Sirket kaydi bulunamadi.", "COMPANY_NOT_FOUND", 404)
        )
    try:
        rows = await get_current_ownership_for_company(session, tenant_id, company_id)
        return ApiSuccess(data=[row.model_dump(mode="json") for row in rows])
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/transactions", response_model=ApiSuccess[OwnershipTransactionListResponse])
async def list_ownership_transactions(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[OwnershipTransactionListResponse]:
    ensure_permission(context, "partners.lifecycle.read")
    tenant_id = require_tenant(context)
    where = ["tenant_id = :tenant_id"]
    params: dict[str, Any] = {
        "tenant_id": tenant_id,
        "limit": page_size,
        "offset": (page - 1) * page_size,
    }
    if company_id:
        where.append("company_id = :company_id")
        params["company_id"] = company_id
    where_sql = " and ".join(where)
    result = await session.execute(
        text(
            f"""
            select *
            from public.ownership_transactions
            where {where_sql}
            order by effective_date desc nulls last, created_at desc nulls last
            limit :limit offset :offset
            """
        ),
        params,
    )
    rows = [dict(row) for row in result.mappings()]
    return ApiSuccess(data={"data": rows, "meta": {"page": page, "pageSize": page_size, "count": len(rows)}})


@router.get("/transactions/approved", response_model=ApiSuccess[list[OwnershipTransactionRecordResponse]])
async def approved_ownership_transactions(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str = Query(...),
) -> ApiSuccess[list[OwnershipTransactionRecordResponse]]:
    ensure_permission(context, "partners.lifecycle.read")
    tenant_id = require_tenant(context)
    result = await session.execute(
        text(
            """
            select *
            from public.ownership_transactions
            where tenant_id = :tenant_id
              and company_id = :company_id
              and approval_status = 'approved'
              and workflow_status = 'approved'
            order by effective_date desc nulls last, created_at desc nulls last
            """
        ),
        {"tenant_id": tenant_id, "company_id": company_id},
    )
    return ApiSuccess(data=[dict(row) for row in result.mappings()])


@router.get("/transactions/{transaction_id}", response_model=ApiSuccess[OwnershipTransactionRecordResponse])
async def get_ownership_transaction(
    transaction_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[OwnershipTransactionRecordResponse]:
    ensure_permission(context, "partners.lifecycle.read")
    tenant_id = require_tenant(context)
    result = await session.execute(
        text(
            """
            select *
            from public.ownership_transactions
            where tenant_id = :tenant_id
              and id = :transaction_id
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "transaction_id": transaction_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise domain_error_to_http(
            DomainError("Ortaklik islemi bulunamadi.", "OWNERSHIP_TRANSACTION_NOT_FOUND", 404)
        )
    return ApiSuccess(data=dict(row))


@router.post("/transactions", response_model=ApiSuccess[OwnershipTransactionMutationResponse])
async def create_ownership_transaction(
    session: SessionDep,
    context: RequestContextDep,
    request: OwnershipTransactionRequest,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "partners.lifecycle.manage")
    tenant_id = require_tenant(context)
    service_context = {
        "tenant_id": tenant_id,
        "user_id": context.user_id,
        "company_id": request.company_id,
        "module_key": "ownership",
        "permissions": context.permissions,
        "company_scope": context.company_scope_ids,
    }
    try:
        result = await perform_ownership_transaction(session, service_context, request)
        return ApiSuccess(**result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


def ensure_permission(context: RequestContext, permission_key: str) -> None:
    if not has_permission(context, permission_key):
        raise DomainError(
            "Bu islem icin yetkiniz bulunmuyor.",
            "PERMISSION_DENIED",
            status.HTTP_403_FORBIDDEN,
        )


@router.post("/initial-partnership-entry")
async def initial_partnership_entry(
    session: SessionDep,
    context: RequestContextDep,
    payload: dict[str, Any],
) -> ApiSuccess[dict[str, Any]]:
    request = OwnershipTransactionRequest(
        **{**payload, "transaction_type": "initial_partnership_entry"}
    )
    return await create_ownership_transaction(session, context, request)


@router.post("/share-transfer")
async def share_transfer(
    session: SessionDep,
    context: RequestContextDep,
    payload: dict[str, Any],
) -> ApiSuccess[dict[str, Any]]:
    request = OwnershipTransactionRequest(**{**payload, "transaction_type": "share_transfer"})
    return await create_ownership_transaction(session, context, request)


@router.post("/ownership-exit")
async def ownership_exit(
    session: SessionDep,
    context: RequestContextDep,
    payload: dict[str, Any],
) -> ApiSuccess[dict[str, Any]]:
    request = OwnershipTransactionRequest(**{**payload, "transaction_type": "ownership_exit"})
    return await create_ownership_transaction(session, context, request)


@router.post("/correction")
async def correction_entry(
    session: SessionDep,
    context: RequestContextDep,
    payload: dict[str, Any],
) -> ApiSuccess[dict[str, Any]]:
    request = OwnershipTransactionRequest(**{**payload, "transaction_type": "correction_entry"})
    return await create_ownership_transaction(session, context, request)


@router.post("/reversal")
async def reversal_entry(
    session: SessionDep,
    context: RequestContextDep,
    payload: dict[str, Any],
) -> ApiSuccess[dict[str, Any]]:
    request = OwnershipTransactionRequest(**{**payload, "transaction_type": "reversal_entry"})
    return await create_ownership_transaction(session, context, request)
