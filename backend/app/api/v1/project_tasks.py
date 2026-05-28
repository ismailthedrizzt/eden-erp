from __future__ import annotations

from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.projects.attachments import create_task_attachment, list_task_attachments
from app.domains.projects.comments import create_task_comment, list_task_comments
from app.domains.projects.schemas import (
    ProjectTaskCreateRequest,
    ProjectTaskListQuery,
    ProjectTaskUpdateRequest,
    TaskAssignRequest,
    TaskAttachmentCreateRequest,
    TaskCommentCreateRequest,
    TaskTransitionRequest,
)
from app.domains.projects.tasks import (
    assign_project_task,
    create_project_task,
    delete_project_task,
    get_project_task,
    list_my_project_tasks,
    list_project_tasks,
    transition_project_task,
    update_project_task,
)
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]
DueFromQuery = Annotated[date | None, Query(alias="dueFrom")]
DueToQuery = Annotated[date | None, Query(alias="dueTo")]


@router.get("/my-project-tasks", response_model=ApiSuccess[dict[str, Any]])
async def my_project_tasks(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    project_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "tasks.view")
    tenant_id = require_tenant(context)
    try:
        result = await list_my_project_tasks(
            session,
            service_context(context, tenant_id),
            ProjectTaskListQuery(
                company_id=company_id,
                project_id=project_id,
                page=page,
                page_size=page_size,
            ),
        )
        return ApiSuccess(data={"data": result.data, "meta": result.meta})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/project-tasks", response_model=ApiSuccess[dict[str, Any]])
async def project_tasks_list(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    project_id: str | None = Query(default=None),
    branch_id: str | None = Query(default=None),
    organization_unit_id: str | None = Query(default=None),
    facility_id: str | None = Query(default=None),
    status_value: str | None = Query(default=None, alias="status"),
    priority: str | None = Query(default=None),
    issue_type: str | None = Query(default=None),
    assignee_user_id: str | None = Query(default=None),
    assignee_employee_id: str | None = Query(default=None),
    related_module: str | None = Query(default=None),
    related_entity_type: str | None = Query(default=None),
    related_entity_id: str | None = Query(default=None),
    due_from: DueFromQuery = None,
    due_to: DueToQuery = None,
    overdue: bool | None = Query(default=None),
    label: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    sort: str = Query(default="updated_at"),
    direction: str = Query(default="desc"),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "tasks.view")
    tenant_id = require_tenant(context)
    try:
        result = await list_project_tasks(
            session,
            service_context(context, tenant_id),
            ProjectTaskListQuery(
                company_id=company_id,
                project_id=project_id,
                branch_id=branch_id,
                organization_unit_id=organization_unit_id,
                facility_id=facility_id,
                status=status_value,
                priority=priority,
                issue_type=issue_type,
                assignee_user_id=assignee_user_id,
                assignee_employee_id=assignee_employee_id,
                related_module=related_module,
                related_entity_type=related_entity_type,
                related_entity_id=related_entity_id,
                due_from=due_from,
                due_to=due_to,
                overdue=overdue,
                label=label,
                search=search,
                page=page,
                page_size=page_size,
                sort=sort,
                direction=direction,
            ),
        )
        return ApiSuccess(data={"data": result.data, "meta": result.meta})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/project-tasks", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def project_tasks_create(
    request: ProjectTaskCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "tasks.create")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            task = await create_project_task(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=task, message="Proje gorevi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/project-tasks/{task_id}", response_model=ApiSuccess[dict[str, Any]])
async def project_tasks_get(
    task_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "tasks.view")
    tenant_id = require_tenant(context)
    try:
        task = await get_project_task(session, tenant_id, task_id)
        if not task:
            raise DomainError("Proje gorevi bulunamadi.", "PROJECT_TASK_NOT_FOUND", 404)
        return ApiSuccess(data=task)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/project-tasks/{task_id}", response_model=ApiSuccess[dict[str, Any]])
async def project_tasks_update(
    task_id: str,
    request: ProjectTaskUpdateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "tasks.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            task = await update_project_task(
                session,
                service_context(context, tenant_id),
                task_id,
                request,
            )
        return ApiSuccess(data=task, message="Proje gorevi guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.delete("/project-tasks/{task_id}", response_model=ApiSuccess[dict[str, Any]])
async def project_tasks_delete(
    task_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "tasks.delete")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await delete_project_task(
                session,
                service_context(context, tenant_id),
                task_id,
            )
        return ApiSuccess(data=result, message="Proje gorevi silindi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/project-tasks/{task_id}/transition", response_model=ApiSuccess[dict[str, Any]])
async def project_tasks_transition(
    task_id: str,
    request: TaskTransitionRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "tasks.transition")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            task = await transition_project_task(
                session,
                service_context(context, tenant_id),
                task_id,
                request,
            )
        return ApiSuccess(data=task, message="Gorev durumu guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/project-tasks/{task_id}/assign", response_model=ApiSuccess[dict[str, Any]])
async def project_tasks_assign(
    task_id: str,
    request: TaskAssignRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "tasks.assign")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            task = await assign_project_task(
                session,
                service_context(context, tenant_id),
                task_id,
                request,
            )
        return ApiSuccess(data=task, message="Gorev atamasi guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/project-tasks/{task_id}/comments", response_model=ApiSuccess[list[dict[str, Any]]])
async def project_task_comments_list(
    task_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "tasks.view")
    tenant_id = require_tenant(context)
    try:
        comments = await list_task_comments(session, service_context(context, tenant_id), task_id)
        return ApiSuccess(data=comments)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post(
    "/project-tasks/{task_id}/comments",
    response_model=ApiSuccess[dict[str, Any]],
    status_code=201,
)
async def project_task_comments_create(
    task_id: str,
    request: TaskCommentCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "tasks.comment")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            comment = await create_task_comment(
                session,
                service_context(context, tenant_id),
                task_id,
                request,
            )
        return ApiSuccess(data=comment, message="Gorev yorumu eklendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/project-tasks/{task_id}/attachments", response_model=ApiSuccess[list[dict[str, Any]]])
async def project_task_attachments_list(
    task_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "tasks.view")
    tenant_id = require_tenant(context)
    try:
        attachments = await list_task_attachments(
            session,
            service_context(context, tenant_id),
            task_id,
        )
        return ApiSuccess(data=attachments)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post(
    "/project-tasks/{task_id}/attachments",
    response_model=ApiSuccess[dict[str, Any]],
    status_code=201,
)
async def project_task_attachments_create(
    task_id: str,
    request: TaskAttachmentCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "tasks.attachmentsManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            attachment = await create_task_attachment(
                session,
                service_context(context, tenant_id),
                task_id,
                request,
            )
        return ApiSuccess(data=attachment, message="Gorev eki eklendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


def ensure_permission(context: RequestContext, permission_key: str) -> None:
    if not has_permission(context, permission_key):
        raise DomainError(
            "Bu islem icin yetkiniz bulunmuyor.",
            "PERMISSION_DENIED",
            status.HTTP_403_FORBIDDEN,
        )


def service_context(context: RequestContext, tenant_id: str) -> dict[str, Any]:
    return {
        "tenant_id": tenant_id,
        "user_id": context.user_id,
        "permissions": context.permissions,
        "company_scope_ids": context.company_scope_ids,
        "writable_company_scope_ids": context.writable_company_scope_ids,
    }
