from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, get_request_context, require_tenant
from app.domains.company.service import get_company_by_id
from app.domains.ownership.service import get_current_ownership_for_company
from app.schemas.common import ApiSuccess

router = APIRouter()

RequestContextDep = Annotated[RequestContext, Depends(get_request_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


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
