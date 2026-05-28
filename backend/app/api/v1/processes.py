from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, get_request_context, require_tenant
from app.domains.process.approvals import list_process_approvals
from app.domains.process.events import list_process_events
from app.domains.process.schemas import (
    CancelProcessRequest,
    CompleteStepRequest,
    StartProcessRequest,
)
from app.domains.process.service import (
    activate_process,
    cancel_process,
    complete_step,
    get_process,
    list_processes,
    start_process,
)
from app.domains.process.tasks import list_process_tasks
from app.schemas.common import ApiSuccess

router = APIRouter()

RequestContextDep = Annotated[RequestContext, Depends(get_request_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


def _context(tenant_id: str, user_id: str | None) -> dict[str, Any]:
    return {"tenant_id": tenant_id, "user_id": user_id, "module_key": "process"}


@router.get("")
async def list_process_records(
    session: SessionDep,
    context: RequestContextDep,
    status: str | None = Query(default=None),
    company_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[list[dict[str, Any]]]:
    tenant_id = require_tenant(context)
    try:
        rows, count = await list_processes(
            session,
            _context(tenant_id, context.user_id),
            {
                "status": status,
                "company_id": company_id,
                "limit": page_size,
                "offset": (page - 1) * page_size,
            },
        )
        return ApiSuccess(data=rows, meta={"count": count, "page": page, "pageSize": page_size})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("")
async def create_process_record(
    request: StartProcessRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await start_process(session, _context(tenant_id, context.user_id), request)
        return ApiSuccess(data=row, message="Surec baslatildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/{process_id}")
async def get_process_record(
    process_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        row = await get_process(session, _context(tenant_id, context.user_id), process_id)
        if not row:
            raise DomainError("Surec kaydi bulunamadi.", "PROCESS_NOT_FOUND", 404)
        tasks = await list_process_tasks(session, _context(tenant_id, context.user_id), process_id)
        try:
            approvals = await list_process_approvals(
                session,
                _context(tenant_id, context.user_id),
                process_id,
            )
        except DomainError as approval_error:
            if approval_error.code != "APPROVAL_INFRASTRUCTURE_MISSING":
                raise
            approvals = []
        events = await list_process_events(
            session,
            _context(tenant_id, context.user_id),
            process_id,
        )
        return ApiSuccess(data={**row, "tasks": tasks, "approvals": approvals, "events": events})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/{process_id}/start")
async def start_existing_process(
    process_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await activate_process(session, _context(tenant_id, context.user_id), process_id)
        return ApiSuccess(data=row, message="Surec aktif hale getirildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/{process_id}/steps/{step_key}/complete")
async def complete_process_step(
    process_id: str,
    step_key: str,
    request: CompleteStepRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await complete_step(
                session,
                _context(tenant_id, context.user_id),
                process_id,
                step_key,
                request,
            )
        return ApiSuccess(data=row, message="Surec adimi tamamlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/{process_id}/cancel")
async def cancel_process_record(
    process_id: str,
    request: CancelProcessRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await cancel_process(
                session, _context(tenant_id, context.user_id), process_id, request
            )
        return ApiSuccess(data=row, message="Surec iptal edildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error
