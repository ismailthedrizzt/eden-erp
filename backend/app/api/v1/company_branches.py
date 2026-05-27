from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import RequestContext, require_access_context, require_tenant
from app.domains.branches.operations import (
    build_branch_closing_precheck,
    build_branch_opening_precheck,
    close_branch,
    open_branch,
)
from app.domains.branches.schemas import BranchClosingRequest, BranchOpeningRequest
from app.schemas.common import ApiSuccess, OperationResponse, PrecheckResponse

router = APIRouter(dependencies=[Depends(require_access_context)])

RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get(
    "/companies/{company_id}/branch-openings/precheck", response_model=ApiSuccess[PrecheckResponse]
)
async def branch_opening_precheck(
    company_id: str,
    context: RequestContextDep,
    session: SessionDep,
    branch_name: str | None = Query(default=None),
    address: str | None = Query(default=None),
) -> ApiSuccess[PrecheckResponse]:
    tenant_id = require_tenant(context)
    precheck = await build_branch_opening_precheck(
        session,
        tenant_id=tenant_id,
        company_id=company_id,
        branch_name=branch_name,
        address=address,
    )
    return ApiSuccess(data=PrecheckResponse(**precheck), message=precheck["message"])


@router.post("/companies/{company_id}/branch-openings", response_model=OperationResponse)
async def complete_branch_opening(
    company_id: str,
    payload: BranchOpeningRequest,
    context: RequestContextDep,
    session: SessionDep,
) -> OperationResponse:
    tenant_id = require_tenant(context)
    result = await open_branch(
        session,
        tenant_id=tenant_id,
        user_id=context.user_id,
        company_id=company_id,
        request=payload,
        permissions=context.permissions,
        company_scope=context.company_scope_ids,
    )
    return OperationResponse(**result)


@router.get(
    "/companies/{company_id}/branch-closings/precheck", response_model=ApiSuccess[PrecheckResponse]
)
async def branch_closing_precheck(
    company_id: str,
    context: RequestContextDep,
    session: SessionDep,
    branch_id: str | None = Query(default=None),
) -> ApiSuccess[PrecheckResponse]:
    tenant_id = require_tenant(context)
    precheck = await build_branch_closing_precheck(
        session,
        tenant_id=tenant_id,
        company_id=company_id,
        branch_id=branch_id,
    )
    return ApiSuccess(data=PrecheckResponse(**precheck), message=precheck["message"])


@router.post("/companies/{company_id}/branch-closings", response_model=OperationResponse)
async def complete_branch_closing(
    company_id: str,
    payload: BranchClosingRequest,
    context: RequestContextDep,
    session: SessionDep,
) -> OperationResponse:
    tenant_id = require_tenant(context)
    result = await close_branch(
        session,
        tenant_id=tenant_id,
        user_id=context.user_id,
        company_id=company_id,
        request=payload,
        permissions=context.permissions,
        company_scope=context.company_scope_ids,
    )
    return OperationResponse(**result)
