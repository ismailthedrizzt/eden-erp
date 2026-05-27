from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, get_request_context, require_tenant
from app.domains.process.approvals import approve, create_approval, list_pending_approvals, reject
from app.domains.process.schemas import ApprovalDecisionRequest, CreateApprovalRequest
from app.schemas.common import ApiSuccess

router = APIRouter()

RequestContextDep = Annotated[RequestContext, Depends(get_request_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


def _context(tenant_id: str, user_id: str | None) -> dict[str, Any]:
    return {"tenant_id": tenant_id, "user_id": user_id, "module_key": "process"}


@router.get("")
async def list_approval_records(
    session: SessionDep,
    context: RequestContextDep,
    status: str = Query(default="pending"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[list[dict[str, Any]]]:
    tenant_id = require_tenant(context)
    try:
        rows, count = await list_pending_approvals(
            session,
            _context(tenant_id, context.user_id),
            {"status": status, "limit": page_size, "offset": (page - 1) * page_size},
        )
        return ApiSuccess(data=rows, meta={"count": count, "page": page, "pageSize": page_size})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("")
async def create_approval_record(
    request: CreateApprovalRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await create_approval(session, _context(tenant_id, context.user_id), request)
        return ApiSuccess(data=row, message="Onay talebi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/{approval_id}/approve")
async def approve_record(
    approval_id: str,
    request: ApprovalDecisionRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await approve(session, _context(tenant_id, context.user_id), approval_id, request)
        return ApiSuccess(data=row, message="Onay verildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/{approval_id}/reject")
async def reject_record(
    approval_id: str,
    request: ApprovalDecisionRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await reject(session, _context(tenant_id, context.user_id), approval_id, request)
        return ApiSuccess(data=row, message="Onay reddedildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error
