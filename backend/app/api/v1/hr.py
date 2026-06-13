from __future__ import annotations

from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.hr.attendance import (
    create_attendance_record,
    import_attendance_records,
    list_attendance_records,
    update_attendance_record,
)
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
from app.domains.hr.leave_balances import (
    adjust_leave_balance,
    list_employee_leave_balances,
    recalculate_employee_leave_balances,
)
from app.domains.hr.leave_requests import (
    approve_leave_request,
    cancel_leave_request,
    create_leave_request,
    get_leave_request,
    list_leave_requests,
    reject_leave_request,
    submit_leave_request,
    update_leave_request,
)
from app.domains.hr.leave_types import (
    create_leave_type,
    get_leave_type,
    list_leave_types,
    update_leave_type,
)
from app.domains.hr.payroll_prep import (
    get_payroll_prep_for_period,
    list_payroll_prep_rows,
    mark_payroll_prep_ready,
)
from app.domains.hr.schemas import (
    AssignmentChangeRequest,
    AttendanceCreateRequest,
    AttendanceImportRequest,
    AttendanceListQuery,
    AttendanceUpdateRequest,
    EmployeeCreateRequest,
    EmployeeDocumentCreateRequest,
    EmployeeDocumentResponse,
    EmployeeDocumentUpdateRequest,
    EmployeeListResponse,
    EmployeeRecordResponse,
    EmployeeListQuery,
    EmployeeSummary,
    EmployeeUpdateRequest,
    EmploymentStartRequest,
    EmploymentTerminateRequest,
    LeaveBalanceAdjustRequest,
    LeaveCancelRequest,
    LeaveRejectRequest,
    LeaveRequestCreateRequest,
    LeaveRequestListQuery,
    LeaveRequestUpdateRequest,
    LeaveTypeCreateRequest,
    LeaveTypeListQuery,
    LeaveTypeUpdateRequest,
    PayrollPrepListQuery,
    SgkCompletedRequest,
    TimesheetCreateRequest,
    TimesheetListQuery,
    WorkScheduleAssignmentRequest,
    WorkScheduleCreateRequest,
    WorkScheduleListQuery,
    WorkScheduleUpdateRequest,
)
from app.domains.hr.timesheets import (
    approve_timesheet_period,
    calculate_timesheet_period,
    create_timesheet_period,
    get_timesheet_period,
    list_timesheet_periods,
    lock_timesheet_period,
)
from app.domains.hr.work_schedules import (
    assign_work_schedule_to_employee,
    create_work_schedule,
    list_work_schedules,
    update_work_schedule,
)
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]
StartDateFromQuery = Annotated[date | None, Query(alias="startDateFrom")]
StartDateToQuery = Annotated[date | None, Query(alias="startDateTo")]
DateFromQuery = Annotated[date | None, Query(alias="dateFrom")]
DateToQuery = Annotated[date | None, Query(alias="dateTo")]
PeriodFromQuery = Annotated[date | None, Query(alias="periodFrom")]
PeriodToQuery = Annotated[date | None, Query(alias="periodTo")]


@router.get("/employees/summary", response_model=ApiSuccess[EmployeeSummary])
async def employees_summary(
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[EmployeeSummary]:
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


@router.get("/leave-types", response_model=ApiSuccess[dict[str, Any]])
async def leave_types_list(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    category: str | None = Query(default=None),
    active: bool | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    sort: str = Query(default="leave_type_name"),
    direction: str = Query(default="asc"),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.leaveView")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await list_leave_types(
                session,
                service_context(context, tenant_id),
                LeaveTypeListQuery(
                    company_id=company_id,
                    category=category,
                    active=active,
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


@router.post("/leave-types", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def leave_types_create(
    request: LeaveTypeCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.leaveAdmin")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await create_leave_type(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=row, message="Izin turu olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/leave-types/{leave_type_id}", response_model=ApiSuccess[dict[str, Any]])
async def leave_types_get(
    leave_type_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.leaveView")
    tenant_id = require_tenant(context)
    try:
        row = await get_leave_type(session, tenant_id, leave_type_id)
        if not row:
            raise DomainError("Izin turu bulunamadi.", "LEAVE_TYPE_NOT_FOUND", 404)
        return ApiSuccess(data=row)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/leave-types/{leave_type_id}", response_model=ApiSuccess[dict[str, Any]])
async def leave_types_update(
    leave_type_id: str,
    request: LeaveTypeUpdateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.leaveAdmin")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await update_leave_type(
                session,
                service_context(context, tenant_id),
                leave_type_id,
                request,
            )
        return ApiSuccess(data=row, message="Izin turu guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get(
    "/employees/{employee_id}/leave-balances", response_model=ApiSuccess[list[dict[str, Any]]]
)
async def employee_leave_balances(
    employee_id: str,
    session: SessionDep,
    context: RequestContextDep,
    period_year: int | None = Query(default=None, alias="periodYear"),
) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "hr.leaveView")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            rows = await list_employee_leave_balances(
                session,
                service_context(context, tenant_id),
                employee_id,
                period_year=period_year,
            )
        return ApiSuccess(data=rows)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post(
    "/employees/{employee_id}/leave-balances/recalculate",
    response_model=ApiSuccess[list[dict[str, Any]]],
)
async def employee_leave_balances_recalculate(
    employee_id: str,
    session: SessionDep,
    context: RequestContextDep,
    period_year: int | None = Query(default=None, alias="periodYear"),
) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "hr.leaveAdmin")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            rows = await recalculate_employee_leave_balances(
                session,
                service_context(context, tenant_id),
                employee_id,
                period_year=period_year,
            )
        return ApiSuccess(data=rows, message="Izin bakiyeleri yeniden hesaplandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/leave-balances/{balance_id}/adjust", response_model=ApiSuccess[dict[str, Any]])
async def leave_balances_adjust(
    balance_id: str,
    request: LeaveBalanceAdjustRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.leaveAdmin")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await adjust_leave_balance(
                session,
                service_context(context, tenant_id),
                balance_id,
                request,
            )
        return ApiSuccess(data=row, message="Izin bakiyesi guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/leave-requests", response_model=ApiSuccess[dict[str, Any]])
async def leave_requests_list(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    employee_id: str | None = Query(default=None),
    leave_type_id: str | None = Query(default=None),
    status_value: str | None = Query(default=None, alias="status"),
    approver_id: str | None = Query(default=None),
    mine: bool = Query(default=False),
    pending_approval: bool = Query(default=False, alias="pendingApproval"),
    date_from: DateFromQuery = None,
    date_to: DateToQuery = None,
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    sort: str = Query(default="created_at"),
    direction: str = Query(default="desc"),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.leaveView")
    tenant_id = require_tenant(context)
    try:
        result = await list_leave_requests(
            session,
            service_context(context, tenant_id),
            LeaveRequestListQuery(
                company_id=company_id,
                employee_id=employee_id,
                leave_type_id=leave_type_id,
                status=status_value,
                approver_id=approver_id,
                mine=mine,
                pending_approval=pending_approval,
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


@router.post("/leave-requests", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def leave_requests_create(
    request: LeaveRequestCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.leaveRequestCreate")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await create_leave_request(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=row, message="Izin talebi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/leave-requests/{leave_request_id}", response_model=ApiSuccess[dict[str, Any]])
async def leave_requests_get(
    leave_request_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.leaveView")
    tenant_id = require_tenant(context)
    try:
        row = await get_leave_request(session, tenant_id, leave_request_id)
        if not row:
            raise DomainError("Izin talebi bulunamadi.", "LEAVE_REQUEST_NOT_FOUND", 404)
        return ApiSuccess(data=row)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/leave-requests/{leave_request_id}", response_model=ApiSuccess[dict[str, Any]])
async def leave_requests_update(
    leave_request_id: str,
    request: LeaveRequestUpdateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.leaveRequestCreate")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await update_leave_request(
                session,
                service_context(context, tenant_id),
                leave_request_id,
                request,
            )
        return ApiSuccess(data=row, message="Izin talebi guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/leave-requests/{leave_request_id}/submit", response_model=ApiSuccess[dict[str, Any]])
async def leave_requests_submit(
    leave_request_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.leaveRequestCreate")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await submit_leave_request(
                session,
                service_context(context, tenant_id),
                leave_request_id,
            )
        return ApiSuccess(data=row, message="Izin talebi gonderildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post(
    "/leave-requests/{leave_request_id}/approve", response_model=ApiSuccess[dict[str, Any]]
)
async def leave_requests_approve(
    leave_request_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.leaveApprove")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await approve_leave_request(
                session,
                service_context(context, tenant_id),
                leave_request_id,
            )
        return ApiSuccess(data=row, message="Izin talebi onaylandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/leave-requests/{leave_request_id}/reject", response_model=ApiSuccess[dict[str, Any]])
async def leave_requests_reject(
    leave_request_id: str,
    request: LeaveRejectRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.leaveApprove")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await reject_leave_request(
                session,
                service_context(context, tenant_id),
                leave_request_id,
                request,
            )
        return ApiSuccess(data=row, message="Izin talebi reddedildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/leave-requests/{leave_request_id}/cancel", response_model=ApiSuccess[dict[str, Any]])
async def leave_requests_cancel(
    leave_request_id: str,
    request: LeaveCancelRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.leaveRequestCreate")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await cancel_leave_request(
                session,
                service_context(context, tenant_id),
                leave_request_id,
                request,
            )
        return ApiSuccess(data=row, message="Izin talebi iptal edildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/attendance", response_model=ApiSuccess[dict[str, Any]])
async def attendance_list(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    employee_id: str | None = Query(default=None),
    status_value: str | None = Query(default=None, alias="status"),
    source: str | None = Query(default=None),
    approved: bool | None = Query(default=None),
    date_from: DateFromQuery = None,
    date_to: DateToQuery = None,
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    sort: str = Query(default="work_date"),
    direction: str = Query(default="desc"),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.attendanceView")
    tenant_id = require_tenant(context)
    try:
        result = await list_attendance_records(
            session,
            service_context(context, tenant_id),
            AttendanceListQuery(
                company_id=company_id,
                employee_id=employee_id,
                status=status_value,
                source=source,
                approved=approved,
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


@router.post("/attendance", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def attendance_create(
    request: AttendanceCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.attendanceEdit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await create_attendance_record(
                session,
                service_context(context, tenant_id),
                request,
            )
        return ApiSuccess(data=row, message="Devam-devamsizlik kaydi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/attendance/{attendance_id}", response_model=ApiSuccess[dict[str, Any]])
async def attendance_update(
    attendance_id: str,
    request: AttendanceUpdateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.attendanceEdit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await update_attendance_record(
                session,
                service_context(context, tenant_id),
                attendance_id,
                request,
            )
        return ApiSuccess(data=row, message="Devam-devamsizlik kaydi guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/attendance/import", response_model=ApiSuccess[dict[str, Any]])
async def attendance_import(
    request: AttendanceImportRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.attendanceEdit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await import_attendance_records(
                session,
                service_context(context, tenant_id),
                request,
            )
        return ApiSuccess(data=row, message="Devam-devamsizlik import hazirlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/work-schedules", response_model=ApiSuccess[dict[str, Any]])
async def work_schedules_list(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    active: bool | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    sort: str = Query(default="schedule_name"),
    direction: str = Query(default="asc"),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.attendanceView")
    tenant_id = require_tenant(context)
    try:
        result = await list_work_schedules(
            session,
            service_context(context, tenant_id),
            WorkScheduleListQuery(
                company_id=company_id,
                active=active,
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


@router.post("/work-schedules", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def work_schedules_create(
    request: WorkScheduleCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.attendanceEdit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await create_work_schedule(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=row, message="Calisma plani olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/work-schedules/{schedule_id}", response_model=ApiSuccess[dict[str, Any]])
async def work_schedules_update(
    schedule_id: str,
    request: WorkScheduleUpdateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.attendanceEdit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await update_work_schedule(
                session,
                service_context(context, tenant_id),
                schedule_id,
                request,
            )
        return ApiSuccess(data=row, message="Calisma plani guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post(
    "/employees/{employee_id}/work-schedule-assignment",
    response_model=ApiSuccess[dict[str, Any]],
)
async def work_schedule_assignment_create(
    employee_id: str,
    request: WorkScheduleAssignmentRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.attendanceEdit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await assign_work_schedule_to_employee(
                session,
                service_context(context, tenant_id),
                employee_id,
                request,
            )
        return ApiSuccess(data=row, message="Calisma plani calisana atandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/timesheets", response_model=ApiSuccess[dict[str, Any]])
async def timesheets_list(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    status_value: str | None = Query(default=None, alias="status"),
    period_from: PeriodFromQuery = None,
    period_to: PeriodToQuery = None,
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    sort: str = Query(default="period_start"),
    direction: str = Query(default="desc"),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.timesheetView")
    tenant_id = require_tenant(context)
    try:
        result = await list_timesheet_periods(
            session,
            service_context(context, tenant_id),
            TimesheetListQuery(
                company_id=company_id,
                status=status_value,
                period_from=period_from,
                period_to=period_to,
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


@router.post("/timesheets", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def timesheets_create(
    request: TimesheetCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.timesheetManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await create_timesheet_period(
                session, service_context(context, tenant_id), request
            )
        return ApiSuccess(data=row, message="Puantaj donemi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/timesheets/{period_id}", response_model=ApiSuccess[dict[str, Any]])
async def timesheets_get(
    period_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.timesheetView")
    tenant_id = require_tenant(context)
    try:
        row = await get_timesheet_period(session, tenant_id, period_id)
        if not row:
            raise DomainError("Puantaj donemi bulunamadi.", "TIMESHEET_PERIOD_NOT_FOUND", 404)
        return ApiSuccess(data=row)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/timesheets/{period_id}/calculate", response_model=ApiSuccess[dict[str, Any]])
async def timesheets_calculate(
    period_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.timesheetManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await calculate_timesheet_period(
                session,
                service_context(context, tenant_id),
                period_id,
            )
        return ApiSuccess(data=row, message="Puantaj hesaplandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/timesheets/{period_id}/approve", response_model=ApiSuccess[dict[str, Any]])
async def timesheets_approve(
    period_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.timesheetApprove")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await approve_timesheet_period(
                session,
                service_context(context, tenant_id),
                period_id,
            )
        return ApiSuccess(data=row, message="Puantaj onaylandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/timesheets/{period_id}/lock", response_model=ApiSuccess[dict[str, Any]])
async def timesheets_lock(
    period_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.timesheetApprove")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await lock_timesheet_period(
                session,
                service_context(context, tenant_id),
                period_id,
            )
        return ApiSuccess(data=row, message="Puantaj kilitlendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/payroll-prep", response_model=ApiSuccess[dict[str, Any]])
async def payroll_prep_list(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    period_id: str | None = Query(default=None),
    employee_id: str | None = Query(default=None),
    payroll_status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    sort: str = Query(default="updated_at"),
    direction: str = Query(default="desc"),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.payrollPrepView")
    tenant_id = require_tenant(context)
    try:
        result = await list_payroll_prep_rows(
            session,
            service_context(context, tenant_id),
            PayrollPrepListQuery(
                company_id=company_id,
                period_id=period_id,
                employee_id=employee_id,
                payroll_status=payroll_status,
                page=page,
                page_size=page_size,
                sort=sort,
                direction=direction,
            ),
        )
        return ApiSuccess(data={"data": result.data, "meta": result.meta})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/payroll-prep/{period_id}", response_model=ApiSuccess[dict[str, Any]])
async def payroll_prep_period(
    period_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.payrollPrepView")
    tenant_id = require_tenant(context)
    try:
        row = await get_payroll_prep_for_period(
            session, service_context(context, tenant_id), period_id
        )
        return ApiSuccess(data=row)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/payroll-prep/{period_id}/mark-ready", response_model=ApiSuccess[dict[str, Any]])
async def payroll_prep_mark_ready(
    period_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "hr.payrollPrepManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await mark_payroll_prep_ready(
                session,
                service_context(context, tenant_id),
                period_id,
            )
        return ApiSuccess(data=row, message="Bordro hazirlik verisi hazir.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/employees", response_model=ApiSuccess[EmployeeListResponse])
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
) -> ApiSuccess[EmployeeListResponse]:
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


@router.post("/employees", response_model=ApiSuccess[EmployeeRecordResponse], status_code=201)
async def employees_create(
    request: EmployeeCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[EmployeeRecordResponse]:
    ensure_permission(context, "hr.employeeCreate")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            employee = await create_employee(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=employee, message="Calisan karti taslagi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/employees/{employee_id}", response_model=ApiSuccess[EmployeeRecordResponse])
async def employees_get(
    employee_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[EmployeeRecordResponse]:
    ensure_permission(context, "hr.view")
    tenant_id = require_tenant(context)
    try:
        employee = await get_employee(session, tenant_id, employee_id)
        if not employee:
            raise DomainError("Calisan bulunamadi.", "EMPLOYEE_NOT_FOUND", 404)
        return ApiSuccess(data=employee)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/employees/{employee_id}", response_model=ApiSuccess[EmployeeRecordResponse])
async def employees_update(
    employee_id: str,
    payload: EmployeeUpdateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[EmployeeRecordResponse]:
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
    response_model=ApiSuccess[EmployeeRecordResponse],
)
async def employment_start(
    employee_id: str,
    request: EmploymentStartRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[EmployeeRecordResponse]:
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
    response_model=ApiSuccess[EmployeeRecordResponse],
)
async def employment_terminate(
    employee_id: str,
    request: EmploymentTerminateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[EmployeeRecordResponse]:
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
    response_model=ApiSuccess[EmployeeRecordResponse],
)
async def employment_assignment_change(
    employee_id: str,
    request: AssignmentChangeRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[EmployeeRecordResponse]:
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
    response_model=ApiSuccess[EmployeeRecordResponse],
)
async def sgk_entry_completed(
    employee_id: str,
    request: SgkCompletedRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[EmployeeRecordResponse]:
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
    response_model=ApiSuccess[EmployeeRecordResponse],
)
async def sgk_exit_completed(
    employee_id: str,
    request: SgkCompletedRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[EmployeeRecordResponse]:
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


@router.get("/employees/{employee_id}/documents", response_model=ApiSuccess[list[EmployeeDocumentResponse]])
async def documents_list(
    employee_id: str,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[list[EmployeeDocumentResponse]]:
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
    response_model=ApiSuccess[EmployeeDocumentResponse],
    status_code=201,
)
async def documents_create(
    employee_id: str,
    request: EmployeeDocumentCreateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[EmployeeDocumentResponse]:
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
    response_model=ApiSuccess[EmployeeDocumentResponse],
)
async def documents_update(
    employee_id: str,
    document_id: str,
    request: EmployeeDocumentUpdateRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[EmployeeDocumentResponse]:
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
