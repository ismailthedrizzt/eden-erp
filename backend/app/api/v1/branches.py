from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
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


class BranchRecordResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    tenant_id: str | None = None
    company_id: str | None = None
    branch_name: str | None = None
    branch_short_name: str | None = None
    record_status: str | None = None
    document_files: list[dict[str, Any]] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class BranchListResponse(BaseModel):
    data: list[BranchRecordResponse]
    meta: dict[str, Any]
    projection: dict[str, Any] | None = None


@router.get("", response_model=ApiSuccess[BranchListResponse])
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
    ensure_permission(context, "branches.read")
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


@router.get("/{branch_id}", response_model=ApiSuccess[BranchRecordResponse])
async def get_branch_record(
    branch_id: str,
    context: RequestContextDep,
    session: SessionDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "branches.read")
    detail = await get_branch_detail(session, _context_map(context), branch_id)
    return ApiSuccess(data=_flatten_branch_detail(detail), message="Sube kaydi getirildi.")


@router.patch("/{branch_id}", response_model=ApiSuccess[BranchRecordResponse])
async def patch_branch_record(
    branch_id: str,
    payload: BranchCardUpdateRequest,
    context: RequestContextDep,
    session: SessionDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "branches.update")
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


@router.post("/{branch_id}/documents", response_model=ApiSuccess[BranchRecordResponse])
async def update_branch_documents(
    branch_id: str,
    payload: BranchCardUpdateRequest,
    context: RequestContextDep,
    session: SessionDep,
) -> ApiSuccess[BranchRecordResponse]:
    ensure_permission(context, "branches.documents.manage")
    detail = await update_branch_card(
        session,
        _context_map(context),
        branch_id,
        payload.model_dump(exclude_unset=True),
    )
    await session.commit()
    return ApiSuccess(
        data=_flatten_branch_detail(detail),
        message="Sube belgeleri guncellendi.",
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


def ensure_permission(context: RequestContext, permission_key: str) -> None:
    if not has_permission(context, permission_key):
        raise DomainError(
            "Bu islem icin yetkiniz bulunmuyor.",
            "PERMISSION_DENIED",
            status.HTTP_403_FORBIDDEN,
        )
