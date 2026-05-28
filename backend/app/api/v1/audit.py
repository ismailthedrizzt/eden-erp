from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, require_permission, require_tenant
from app.domains.audit.service import (
    get_audit_log,
    list_audit_by_operation,
    list_audit_by_process,
    list_audit_by_record,
    list_audit_logs,
)
from app.schemas.common import ApiSuccess

router = APIRouter()

RequestContextDep = Annotated[RequestContext, Depends(require_permission("audit.view"))]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


def _context(tenant_id: str, user_id: str | None) -> dict[str, Any]:
    return {"tenant_id": tenant_id, "user_id": user_id, "module_key": "audit"}


def _default_date_from() -> str:
    return (datetime.now(UTC) - timedelta(days=7)).isoformat()


@router.get("")
async def list_audit_records(
    session: SessionDep,
    context: RequestContextDep,
    entity_type: str | None = Query(default=None),
    entity_id: str | None = Query(default=None),
    company_id: str | None = Query(default=None),
    branch_id: str | None = Query(default=None),
    module_key: str | None = Query(default=None),
    action_type: str | None = Query(default=None),
    action_key: str | None = Query(default=None),
    user_id: str | None = Query(default=None),
    result_status: str | None = Query(default=None),
    severity: str | None = Query(default=None),
    operation_id: str | None = Query(default=None),
    process_instance_id: str | None = Query(default=None),
    request_id: str | None = Query(default=None),
    correlation_id: str | None = Query(default=None),
    search: str | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=100),
) -> ApiSuccess[list[dict[str, Any]]]:
    tenant_id = require_tenant(context)
    rows, count = await list_audit_logs(
        session,
        _context(tenant_id, context.user_id),
        {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "company_id": company_id,
            "branch_id": branch_id,
            "module_key": module_key,
            "action_type": action_type,
            "action_key": action_key,
            "user_id": user_id,
            "result_status": result_status,
            "severity": severity,
            "operation_id": operation_id,
            "process_instance_id": process_instance_id,
            "request_id": request_id,
            "correlation_id": correlation_id,
            "search": search,
            "date_from": date_from or _default_date_from(),
            "date_to": date_to,
            "limit": page_size,
            "offset": (page - 1) * page_size,
        },
    )
    return ApiSuccess(data=rows, meta={"count": count, "page": page, "pageSize": page_size})


@router.get("/by-record")
async def audit_by_record(
    session: SessionDep,
    context: RequestContextDep,
    entity_type: str = Query(...),
    entity_id: str = Query(...),
) -> ApiSuccess[list[dict[str, Any]]]:
    tenant_id = require_tenant(context)
    rows = await list_audit_by_record(
        session, _context(tenant_id, context.user_id), entity_type, entity_id
    )
    return ApiSuccess(data=rows, meta={"count": len(rows)})


@router.get("/by-operation")
async def audit_by_operation(
    session: SessionDep,
    context: RequestContextDep,
    operation_id: str = Query(...),
) -> ApiSuccess[list[dict[str, Any]]]:
    tenant_id = require_tenant(context)
    rows = await list_audit_by_operation(
        session, _context(tenant_id, context.user_id), operation_id
    )
    return ApiSuccess(data=rows, meta={"count": len(rows)})


@router.get("/by-process")
async def audit_by_process(
    session: SessionDep,
    context: RequestContextDep,
    process_instance_id: str = Query(...),
) -> ApiSuccess[list[dict[str, Any]]]:
    tenant_id = require_tenant(context)
    rows = await list_audit_by_process(
        session, _context(tenant_id, context.user_id), process_instance_id
    )
    return ApiSuccess(data=rows, meta={"count": len(rows)})


@router.get("/{audit_id}")
async def get_audit_record(
    audit_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        row = await get_audit_log(session, _context(tenant_id, context.user_id), audit_id)
        if not row:
            raise DomainError("Denetim kaydi bulunamadi.", "AUDIT_NOT_FOUND", 404)
        return ApiSuccess(data=row)
    except DomainError as error:
        raise domain_error_to_http(error) from error
