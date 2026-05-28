from __future__ import annotations

from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.projects.projects import (
    create_project,
    delete_project,
    get_project,
    get_project_summary,
    get_projects_summary,
    list_projects,
    update_project,
)
from app.domains.projects.schemas import (
    ProjectCreateRequest,
    ProjectListQuery,
    ProjectUpdateRequest,
)
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]
DateFromQuery = Annotated[date | None, Query(alias="dateFrom")]
DateToQuery = Annotated[date | None, Query(alias="dateTo")]


@router.get("/summary", response_model=ApiSuccess[dict[str, Any]])
async def projects_summary(
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "projects.view")
    tenant_id = require_tenant(context)
    try:
        summary = await get_projects_summary(session, service_context(context, tenant_id))
        return ApiSuccess(data=summary.model_dump())
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("", response_model=ApiSuccess[dict[str, Any]])
async def projects_list(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    branch_id: str | None = Query(default=None),
    organization_unit_id: str | None = Query(default=None),
    status_value: str | None = Query(default=None, alias="status"),
    project_type: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    manager_id: str | None = Query(default=None),
    date_from: DateFromQuery = None,
    date_to: DateToQuery = None,
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    sort: str = Query(default="updated_at"),
    direction: str = Query(default="desc"),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "projects.view")
    tenant_id = require_tenant(context)
    try:
        result = await list_projects(
            session,
            service_context(context, tenant_id),
            ProjectListQuery(
                company_id=company_id,
                branch_id=branch_id,
                organization_unit_id=organization_unit_id,
                status=status_value,
                project_type=project_type,
                priority=priority,
                manager_id=manager_id,
                date_from=date_from,
                date_to=date_to,
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


@router.post("", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def projects_create(
    request: ProjectCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "projects.create")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            project = await create_project(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=project, message="Proje olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/{project_id}", response_model=ApiSuccess[dict[str, Any]])
async def projects_get(
    project_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "projects.view")
    tenant_id = require_tenant(context)
    try:
        project = await get_project(session, tenant_id, project_id)
        if not project:
            raise DomainError("Proje bulunamadi.", "PROJECT_NOT_FOUND", 404)
        return ApiSuccess(data=project)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/{project_id}", response_model=ApiSuccess[dict[str, Any]])
async def projects_update(
    project_id: str,
    request: ProjectUpdateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "projects.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            project = await update_project(
                session,
                service_context(context, tenant_id),
                project_id,
                request,
            )
        return ApiSuccess(data=project, message="Proje guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.delete("/{project_id}", response_model=ApiSuccess[dict[str, Any]])
async def projects_delete(
    project_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "projects.delete")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await delete_project(session, service_context(context, tenant_id), project_id)
        return ApiSuccess(data=result, message="Proje silindi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/{project_id}/summary", response_model=ApiSuccess[dict[str, Any]])
async def project_summary(
    project_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "projects.view")
    tenant_id = require_tenant(context)
    try:
        summary = await get_project_summary(
            session,
            service_context(context, tenant_id),
            project_id,
        )
        return ApiSuccess(data=summary.model_dump())
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
