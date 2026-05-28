from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError
from app.core.security import RequestContext, require_access_context, require_tenant
from app.domains.branches.schemas import BranchCardUpdateRequest
from app.domains.branches.service import (
    delete_branch_draft_if_allowed,
    get_branch_detail,
    update_branch_card,
)
from app.projections.branch import list_branch_projection
from app.projections.query import projection_query_from_params
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])

RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("")
async def list_branch_records(
    context: RequestContextDep,
    session: SessionDep,
    company_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    search: str | None = Query(default=None),
    sort: str | None = Query(default=None),
    direction: str = Query(default="asc"),
    statuses: str | None = Query(default=None),
    branch_type: str | None = Query(default=None),
    city: str | None = Query(default=None),
    is_official_branch: bool | None = Query(default=None),
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    result = await list_branch_projection(
        session,
        projection_query_from_params(
            tenant_id=tenant_id,
            company_id=company_id,
            page=page,
            page_size=page_size,
            search=search,
            sort=sort,
            direction=direction,
            statuses=statuses,
            filters={
                "branch_type": branch_type,
                "city": city,
                "is_official_branch": is_official_branch,
            },
        ),
    )
    return ApiSuccess(
        data={
            "data": result.data,
            "meta": result.meta.model_dump(),
            "projection": result.projection.model_dump(),
        },
        warnings=result.warnings,
        message="Subeler listelendi.",
    )


@router.post("")
async def create_branch_record() -> ApiSuccess[dict[str, Any]]:
    raise DomainError(
        "Sube serbest kayit olarak olusturulamaz. Sube Acilisi sihirbazini kullanin.",
        "USE_BRANCH_OPENING_WIZARD",
        409,
    )


@router.get("/{branch_id}")
async def get_branch_record(
    branch_id: str,
    context: RequestContextDep,
    session: SessionDep,
) -> ApiSuccess[dict[str, Any]]:
    detail = await get_branch_detail(session, _context_map(context), branch_id)
    return ApiSuccess(data=_flatten_branch_detail(detail), message="Sube kaydi getirildi.")


@router.patch("/{branch_id}")
async def patch_branch_record(
    branch_id: str,
    payload: BranchCardUpdateRequest,
    context: RequestContextDep,
    session: SessionDep,
) -> ApiSuccess[dict[str, Any]]:
    detail = await update_branch_card(
        session,
        _context_map(context),
        branch_id,
        payload.model_dump(exclude_unset=True),
    )
    await session.commit()
    return ApiSuccess(
        data=_flatten_branch_detail(detail),
        message="Sube kart bilgileri guncellendi.",
    )


@router.delete("/{branch_id}")
async def delete_branch_record(
    branch_id: str,
    context: RequestContextDep,
    session: SessionDep,
) -> ApiSuccess[dict[str, Any]]:
    result = await delete_branch_draft_if_allowed(session, _context_map(context), branch_id)
    await session.commit()
    return ApiSuccess(data=result, message="Sube taslak kaydi silindi.")


def _context_map(context: RequestContext) -> dict[str, Any]:
    return {
        "tenant_id": require_tenant(context),
        "user_id": context.user_id,
        "permissions": list(context.permissions),
        "company_scope": context.company_scope,
        "company_scope_ids": context.company_scope_ids,
        "writable_company_scope_ids": context.writable_company_scope_ids,
        "branch_scope_ids": context.branch_scope_ids,
        "is_internal": context.is_internal,
        "is_trusted_proxy": context.is_trusted_proxy,
    }


def _flatten_branch_detail(detail: dict[str, Any]) -> dict[str, Any]:
    branch = dict(detail.get("branch") or {})
    company = detail.get("company")
    organization_unit = detail.get("organization_unit")
    facility = detail.get("facility")
    company_name = (company or {}).get("trade_name") or (company or {}).get("short_name") or ""
    facility_name = (facility or {}).get("name") or (facility or {}).get("facility_name") or ""
    authorities = detail.get("representative_authorities_summary") or {}
    return {
        **branch,
        "company": company,
        "company_name": company_name,
        "organization_unit": organization_unit,
        "organization_unit_name": (organization_unit or {}).get("name") or "",
        "facility": facility,
        "facility_name": facility_name,
        "representative_authorities_summary": authorities,
        "official_change_history": detail.get("official_change_history") or [],
        "warnings": detail.get("warnings") or [],
    }
