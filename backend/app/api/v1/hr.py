from __future__ import annotations

from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.hr.documents import (
    create_employee_document,
    list_employee_documents,
    update_employee_document,
)
from app.domains.hr.employees import (
    create_employee,
    delete_employee,
    get_employee,
    get_employee_summary,
    list_employees,
    update_employee,
)
from app.domains.hr.employment import (
    change_assignment,
    mark_sgk_entry_completed,
    mark_sgk_exit_completed,
    start_employment,
    terminate_employment,
)
from app.domains.hr.schemas import (
    AssignmentChangeRequest,
    EmployeeCreateRequest,
    EmployeeDocumentCreateRequest,
    EmployeeDocumentUpdateRequest,
    EmployeeListQuery,
    EmployeeUpdateRequest,
    EmploymentStartRequest,
    EmploymentTerminateRequest,
    SgkCompletedRequest,
)
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]
StartDateFromQuery = Annotated[date | None, Query(alias="startDateFrom")]
StartDateToQuery = Annotated[date | None, Query(alias="startDateTo")]


@router.get("/employees/summary", response_model=ApiSuccess[dict[str, Any]])
async def employees_summary(
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.view")
    tenant_id = require_tenant(context)
    try:
        summary = await get_employee_summary(session, service_context(context, tenant_id))
        return ApiSuccess(data=summary.model_dump())
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/company/{company_id}/summary", response_model=ApiSuccess[dict[str, Any]])
async def company_hr_summary(
    company_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.view")
    tenant_id = require_tenant(context)
    try:
        summary = await get_employee_summary(
            session,
            service_context(context, tenant_id),
            company_id,
        )
        return ApiSuccess(data=summary.model_dump())
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/employees", response_model=ApiSuccess[dict[str, Any]])
async def employees_list(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    branch_id: str | None = Query(default=None),
    organization_unit_id: str | None = Query(default=None),
    position_id: str | None = Query(default=None),
    employment_status: str | None = Query(default=None),
    employment_type: str | None = Query(default=None),
    sgk_status: str | None = Query(default=None),
    gender: str | None = Query(default=None),
    education_level: str | None = Query(default=None),
    record_status: str | None = Query(default=None),
    start_date_from: StartDateFromQuery = None,
    start_date_to: StartDateToQuery = None,
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    sort: str = Query(default="updated_at"),
    direction: str = Query(default="desc"),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.view")
    tenant_id = require_tenant(context)
    try:
        result = await list_employees(
            session,
            service_context(context, tenant_id),
            EmployeeListQuery(
                company_id=company_id,
                branch_id=branch_id,
                organization_unit_id=organization_unit_id,
                position_id=position_id,
                employment_status=employment_status,
                employment_type=employment_type,
                sgk_status=sgk_status,
                gender=gender,
                education_level=education_level,
                record_status=record_status,
                start_date_from=start_date_from,
                start_date_to=start_date_to,
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


@router.post("/employees", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def employees_create(
    request: EmployeeCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.employeeCreate")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            employee = await create_employee(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=employee, message="Calisan karti taslagi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/employees/{employee_id}", response_model=ApiSuccess[dict[str, Any]])
async def employees_get(
    employee_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.view")
    tenant_id = require_tenant(context)
    try:
        employee = await get_employee(session, tenant_id, employee_id)
        if not employee:
            raise DomainError("Calisan bulunamadi.", "EMPLOYEE_NOT_FOUND", 404)
        return ApiSuccess(data=employee)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/employees/{employee_id}", response_model=ApiSuccess[dict[str, Any]])
async def employees_update(
    employee_id: str,
    payload: EmployeeUpdateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            employee = await update_employee(
                session,
                service_context(context, tenant_id),
                employee_id,
                payload,
            )
        return ApiSuccess(data=employee, message="Calisan karti guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.delete("/employees/{employee_id}", response_model=ApiSuccess[dict[str, Any]])
async def employees_delete(
    employee_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await delete_employee(
                session,
                service_context(context, tenant_id),
                employee_id,
            )
        return ApiSuccess(data=result, message=result.get("message"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post(
    "/employees/{employee_id}/employment/start",
    response_model=ApiSuccess[dict[str, Any]],
)
async def employment_start(
    employee_id: str,
    request: EmploymentStartRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.employmentStart")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            employee = await start_employment(
                session,
                service_context(context, tenant_id),
                employee_id,
                request,
            )
        return ApiSuccess(data=employee, message="Ise giris tamamlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post(
    "/employees/{employee_id}/employment/terminate",
    response_model=ApiSuccess[dict[str, Any]],
)
async def employment_terminate(
    employee_id: str,
    request: EmploymentTerminateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.employmentTerminate")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            employee = await terminate_employment(
                session,
                service_context(context, tenant_id),
                employee_id,
                request,
            )
        return ApiSuccess(data=employee, message="Isten cikis tamamlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post(
    "/employees/{employee_id}/employment/assignment-change",
    response_model=ApiSuccess[dict[str, Any]],
)
async def employment_assignment_change(
    employee_id: str,
    request: AssignmentChangeRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.assignmentChange")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            employee = await change_assignment(
                session,
                service_context(context, tenant_id),
                employee_id,
                request,
            )
        return ApiSuccess(data=employee, message="Organizasyon/pozisyon degisikligi kaydedildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post(
    "/employees/{employee_id}/sgk/entry-completed",
    response_model=ApiSuccess[dict[str, Any]],
)
async def sgk_entry_completed(
    employee_id: str,
    request: SgkCompletedRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.employmentStart")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            employee = await mark_sgk_entry_completed(
                session,
                service_context(context, tenant_id),
                employee_id,
                request,
            )
        return ApiSuccess(data=employee, message="SGK girisi manuel tamamlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post(
    "/employees/{employee_id}/sgk/exit-completed",
    response_model=ApiSuccess[dict[str, Any]],
)
async def sgk_exit_completed(
    employee_id: str,
    request: SgkCompletedRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.employmentTerminate")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            employee = await mark_sgk_exit_completed(
                session,
                service_context(context, tenant_id),
                employee_id,
                request,
            )
        return ApiSuccess(data=employee, message="SGK cikisi manuel tamamlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/employees/{employee_id}/documents", response_model=ApiSuccess[list[dict[str, Any]]])
async def documents_list(
    employee_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "hr.view")
    tenant_id = require_tenant(context)
    try:
        documents = await list_employee_documents(
            session,
            service_context(context, tenant_id),
            employee_id,
        )
        return ApiSuccess(data=documents)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post(
    "/employees/{employee_id}/documents",
    response_model=ApiSuccess[dict[str, Any]],
    status_code=201,
)
async def documents_create(
    employee_id: str,
    request: EmployeeDocumentCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.documentsManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            document = await create_employee_document(
                session,
                service_context(context, tenant_id),
                employee_id,
                request,
            )
        return ApiSuccess(data=document, message="Calisan belgesi eklendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch(
    "/employees/{employee_id}/documents/{document_id}",
    response_model=ApiSuccess[dict[str, Any]],
)
async def documents_update(
    employee_id: str,
    document_id: str,
    request: EmployeeDocumentUpdateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.documentsManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            document = await update_employee_document(
                session,
                service_context(context, tenant_id),
                employee_id,
                document_id,
                request,
            )
        return ApiSuccess(data=document, message="Calisan belgesi guncellendi.")
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
