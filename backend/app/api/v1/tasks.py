from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, get_request_context, require_tenant
from app.domains.process.schemas import (
    AddTaskCommentRequest,
    AssignTaskRequest,
    CompleteTaskRequest,
    CreateTaskRequest,
)
from app.domains.process.tasks import (
    add_task_comment,
    assign_task,
    complete_task,
    create_task,
    get_task,
    list_my_tasks,
)
from app.schemas.common import ApiSuccess

router = APIRouter()

RequestContextDep = Annotated[RequestContext, Depends(get_request_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


def _context(tenant_id: str, user_id: str | None) -> dict[str, Any]:
    return {"tenant_id": tenant_id, "user_id": user_id, "module_key": "process"}


@router.get("")
async def list_task_records(
    session: SessionDep,
    context: RequestContextDep,
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[list[dict[str, Any]]]:
    tenant_id = require_tenant(context)
    try:
        rows, count = await list_my_tasks(
            session,
            _context(tenant_id, context.user_id),
            {"status": status, "limit": page_size, "offset": (page - 1) * page_size},
        )
        return ApiSuccess(data=rows, meta={"count": count, "page": page, "pageSize": page_size})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("")
async def create_task_record(
    request: CreateTaskRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await create_task(session, _context(tenant_id, context.user_id), request)
        return ApiSuccess(data=row, message="Gorev olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/{task_id}")
async def get_task_record(
    task_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        row = await get_task(session, _context(tenant_id, context.user_id), task_id)
        if not row:
            raise DomainError("Gorev kaydi bulunamadi.", "TASK_NOT_FOUND", 404)
        return ApiSuccess(data=row)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/{task_id}/complete")
async def complete_task_record(
    task_id: str,
    request: CompleteTaskRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await complete_task(
                session,
                _context(tenant_id, context.user_id),
                task_id,
                request,
            )
        return ApiSuccess(data=row, message="Gorev tamamlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/{task_id}/assign")
async def assign_task_record(
    task_id: str,
    request: AssignTaskRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await assign_task(session, _context(tenant_id, context.user_id), task_id, request)
        return ApiSuccess(data=row, message="Gorev atamasi guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/{task_id}/comment")
async def comment_task_record(
    task_id: str,
    request: AddTaskCommentRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await add_task_comment(
                session,
                _context(tenant_id, context.user_id),
                task_id,
                request,
            )
        return ApiSuccess(data=row, message="Gorev yorumu eklendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error
