from __future__ import annotations

# ruff: noqa: E501, I001

from datetime import date, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.after_sales.assets import create_asset, delete_asset, get_asset, list_assets, service_history, update_asset
from app.domains.after_sales.assignments import (
    accept_field_assignment,
    assign_technician,
    get_field_assignment,
    list_field_assignments,
    reject_field_assignment,
    set_field_assignment_status,
)
from app.domains.after_sales.checklists import create_checklist_template, get_service_checklist, list_checklist_templates, patch_service_checklist
from app.domains.after_sales.field_service import append_service_photos, start_service_record
from app.domains.after_sales.maintenance import (
    create_maintenance_plan,
    create_service_request_from_due,
    get_maintenance_plan,
    list_maintenance_due,
    list_maintenance_plans,
    skip_due_item,
    update_maintenance_plan,
)
from app.domains.after_sales.reports import service_report_preview
from app.domains.after_sales.schemas import (
    ChecklistTemplateCreateRequest,
    ChecklistTemplateListQuery,
    FieldAssignmentListQuery,
    FieldAssignmentRejectRequest,
    FieldAssignmentStatusRequest,
    InstalledAssetCreateRequest,
    InstalledAssetListQuery,
    InstalledAssetUpdateRequest,
    MaintenanceDueCreateServiceRequest,
    MaintenanceDueListQuery,
    MaintenanceDueSkipRequest,
    MaintenancePlanCreateRequest,
    MaintenancePlanListQuery,
    MaintenancePlanUpdateRequest,
    ServiceChecklistPatchRequest,
    ServiceRecordCompleteRequest,
    ServiceRecordCreateRequest,
    ServiceRecordListQuery,
    ServiceRecordPhotosRequest,
    ServiceRecordStartRequest,
    ServiceRecordUpdateRequest,
    ServiceRequestAssignRequest,
    ServiceRequestAssignTechnicianRequest,
    ServiceRequestCloseRequest,
    ServiceRequestCreateRequest,
    ServiceRequestListQuery,
    ServiceRequestUpdateRequest,
)
from app.domains.after_sales.service_records import after_sales_summary, complete_service_record, create_service_record, get_service_record, list_service_records, update_service_record
from app.domains.after_sales.service_requests import assign_service_request, close_service_request, create_service_request, get_service_request, list_service_requests, update_service_request
from app.domains.after_sales.warranty import warranty_check
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]
DueFromQuery = Annotated[date | None, Query(alias="dueFrom")]
DueToQuery = Annotated[date | None, Query(alias="dueTo")]
DateFromQuery = Annotated[date | None, Query(alias="dateFrom")]
DateToQuery = Annotated[date | None, Query(alias="dateTo")]
MaintenanceUntilQuery = Annotated[date | None, Query(alias="until")]
ScheduledFromQuery = Annotated[datetime | None, Query(alias="scheduledFrom")]
ScheduledToQuery = Annotated[datetime | None, Query(alias="scheduledTo")]
ServiceDateQuery = Annotated[date | None, Query(alias="serviceDate")]


@router.get("/company/{company_id}/summary", response_model=ApiSuccess[dict[str, Any]])
async def company_after_sales_summary(company_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.view")
    tenant_id = require_tenant(context)
    try:
        summary = await after_sales_summary(session, service_context(context, tenant_id), company_id)
        return ApiSuccess(data=summary.model_dump())
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/maintenance-plans", response_model=ApiSuccess[dict[str, Any]])
async def maintenance_plans_list(session: SessionDep, context: RequestContextDep, company_id: str | None = Query(default=None), product_id: str | None = Query(default=None), installed_asset_id: str | None = Query(default=None), active: bool | None = Query(default=None), search: str | None = Query(default=None), page: int = Query(default=1, ge=1), page_size: int = Query(default=50, alias="pageSize", ge=1, le=200), sort: str = Query(default="updated_at"), direction: str = Query(default="desc")) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.maintenanceView")
    tenant_id = require_tenant(context)
    try:
        result = await list_maintenance_plans(session, service_context(context, tenant_id), MaintenancePlanListQuery(company_id=company_id, product_id=product_id, installed_asset_id=installed_asset_id, active=active, search=search, page=page, page_size=page_size, sort=sort, direction=direction))
        return ApiSuccess(data={"data": result.data, "meta": result.meta})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/maintenance-plans", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def maintenance_plans_create(request: MaintenancePlanCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.maintenanceManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await create_maintenance_plan(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=row, message="Bakim plani olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/maintenance-plans/{plan_id}", response_model=ApiSuccess[dict[str, Any]])
async def maintenance_plans_get(plan_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.maintenanceView")
    tenant_id = require_tenant(context)
    try:
        row = await get_maintenance_plan(session, tenant_id, plan_id)
        if not row:
            raise DomainError("Bakim plani bulunamadi.", "MAINTENANCE_PLAN_NOT_FOUND", 404)
        return ApiSuccess(data=row)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/maintenance-plans/{plan_id}", response_model=ApiSuccess[dict[str, Any]])
async def maintenance_plans_update(plan_id: str, request: MaintenancePlanUpdateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.maintenanceManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await update_maintenance_plan(session, service_context(context, tenant_id), plan_id, request)
        return ApiSuccess(data=row, message="Bakim plani guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/maintenance-due", response_model=ApiSuccess[list[dict[str, Any]]])
async def after_sales_maintenance_due(session: SessionDep, context: RequestContextDep, company_id: str | None = Query(default=None), maintenance_plan_id: str | None = Query(default=None), installed_asset_id: str | None = Query(default=None), status_value: str | None = Query(default=None, alias="status"), assigned_user_id: str | None = Query(default=None), due_from: DueFromQuery = None, until: MaintenanceUntilQuery = None, limit: int = Query(default=100, ge=1, le=500)) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "afterSales.maintenanceView")
    tenant_id = require_tenant(context)
    try:
        rows = await list_maintenance_due(session, service_context(context, tenant_id), MaintenanceDueListQuery(company_id=company_id, maintenance_plan_id=maintenance_plan_id, installed_asset_id=installed_asset_id, status=status_value, assigned_user_id=assigned_user_id, due_from=due_from, due_until=until, limit=limit))
        return ApiSuccess(data=rows)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/maintenance-due/{due_id}/create-service-request", response_model=ApiSuccess[dict[str, Any]])
async def maintenance_due_create_service_request(due_id: str, request: MaintenanceDueCreateServiceRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.requestCreate")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await create_service_request_from_due(session, service_context(context, tenant_id), due_id, request)
        return ApiSuccess(data=row, message="Bakimdan servis talebi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/maintenance-due/{due_id}/skip", response_model=ApiSuccess[dict[str, Any]])
async def maintenance_due_skip(due_id: str, request: MaintenanceDueSkipRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.maintenanceManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await skip_due_item(session, service_context(context, tenant_id), due_id, request)
        return ApiSuccess(data=row, message="Bakim takvimi atlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/assets", response_model=ApiSuccess[dict[str, Any]])
async def assets_list(session: SessionDep, context: RequestContextDep, company_id: str | None = Query(default=None), customer_account_id: str | None = Query(default=None), product_id: str | None = Query(default=None), warranty_status: str | None = Query(default=None), status_value: str | None = Query(default=None, alias="status"), serial_no: str | None = Query(default=None), maintenance_due_until: MaintenanceUntilQuery = None, search: str | None = Query(default=None), page: int = Query(default=1, ge=1), page_size: int = Query(default=50, alias="pageSize", ge=1, le=200), sort: str = Query(default="updated_at"), direction: str = Query(default="desc")) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.view")
    tenant_id = require_tenant(context)
    try:
        result = await list_assets(session, service_context(context, tenant_id), InstalledAssetListQuery(company_id=company_id, customer_account_id=customer_account_id, product_id=product_id, warranty_status=warranty_status, status=status_value, serial_no=serial_no, maintenance_due_until=maintenance_due_until, search=search, page=page, page_size=page_size, sort=sort, direction=direction))
        return ApiSuccess(data={"data": result.data, "meta": result.meta})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/assets", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def assets_create(request: InstalledAssetCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.assetCreate")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            asset = await create_asset(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=asset, message="Kurulu urun kaydi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/assets/{asset_id}", response_model=ApiSuccess[dict[str, Any]])
async def assets_get(asset_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.view")
    tenant_id = require_tenant(context)
    try:
        asset = await get_asset(session, tenant_id, asset_id)
        if not asset:
            raise DomainError("Kurulu urun kaydi bulunamadi.", "INSTALLED_ASSET_NOT_FOUND", 404)
        return ApiSuccess(data=asset)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/assets/{asset_id}", response_model=ApiSuccess[dict[str, Any]])
async def assets_update(asset_id: str, request: InstalledAssetUpdateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            asset = await update_asset(session, service_context(context, tenant_id), asset_id, request)
        return ApiSuccess(data=asset, message="Kurulu urun kaydi guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.delete("/assets/{asset_id}", response_model=ApiSuccess[dict[str, Any]])
async def assets_delete(asset_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.admin")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await delete_asset(session, service_context(context, tenant_id), asset_id)
        return ApiSuccess(data=result, message="Kurulu urun kaydi silindi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/assets/{asset_id}/service-history", response_model=ApiSuccess[list[dict[str, Any]]])
async def assets_service_history(asset_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "afterSales.view")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await service_history(session, service_context(context, tenant_id), asset_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/assets/{asset_id}/warranty-check", response_model=ApiSuccess[dict[str, Any]])
async def assets_warranty_check(
    asset_id: str,
    session: SessionDep,
    context: RequestContextDep,
    service_date: ServiceDateQuery = None,
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.view")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await warranty_check(session, service_context(context, tenant_id), asset_id, service_date=service_date))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/service-requests", response_model=ApiSuccess[dict[str, Any]])
async def service_requests_list(session: SessionDep, context: RequestContextDep, company_id: str | None = Query(default=None), customer_account_id: str | None = Query(default=None), installed_asset_id: str | None = Query(default=None), product_id: str | None = Query(default=None), status_value: str | None = Query(default=None, alias="status"), priority: str | None = Query(default=None), assigned_user_id: str | None = Query(default=None), assigned_employee_id: str | None = Query(default=None), due_from: DueFromQuery = None, due_to: DueToQuery = None, source: str | None = Query(default=None), search: str | None = Query(default=None), page: int = Query(default=1, ge=1), page_size: int = Query(default=50, alias="pageSize", ge=1, le=200), sort: str = Query(default="updated_at"), direction: str = Query(default="desc")) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.view")
    tenant_id = require_tenant(context)
    try:
        result = await list_service_requests(session, service_context(context, tenant_id), ServiceRequestListQuery(company_id=company_id, customer_account_id=customer_account_id, installed_asset_id=installed_asset_id, product_id=product_id, status=status_value, priority=priority, assigned_user_id=assigned_user_id, assigned_employee_id=assigned_employee_id, due_from=due_from, due_to=due_to, source=source, search=search, page=page, page_size=page_size, sort=sort, direction=direction))
        return ApiSuccess(data={"data": result.data, "meta": result.meta})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/service-requests", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def service_requests_create(request: ServiceRequestCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.requestCreate")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            item = await create_service_request(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=item, message="Servis talebi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/service-requests/{request_id}", response_model=ApiSuccess[dict[str, Any]])
async def service_requests_get(request_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.view")
    tenant_id = require_tenant(context)
    try:
        item = await get_service_request(session, tenant_id, request_id)
        if not item:
            raise DomainError("Servis talebi bulunamadi.", "SERVICE_REQUEST_NOT_FOUND", 404)
        return ApiSuccess(data=item)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/service-requests/{request_id}", response_model=ApiSuccess[dict[str, Any]])
async def service_requests_update(request_id: str, request: ServiceRequestUpdateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            item = await update_service_request(session, service_context(context, tenant_id), request_id, request)
        return ApiSuccess(data=item, message="Servis talebi guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/service-requests/{request_id}/assign", response_model=ApiSuccess[dict[str, Any]])
async def service_requests_assign(request_id: str, request: ServiceRequestAssignRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.requestAssign")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            item = await assign_service_request(session, service_context(context, tenant_id), request_id, request)
        return ApiSuccess(data=item, message="Servis talebi atandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/service-requests/{request_id}/assign-technician", response_model=ApiSuccess[dict[str, Any]])
async def service_requests_assign_technician(request_id: str, request: ServiceRequestAssignTechnicianRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.fieldServiceAssign")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            item = await assign_technician(session, service_context(context, tenant_id), request_id, request)
        return ApiSuccess(data=item, message="Teknisyen atandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/service-requests/{request_id}/close", response_model=ApiSuccess[dict[str, Any]])
async def service_requests_close(request_id: str, request: ServiceRequestCloseRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            item = await close_service_request(session, service_context(context, tenant_id), request_id, request)
        return ApiSuccess(data=item, message="Servis talebi kapatildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/field-assignments", response_model=ApiSuccess[dict[str, Any]])
async def field_assignments_list(session: SessionDep, context: RequestContextDep, company_id: str | None = Query(default=None), service_request_id: str | None = Query(default=None), service_record_id: str | None = Query(default=None), installed_asset_id: str | None = Query(default=None), technician_user_id: str | None = Query(default=None), technician_employee_id: str | None = Query(default=None), status_value: str | None = Query(default=None, alias="status"), scheduled_from: ScheduledFromQuery = None, scheduled_to: ScheduledToQuery = None, mine: bool = Query(default=False), page: int = Query(default=1, ge=1), page_size: int = Query(default=50, alias="pageSize", ge=1, le=200), sort: str = Query(default="scheduled_start"), direction: str = Query(default="asc")) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.fieldServiceView")
    tenant_id = require_tenant(context)
    try:
        result = await list_field_assignments(session, service_context(context, tenant_id), FieldAssignmentListQuery(company_id=company_id, service_request_id=service_request_id, service_record_id=service_record_id, installed_asset_id=installed_asset_id, technician_user_id=technician_user_id, technician_employee_id=technician_employee_id, status=status_value, scheduled_from=scheduled_from, scheduled_to=scheduled_to, mine=mine, page=page, page_size=page_size, sort=sort, direction=direction))
        return ApiSuccess(data={"data": result.data, "meta": result.meta})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/field-assignments/{assignment_id}", response_model=ApiSuccess[dict[str, Any]])
async def field_assignments_get(assignment_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.fieldServiceView")
    tenant_id = require_tenant(context)
    try:
        row = await get_field_assignment(session, tenant_id, assignment_id)
        if not row:
            raise DomainError("Saha gorevi bulunamadi.", "FIELD_ASSIGNMENT_NOT_FOUND", 404)
        return ApiSuccess(data=row)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/field-assignments/{assignment_id}/accept", response_model=ApiSuccess[dict[str, Any]])
async def field_assignments_accept(assignment_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.fieldServiceExecute")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await accept_field_assignment(session, service_context(context, tenant_id), assignment_id)
        return ApiSuccess(data=row, message="Saha gorevi kabul edildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/field-assignments/{assignment_id}/reject", response_model=ApiSuccess[dict[str, Any]])
async def field_assignments_reject(assignment_id: str, request: FieldAssignmentRejectRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.fieldServiceExecute")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await reject_field_assignment(session, service_context(context, tenant_id), assignment_id, request)
        return ApiSuccess(data=row, message="Saha gorevi reddedildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/field-assignments/{assignment_id}/status", response_model=ApiSuccess[dict[str, Any]])
async def field_assignments_status(assignment_id: str, request: FieldAssignmentStatusRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.fieldServiceExecute")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await set_field_assignment_status(session, service_context(context, tenant_id), assignment_id, request)
        return ApiSuccess(data=row, message="Saha gorevi guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/checklist-templates", response_model=ApiSuccess[dict[str, Any]])
async def checklist_templates_list(session: SessionDep, context: RequestContextDep, company_id: str | None = Query(default=None), product_id: str | None = Query(default=None), service_type: str | None = Query(default=None), active: bool | None = Query(default=None), search: str | None = Query(default=None), page: int = Query(default=1, ge=1), page_size: int = Query(default=50, alias="pageSize", ge=1, le=200), sort: str = Query(default="updated_at"), direction: str = Query(default="desc")) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.fieldServiceView")
    tenant_id = require_tenant(context)
    try:
        result = await list_checklist_templates(session, service_context(context, tenant_id), ChecklistTemplateListQuery(company_id=company_id, product_id=product_id, service_type=service_type, active=active, search=search, page=page, page_size=page_size, sort=sort, direction=direction))
        return ApiSuccess(data={"data": result.data, "meta": result.meta})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/checklist-templates", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def checklist_templates_create(request: ChecklistTemplateCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.checklistManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await create_checklist_template(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=row, message="Checklist sablonu olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/service-records", response_model=ApiSuccess[dict[str, Any]])
async def service_records_list(session: SessionDep, context: RequestContextDep, company_id: str | None = Query(default=None), service_request_id: str | None = Query(default=None), installed_asset_id: str | None = Query(default=None), product_id: str | None = Query(default=None), service_type: str | None = Query(default=None), status_value: str | None = Query(default=None, alias="status"), result_value: str | None = Query(default=None, alias="result"), technician_user_id: str | None = Query(default=None), technician_employee_id: str | None = Query(default=None), date_from: DateFromQuery = None, date_to: DateToQuery = None, search: str | None = Query(default=None), page: int = Query(default=1, ge=1), page_size: int = Query(default=50, alias="pageSize", ge=1, le=200), sort: str = Query(default="service_date"), direction: str = Query(default="desc")) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.view")
    tenant_id = require_tenant(context)
    try:
        result = await list_service_records(session, service_context(context, tenant_id), ServiceRecordListQuery(company_id=company_id, service_request_id=service_request_id, installed_asset_id=installed_asset_id, product_id=product_id, service_type=service_type, status=status_value, result=result_value, technician_user_id=technician_user_id, technician_employee_id=technician_employee_id, date_from=date_from, date_to=date_to, search=search, page=page, page_size=page_size, sort=sort, direction=direction))
        return ApiSuccess(data={"data": result.data, "meta": result.meta})
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/service-records", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def service_records_create(request: ServiceRecordCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.serviceRecordCreate")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            item = await create_service_record(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=item, message="Servis kaydi olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/service-records/{service_id}", response_model=ApiSuccess[dict[str, Any]])
async def service_records_get(service_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.view")
    tenant_id = require_tenant(context)
    try:
        item = await get_service_record(session, tenant_id, service_id)
        if not item:
            raise DomainError("Servis kaydi bulunamadi.", "SERVICE_RECORD_NOT_FOUND", 404)
        return ApiSuccess(data=item)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/service-records/{service_id}/checklist", response_model=ApiSuccess[dict[str, Any]])
async def service_records_checklist_get(service_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.fieldServiceView")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await get_service_checklist(session, service_context(context, tenant_id), service_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/service-records/{service_id}/checklist", response_model=ApiSuccess[dict[str, Any]])
async def service_records_checklist_patch(service_id: str, request: ServiceChecklistPatchRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.fieldServiceExecute")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await patch_service_checklist(session, service_context(context, tenant_id), service_id, request)
        return ApiSuccess(data=row, message="Servis checklist guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/service-records/{service_id}/start", response_model=ApiSuccess[dict[str, Any]])
async def service_records_start(service_id: str, request: ServiceRecordStartRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.fieldServiceExecute")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await start_service_record(session, service_context(context, tenant_id), service_id, request)
        return ApiSuccess(data=row, message="Servis baslatildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/service-records/{service_id}/photos", response_model=ApiSuccess[dict[str, Any]])
async def service_records_photos(service_id: str, request: ServiceRecordPhotosRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.fieldServiceExecute")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await append_service_photos(session, service_context(context, tenant_id), service_id, request)
        return ApiSuccess(data=row, message="Servis fotograflari guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/service-records/{service_id}/report", response_model=ApiSuccess[dict[str, Any]])
async def service_records_report(service_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.serviceReportView")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await service_report_preview(session, service_context(context, tenant_id), service_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/service-records/{service_id}", response_model=ApiSuccess[dict[str, Any]])
async def service_records_update(service_id: str, request: ServiceRecordUpdateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            item = await update_service_record(session, service_context(context, tenant_id), service_id, request)
        return ApiSuccess(data=item, message="Servis kaydi guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/service-records/{service_id}/complete", response_model=ApiSuccess[dict[str, Any]])
async def service_records_complete(service_id: str, request: ServiceRecordCompleteRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "afterSales.serviceComplete")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            item = await complete_service_record(session, service_context(context, tenant_id), service_id, request)
        return ApiSuccess(data=item, message="Servis kaydi tamamlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


def ensure_permission(context: RequestContext, permission_key: str) -> None:
    if not has_permission(context, permission_key):
        raise DomainError("Bu islem icin yetkiniz bulunmuyor.", "PERMISSION_DENIED", status.HTTP_403_FORBIDDEN)


def service_context(context: RequestContext, tenant_id: str) -> dict[str, Any]:
    return {
        "tenant_id": tenant_id,
        "user_id": context.user_id,
        "permissions": context.permissions,
        "company_scope_ids": context.company_scope_ids,
        "writable_company_scope_ids": context.writable_company_scope_ids,
    }
