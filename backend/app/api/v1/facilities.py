from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, require_access_context, require_tenant
from app.domains.facilities.schemas import FacilityCreateRequest, FacilityUpdateRequest
from app.domains.facilities.service import (
    create_facility,
    get_facility_active_relations_summary,
    get_facility_detail,
    list_facilities,
    update_facility_card,
)
from app.domains.representatives.service import list_authorities_for_company
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])

RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("", response_model=ApiSuccess[dict[str, Any]])
async def list_facility_records(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    branch_id: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page_size: int = Query(default=100, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    rows = await list_facilities(
        session,
        _context_map(context),
        {
            "company_id": company_id,
            "branch_id": branch_id,
            "search": search,
            "limit": page_size,
        },
    )
    return ApiSuccess(
        data={
            "data": rows,
            "meta": {"count": len(rows), "tenant_id": tenant_id, "pageSize": page_size},
            "projection": {
                "key": "facilityList",
                "source": "company_facilities",
                "max_page_size": 200,
            },
        },
        message="Tesis/lokasyonlar listelendi.",
    )


@router.post("", response_model=ApiSuccess[dict[str, Any]])
async def create_facility_record(
    payload: FacilityCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    try:
        row = await create_facility(
            session,
            _context_map(context),
            payload.model_dump(exclude_none=True),
        )
        await session.commit()
        return ApiSuccess(
            data=_normalize_facility_row(row),
            message="Tesis/lokasyon olusturuldu.",
        )
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/{facility_id}", response_model=ApiSuccess[dict[str, Any]])
async def get_facility_record(
    facility_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    try:
        detail = await get_facility_detail(session, _context_map(context), facility_id)
        return ApiSuccess(
            data=_flatten_facility_detail(detail),
            message="Tesis/lokasyon getirildi.",
        )
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/{facility_id}", response_model=ApiSuccess[dict[str, Any]])
async def patch_facility_record(
    facility_id: str,
    payload: FacilityUpdateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    try:
        detail = await update_facility_card(
            session,
            _context_map(context),
            facility_id,
            payload.model_dump(exclude_unset=True),
        )
        await session.commit()
        return ApiSuccess(
            data=_flatten_facility_detail(detail),
            message="Tesis/lokasyon guncellendi.",
        )
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/{facility_id}/representative-authorities")
async def list_facility_representative_authorities(
    facility_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[list[dict[str, Any]]]:
    detail = await get_facility_detail(session, _context_map(context), facility_id)
    company_id = str((detail.get("facility") or {}).get("company_id") or "")
    rows = await list_authorities_for_company(
        session,
        _context_map(context),
        company_id,
        {"facility_id": facility_id, "scope_type": "facility"},
    )
    return ApiSuccess(
        data=rows,
        meta={"count": len(rows)},
        message="Tesis/lokasyon kapsami temsil yetkileri listelendi.",
    )


@router.get("/{facility_id}/impact", response_model=ApiSuccess[dict[str, Any]])
async def get_facility_impact(
    facility_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ctx = _context_map(context)
    detail = await get_facility_detail(session, ctx, facility_id)
    facility = detail.get("facility") or {}
    authorities = await list_authorities_for_company(
        session,
        ctx,
        str(facility.get("company_id") or ""),
        {"facility_id": facility_id, "scope_type": "facility"},
    )
    relations = await get_facility_active_relations_summary(session, ctx, facility_id)
    return ApiSuccess(
        data={
            **relations,
            "active_authority_count": len(authorities),
            "related_branch": detail.get("branch"),
            "blocking_reasons": _facility_blocking_reasons(relations, authorities),
        },
        message="Tesis/lokasyon etki analizi getirildi.",
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


def _normalize_facility_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        **row,
        "name": row.get("name") or row.get("facility_name"),
        "related_branch_id": row.get("branch_id"),
        "reusable": str(row.get("status") or "").lower() == "reusable"
        or bool((row.get("metadata_json") or {}).get("reusable")),
    }


def _flatten_facility_detail(detail: dict[str, Any]) -> dict[str, Any]:
    facility = _normalize_facility_row(dict(detail.get("facility") or {}))
    company = detail.get("company")
    branch = detail.get("branch")
    return {
        **facility,
        "company": company,
        "company_name": (
            (company or {}).get("trade_name") or (company or {}).get("short_name") or ""
        ),
        "branch": branch,
        "branch_name": (branch or {}).get("branch_name") or "",
        "related_branches": detail.get("related_branches") or [],
        "active_relations_summary": detail.get("active_relations_summary") or {},
        "warnings": detail.get("warnings") or [],
    }


def _facility_blocking_reasons(
    relations: dict[str, Any],
    authorities: list[dict[str, Any]],
) -> list[str]:
    reasons: list[str] = []
    if int(relations.get("active_branch_count") or 0) > 0:
        reasons.append("Aktif sube baglantisi var.")
    if authorities:
        reasons.append("Bu lokasyon temsil yetkisi kapsami olarak kullaniliyor.")
    return reasons
