from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import RequestContext, get_request_context, require_tenant
from app.domains.action_center.service import (
    action_center_by_record,
    action_center_counts,
    action_center_summary,
    list_action_center_items,
)
from app.schemas.common import ApiSuccess

router = APIRouter()

RequestContextDep = Annotated[RequestContext, Depends(get_request_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


def _context(tenant_id: str, user_id: str | None) -> dict[str, Any]:
    return {"tenant_id": tenant_id, "user_id": user_id, "module_key": "action-center"}


@router.get("")
async def list_items(
    session: SessionDep,
    context: RequestContextDep,
    limit: int = Query(default=50, ge=1, le=200),
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    data = await list_action_center_items(
        session,
        _context(tenant_id, context.user_id),
        {"limit": limit},
    )
    return ApiSuccess(data=data)


@router.get("/counts")
async def counts(session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, int]]:
    tenant_id = require_tenant(context)
    data = await action_center_counts(session, _context(tenant_id, context.user_id))
    return ApiSuccess(data=data)


@router.get("/summary")
async def summary(session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    data = await action_center_summary(session, _context(tenant_id, context.user_id))
    return ApiSuccess(data=data)


@router.get("/by-record")
async def by_record(
    session: SessionDep,
    context: RequestContextDep,
    entity_type: str = Query(...),
    entity_id: str = Query(...),
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    data = await action_center_by_record(
        session,
        _context(tenant_id, context.user_id),
        entity_type=entity_type,
        entity_id=entity_id,
    )
    return ApiSuccess(data=data)
