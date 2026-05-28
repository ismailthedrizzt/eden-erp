from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, require_access_context, require_tenant
from app.domains.organization.schemas import (
    OrganizationPositionCreateRequest,
    OrganizationUnitCreateRequest,
    OrganizationUnitUpdateRequest,
)
from app.domains.organization.service import (
    create_organization_unit,
    create_position_for_unit,
    get_organization_unit_detail,
    get_unit_dependents_summary,
    list_organization_unit_types,
    list_organization_units,
    list_positions_for_organization,
    update_organization_unit_card,
)
from app.domains.representatives.service import list_authorities_for_company
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])

RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("/units", response_model=ApiSuccess[dict[str, Any]])
async def list_units(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page_size: int = Query(default=100, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    ctx = _context_map(context)
    rows = await list_organization_units(
        session,
        ctx,
        {"company_id": company_id, "search": search, "limit": page_size},
    )
    positions = await list_positions_for_organization(
        session,
        ctx,
        {"company_id": company_id, "limit": 500},
    )
    unit_types = await list_organization_unit_types(session)
    return ApiSuccess(
        data={
            "organization_units": rows,
            "positions": positions,
            "unitTypes": unit_types,
            "meta": {"count": len(rows), "tenant_id": tenant_id, "pageSize": page_size},
        },
        message="Organizasyon birimleri listelendi.",
    )


@router.post("/units", response_model=ApiSuccess[dict[str, Any]])
async def create_unit(
    payload: OrganizationUnitCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    try:
        row = await create_organization_unit(
            session,
            _context_map(context),
            payload.model_dump(exclude_none=True),
        )
        await session.commit()
        return ApiSuccess(data=row, message="Organizasyon birimi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/units/{unit_id}", response_model=ApiSuccess[dict[str, Any]])
async def get_unit(
    unit_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    try:
        detail = await get_organization_unit_detail(session, _context_map(context), unit_id)
        return ApiSuccess(
            data=_flatten_unit_detail(detail),
            message="Organizasyon birimi getirildi.",
        )
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/units/{unit_id}", response_model=ApiSuccess[dict[str, Any]])
async def patch_unit(
    unit_id: str,
    payload: OrganizationUnitUpdateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    try:
        detail = await update_organization_unit_card(
            session,
            _context_map(context),
            unit_id,
            payload.model_dump(exclude_unset=True),
        )
        await session.commit()
        return ApiSuccess(
            data=_flatten_unit_detail(detail),
            message="Organizasyon birimi guncellendi.",
        )
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/units/{unit_id}/positions", response_model=ApiSuccess[list[dict[str, Any]]])
async def list_unit_positions(
    unit_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[list[dict[str, Any]]]:
    rows = await list_positions_for_organization(
        session,
        _context_map(context),
        {"unit_id": unit_id, "limit": 200},
    )
    return ApiSuccess(data=rows, meta={"count": len(rows)}, message="Pozisyonlar listelendi.")


@router.post("/units/{unit_id}/positions", response_model=ApiSuccess[dict[str, Any]])
async def create_unit_position(
    unit_id: str,
    payload: OrganizationPositionCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    try:
        body = payload.model_dump(exclude_none=True)
        body["unit_id"] = unit_id
        row = await create_position_for_unit(session, _context_map(context), body)
        await session.commit()
        return ApiSuccess(data=row, message="Pozisyon olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/units/{unit_id}/representative-authorities")
async def list_unit_representative_authorities(
    unit_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[list[dict[str, Any]]]:
    detail = await get_organization_unit_detail(session, _context_map(context), unit_id)
    company_id = str((detail.get("unit") or {}).get("company_id") or "")
    rows = await list_authorities_for_company(
        session,
        _context_map(context),
        company_id,
        {"organization_unit_id": unit_id, "scope_type": "organization_unit"},
    )
    return ApiSuccess(
        data=rows,
        meta={"count": len(rows)},
        message="Organizasyon kapsami temsil yetkileri listelendi.",
    )


@router.get("/units/{unit_id}/impact", response_model=ApiSuccess[dict[str, Any]])
async def get_unit_impact(
    unit_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ctx = _context_map(context)
    detail = await get_organization_unit_detail(session, ctx, unit_id)
    company_id = str((detail.get("unit") or {}).get("company_id") or "")
    authorities = await list_authorities_for_company(
        session,
        ctx,
        company_id,
        {"organization_unit_id": unit_id, "scope_type": "organization_unit"},
    )
    dependents = await get_unit_dependents_summary(session, ctx, unit_id)
    return ApiSuccess(
        data={
            **dependents,
            "active_authority_count": len(authorities),
            "related_branch": detail.get("related_branch"),
            "blocking_reasons": _unit_blocking_reasons(dependents, authorities, detail),
        },
        message="Organizasyon birimi etki analizi getirildi.",
    )


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


def _flatten_unit_detail(detail: dict[str, Any]) -> dict[str, Any]:
    unit = dict(detail.get("unit") or {})
    company = detail.get("company")
    parent = detail.get("parent_unit")
    branch = detail.get("related_branch")
    return {
        **unit,
        "company": company,
        "company_name": (
            (company or {}).get("trade_name") or (company or {}).get("short_name") or ""
        ),
        "parent_unit": parent,
        "parent_name": (parent or {}).get("name") or "",
        "child_units": detail.get("child_units") or [],
        "related_branch": branch,
        "branch_id": (branch or {}).get("id"),
        "branch_name": (branch or {}).get("branch_name") or "",
        "positions_summary": detail.get("positions_summary") or {},
        "employees_summary": detail.get("employees_summary") or {},
        "warnings": detail.get("warnings") or [],
    }


def _unit_blocking_reasons(
    dependents: dict[str, Any],
    authorities: list[dict[str, Any]],
    detail: dict[str, Any],
) -> list[str]:
    reasons: list[str] = []
    if int(dependents.get("child_unit_count") or 0) > 0:
        reasons.append("Aktif alt birim etkisi var.")
    if int(dependents.get("position_count") or 0) > 0:
        reasons.append("Aktif kadro/pozisyon etkisi var.")
    if authorities:
        reasons.append("Bu birim temsil yetkisi kapsami olarak kullaniliyor.")
    branch = detail.get("related_branch") or {}
    branch_status = str(branch.get("record_status") or branch.get("status") or "").lower()
    if branch_status in {"active", "aktif"}:
        reasons.append("Aktif sube baglantisi var.")
    return reasons
