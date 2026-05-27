from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, get_request_context, require_tenant
from app.projections.branch import list_branch_projection
from app.projections.company import list_company_projection
from app.projections.partner import list_partner_projection
from app.projections.query import projection_query_from_params
from app.projections.registry import list_projection_definitions
from app.projections.representative import list_representative_projection
from app.schemas.common import ApiSuccess

router = APIRouter()

RequestContextDep = Annotated[RequestContext, Depends(get_request_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("", response_model=ApiSuccess[list[dict[str, Any]]])
async def list_projection_registry() -> ApiSuccess[list[dict[str, Any]]]:
    return ApiSuccess(data=[item.model_dump() for item in list_projection_definitions()])


@router.get("/{projection_key}", response_model=ApiSuccess[dict[str, Any]])
async def get_projection_data(
    projection_key: str,
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    search: str | None = Query(default=None),
    sort: str | None = Query(default=None),
    direction: str = Query(default="asc"),
    statuses: str | None = Query(default=None),
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    query = projection_query_from_params(
        tenant_id=tenant_id,
        company_id=company_id,
        page=page,
        page_size=page_size,
        search=search,
        sort=sort,
        direction=direction,
        statuses=statuses,
    )
    try:
        if projection_key == "companyList":
            result = await list_company_projection(session, query)
        elif projection_key == "branchList":
            result = await list_branch_projection(session, query)
        elif projection_key == "partnerList":
            result = await list_partner_projection(session, query)
        elif projection_key == "representativeList":
            result = await list_representative_projection(session, query)
        else:
            raise DomainError("Projection tanimli degil.", "PROJECTION_NOT_FOUND", 404)
        return ApiSuccess(
            data={
                "data": result.data,
                "meta": result.meta.model_dump(),
                "projection": result.projection.model_dump(),
            },
            warnings=result.warnings,
        )
    except DomainError as error:
        raise domain_error_to_http(error) from error
