from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, get_request_context, require_tenant
from app.domains.partners.service import (
    get_partner_by_id,
    list_partners_for_company,
    update_partner_card_only,
)
from app.schemas.common import ApiSuccess
from app.schemas.placeholder import PlaceholderResponse

router = APIRouter()
RequestContextDep = Annotated[RequestContext, Depends(get_request_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("", response_model=PlaceholderResponse)
async def list_partners() -> PlaceholderResponse:
    return PlaceholderResponse(
        status="planned",
        module="partners",
        message="Ownership and partner endpoints will migrate after critical operations.",
    )


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
    payload: dict[str, Any],
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    service_context = {
        "tenant_id": tenant_id,
        "user_id": context.user_id,
        "module_key": "ownership",
    }
    try:
        async with session.begin():
            partner = await update_partner_card_only(session, service_context, partner_id, payload)
        return ApiSuccess(data=partner, message="Ortak karti guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error
