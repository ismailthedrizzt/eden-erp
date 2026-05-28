# ruff: noqa: B008, E501

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, require_access_context, require_tenant
from app.domains.search.schemas import RecentItemRequest, SearchRequest
from app.domains.search.service import (
    command_palette,
    entity_lookup,
    global_search,
    list_recent_items,
    record_recent_item,
    service_context,
    suggestions,
)
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("/search", response_model=ApiSuccess[dict[str, Any]])
async def search_get(
    session: SessionDep,
    context: RequestContextDep,
    q: str = Query(default="", alias="query"),
    current_page: str | None = Query(default=None),
    module_filter: str | None = Query(default=None),
    entity_types: list[str] | None = Query(default=None),
    limit: int = Query(default=25, ge=1, le=50),
    include_actions: bool = Query(default=True),
    include_recent: bool = Query(default=True),
    include_commands: bool = Query(default=True),
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    request = SearchRequest(
        query=q,
        current_page=current_page,
        module_filter=module_filter,
        entity_types=entity_types or [],
        limit=limit,
        include_actions=include_actions,
        include_recent=include_recent,
        include_commands=include_commands,
    )
    data = await global_search(session, service_context(context, tenant_id), request)
    return ApiSuccess(data=data.model_dump(mode="json"))


@router.post("/search/query", response_model=ApiSuccess[dict[str, Any]])
async def search_query(
    request: SearchRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    data = await global_search(session, service_context(context, tenant_id), request)
    return ApiSuccess(data=data.model_dump(mode="json"))


@router.get("/search/suggestions", response_model=ApiSuccess[list[dict[str, Any]]])
async def search_suggestions(
    session: SessionDep,
    context: RequestContextDep,
    q: str = Query(default="", alias="query"),
    limit: int = Query(default=8, ge=1, le=20),
) -> ApiSuccess[list[dict[str, Any]]]:
    tenant_id = require_tenant(context)
    data = await suggestions(session, service_context(context, tenant_id), q, limit=limit)
    return ApiSuccess(data=[item.model_dump(mode="json") for item in data])


@router.get("/search/recent", response_model=ApiSuccess[list[dict[str, Any]]])
async def search_recent_get(
    session: SessionDep,
    context: RequestContextDep,
    limit: int = Query(default=8, ge=1, le=20),
) -> ApiSuccess[list[dict[str, Any]]]:
    tenant_id = require_tenant(context)
    data = await list_recent_items(session, service_context(context, tenant_id), limit=limit)
    return ApiSuccess(data=[item.model_dump(mode="json") for item in data])


@router.post("/search/recent", response_model=ApiSuccess[dict[str, Any]])
async def search_recent_post(
    request: RecentItemRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            data = await record_recent_item(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=data, message="Son acilan kayit guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/search/commands", response_model=ApiSuccess[dict[str, Any]])
async def search_commands(
    session: SessionDep,
    context: RequestContextDep,
    q: str = Query(default="", alias="query"),
    current_page: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    request = SearchRequest(query=q, current_page=current_page, limit=limit, include_recent=False)
    data = await global_search(session, service_context(context, tenant_id), request.model_copy(update={"include_actions": True, "include_commands": True}))
    return ApiSuccess(data={"actions": [item.model_dump(mode="json") for item in data.actions]})


@router.post("/search/command-palette", response_model=ApiSuccess[dict[str, Any]])
async def search_command_palette(
    request: SearchRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    data = await command_palette(session, service_context(context, tenant_id), request)
    return ApiSuccess(data=data.model_dump(mode="json"))


@router.get("/search/by-entity/{entity_type}/{entity_id}", response_model=ApiSuccess[dict[str, Any]])
async def search_by_entity(
    entity_type: str,
    entity_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    data = await entity_lookup(session, service_context(context, tenant_id), entity_type, entity_id)
    return ApiSuccess(data=data.model_dump(mode="json"))
