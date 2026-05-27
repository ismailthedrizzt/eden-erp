from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, get_request_context, require_tenant
from app.domains.partners.schemas import PartnerCardUpdateRequest, PartnerCreateDraftRequest
from app.domains.partners.service import (
    create_partner_draft,
    delete_partner_draft,
    get_partner_by_id,
    list_partners_for_company,
)
from app.domains.partners.service import (
    update_partner_card as update_partner_card_service,
)
from app.projections.partner import list_partner_projection
from app.projections.query import projection_query_from_params
from app.schemas.common import ApiSuccess

router = APIRouter()
RequestContextDep = Annotated[RequestContext, Depends(get_request_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("", response_model=ApiSuccess[dict[str, Any]])
async def list_partners(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    search: str | None = Query(default=None),
    sort: str | None = Query(default=None),
    direction: str = Query(default="asc"),
    statuses: str | None = Query(default=None),
    owner_kind: str | None = Query(default=None),
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        result = await list_partner_projection(
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
                filters={"owner_kind": owner_kind},
            ),
        )
        return ApiSuccess(
            data={
                "data": result.data,
                "meta": result.meta.model_dump(),
                "projection": result.projection.model_dump(),
            },
            warnings=result.warnings,
            message="Ortaklar listelendi.",
        )
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("", response_model=ApiSuccess[dict[str, Any]])
async def create_partner_card(
    request: PartnerCreateDraftRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    service_context = {
        "tenant_id": tenant_id,
        "user_id": context.user_id,
        "module_key": "ownership",
    }
    try:
        async with session.begin():
            partner = await create_partner_draft(
                session,
                service_context,
                request.model_dump(exclude_none=True),
            )
        return ApiSuccess(data=partner, message="Ortak karti taslak olarak olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/{partner_id}", response_model=ApiSuccess[dict[str, Any]])
async def get_partner(
    session: SessionDep,
    context: RequestContextDep,
    partner_id: str,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        partner = await get_partner_by_id(session, tenant_id, partner_id)
        if not partner:
            raise DomainError("Ortak kaydi bulunamadi.", "PARTNER_NOT_FOUND", 404)
        return ApiSuccess(data=partner)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/by-company/{company_id}", response_model=ApiSuccess[list[dict[str, Any]]])
async def get_company_partners(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str,
) -> ApiSuccess[list[dict[str, Any]]]:
    tenant_id = require_tenant(context)
    try:
        rows = await list_partners_for_company(session, tenant_id, company_id)
        return ApiSuccess(data=rows)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/{partner_id}", response_model=ApiSuccess[dict[str, Any]])
async def update_partner_card(
    session: SessionDep,
    context: RequestContextDep,
    partner_id: str,
    payload: PartnerCardUpdateRequest,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    service_context = {
        "tenant_id": tenant_id,
        "user_id": context.user_id,
        "module_key": "ownership",
    }
    try:
        async with session.begin():
            partner = await update_partner_card_service(
                session,
                service_context,
                partner_id,
                payload.model_dump(exclude_unset=True),
            )
        return ApiSuccess(data=partner, message="Ortak karti guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.delete("/{partner_id}", response_model=ApiSuccess[dict[str, Any]])
async def delete_partner_card(
    session: SessionDep,
    context: RequestContextDep,
    partner_id: str,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    service_context = {
        "tenant_id": tenant_id,
        "user_id": context.user_id,
        "module_key": "ownership",
    }
    try:
        async with session.begin():
            result = await delete_partner_draft(session, service_context, partner_id)
        return ApiSuccess(data=result, message=result.get("message"))
    except DomainError as error:
        raise domain_error_to_http(error) from error
