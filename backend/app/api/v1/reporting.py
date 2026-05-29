# ruff: noqa: B008, E501

from __future__ import annotations

from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.reporting.custom_reports import (
    create_custom_report,
    delete_custom_report,
    get_custom_report,
    list_custom_reports,
    list_report_catalog,
    update_custom_report,
)
from app.domains.reporting.dashboard import (
    get_dashboard,
    get_dashboard_summary,
    get_module_dashboard,
)
from app.domains.reporting.dashboard_preferences import (
    get_dashboard_preferences,
    upsert_dashboard_preferences,
)
from app.domains.reporting.exports import (
    get_export_download_url,
    get_export_job,
    list_export_jobs,
    prepare_report_export,
)
from app.domains.reporting.metrics import build_kpis
from app.domains.reporting.report_renderer import render_report
from app.domains.reporting.reports import (
    get_report_definition,
    list_report_definitions,
)
from app.domains.reporting.saved_views import (
    create_saved_view,
    delete_saved_view,
    get_saved_view,
    list_saved_views,
    pin_saved_view,
    set_default_saved_view,
    update_saved_view,
)
from app.domains.reporting.scheduled_reports import (
    create_scheduled_report,
    get_scheduled_report,
    list_scheduled_reports,
    run_scheduled_report_now,
    set_scheduled_report_status,
    update_scheduled_report,
)
from app.domains.reporting.schemas import (
    CustomReportCreateRequest,
    CustomReportListQuery,
    CustomReportUpdateRequest,
    DashboardPreferencesRequest,
    ExportJobListQuery,
    ExportRequest,
    ReportingFilter,
    SavedViewCreateRequest,
    SavedViewListQuery,
    SavedViewPinRequest,
    SavedViewUpdateRequest,
    ScheduledReportCreateRequest,
    ScheduledReportListQuery,
    ScheduledReportUpdateRequest,
)
from app.domains.reporting.service import service_context
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("/dashboard", response_model=ApiSuccess[dict[str, Any]])
async def dashboard_endpoint(
    session: SessionDep,
    context: RequestContextDep,
    company_id: str | None = Query(default=None),
    branch_id: str | None = Query(default=None),
    module_key: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    only_mine: bool = Query(default=False),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.dashboardView")
    tenant_id = require_tenant(context)
    try:
        filters = ReportingFilter(company_id=company_id, branch_id=branch_id, module_key=module_key, date_from=date_from, date_to=date_to, only_mine=only_mine)
        result = await get_dashboard(service_context(session, context, tenant_id, filters))
        return ApiSuccess(data=result.model_dump(mode="json"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/dashboard/summary", response_model=ApiSuccess[dict[str, Any]])
async def dashboard_summary_endpoint(session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.dashboardView")
    tenant_id = require_tenant(context)
    try:
        result = await get_dashboard_summary(service_context(session, context, tenant_id, ReportingFilter()))
        return ApiSuccess(data=result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/dashboard/module/{module_key}", response_model=ApiSuccess[dict[str, Any]])
async def module_dashboard_endpoint(module_key: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.dashboardView")
    tenant_id = require_tenant(context)
    try:
        result = await get_module_dashboard(service_context(session, context, tenant_id, ReportingFilter(module_key=module_key)), module_key)
        return ApiSuccess(data=result.model_dump(mode="json"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/kpis/{module_key}", response_model=ApiSuccess[list[dict[str, Any]]])
async def kpis_endpoint(module_key: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "reporting.dashboardView")
    tenant_id = require_tenant(context)
    try:
        cards = await build_kpis(service_context(session, context, tenant_id, ReportingFilter(module_key=module_key)), module_key)
        return ApiSuccess(data=[card.model_dump(mode="json") for card in cards])
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/reports", response_model=ApiSuccess[list[dict[str, Any]]])
async def reports_list_endpoint(session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "reporting.view")
    tenant_id = require_tenant(context)
    definitions = list_report_definitions(service_context(session, context, tenant_id, ReportingFilter()))
    return ApiSuccess(data=[definition.model_dump(mode="json") for definition in definitions])


@router.get("/reports/catalog", response_model=ApiSuccess[list[dict[str, Any]]])
async def reports_catalog_endpoint(session: SessionDep, context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "reporting.view")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await list_report_catalog(service_context(session, context, tenant_id, ReportingFilter())))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/reports/{report_key}", response_model=ApiSuccess[dict[str, Any]])
async def report_definition_endpoint(report_key: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.view")
    tenant_id = require_tenant(context)
    try:
        definition = get_report_definition(service_context(session, context, tenant_id, ReportingFilter()), report_key)
        return ApiSuccess(data=definition.model_dump(mode="json"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/reports/{report_key}/query", response_model=ApiSuccess[dict[str, Any]])
async def report_query_endpoint(report_key: str, filters: ReportingFilter, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.view")
    tenant_id = require_tenant(context)
    try:
        result = await render_report(service_context(session, context, tenant_id, filters), report_key, filters)
        return ApiSuccess(data=result.model_dump(mode="json"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/reports/{report_key}/export", response_model=ApiSuccess[dict[str, Any]])
async def report_export_endpoint(report_key: str, request: ExportRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await prepare_report_export(service_context(session, context, tenant_id, request.filters), report_key, request)
        return ApiSuccess(data=result, message="Rapor export job olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/saved-views", response_model=ApiSuccess[dict[str, Any]])
async def saved_views_list(
    session: SessionDep,
    context: RequestContextDep,
    module_key: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    report_key: str | None = Query(default=None),
    visibility: str | None = Query(default=None),
    include_shared: bool = Query(default=True),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.view")
    tenant_id = require_tenant(context)
    try:
        result = await list_saved_views(service_context(session, context, tenant_id, ReportingFilter()), SavedViewListQuery(module_key=module_key, entity_type=entity_type, report_key=report_key, visibility=visibility, include_shared=include_shared, page=page, page_size=page_size))
        return ApiSuccess(data=result.model_dump(mode="json"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/saved-views", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def saved_views_create(request: SavedViewCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.view")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            view = await create_saved_view(service_context(session, context, tenant_id, ReportingFilter()), request)
        return ApiSuccess(data=view, message="Gorunum kaydedildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/saved-views/{view_id}", response_model=ApiSuccess[dict[str, Any]])
async def saved_views_get(view_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.view")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await get_saved_view(service_context(session, context, tenant_id, ReportingFilter()), view_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/saved-views/{view_id}", response_model=ApiSuccess[dict[str, Any]])
async def saved_views_update(view_id: str, request: SavedViewUpdateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.view")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            view = await update_saved_view(service_context(session, context, tenant_id, ReportingFilter()), view_id, request)
        return ApiSuccess(data=view, message="Gorunum guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.delete("/saved-views/{view_id}", response_model=ApiSuccess[dict[str, Any]])
async def saved_views_delete(view_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.view")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await delete_saved_view(service_context(session, context, tenant_id, ReportingFilter()), view_id)
        return ApiSuccess(data=result, message="Gorunum silindi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/saved-views/{view_id}/set-default", response_model=ApiSuccess[dict[str, Any]])
async def saved_views_set_default(view_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.view")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            view = await set_default_saved_view(service_context(session, context, tenant_id, ReportingFilter()), view_id)
        return ApiSuccess(data=view, message="Varsayilan gorunum ayarlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/saved-views/{view_id}/pin", response_model=ApiSuccess[dict[str, Any]])
async def saved_views_pin(view_id: str, request: SavedViewPinRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.view")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            view = await pin_saved_view(service_context(session, context, tenant_id, ReportingFilter()), view_id, request)
        return ApiSuccess(data=view, message="Gorunum pin durumu guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/custom-reports", response_model=ApiSuccess[dict[str, Any]])
async def custom_reports_list(session: SessionDep, context: RequestContextDep, module_key: str | None = Query(default=None), source_type: str | None = Query(default=None), active: bool | None = Query(default=None), mine: bool = Query(default=False), page: int = Query(default=1, ge=1), page_size: int = Query(default=50, alias="pageSize", ge=1, le=200)) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.view")
    tenant_id = require_tenant(context)
    try:
        result = await list_custom_reports(service_context(session, context, tenant_id, ReportingFilter()), CustomReportListQuery(module_key=module_key, source_type=source_type, active=active, mine=mine, page=page, page_size=page_size))
        return ApiSuccess(data=result.model_dump(mode="json"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/custom-reports", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def custom_reports_create(request: CustomReportCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.customReportsManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            report = await create_custom_report(service_context(session, context, tenant_id, ReportingFilter()), request)
        return ApiSuccess(data=report, message="Ozel rapor olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/custom-reports/{report_id}", response_model=ApiSuccess[dict[str, Any]])
async def custom_reports_get(report_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.view")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await get_custom_report(service_context(session, context, tenant_id, ReportingFilter()), report_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/custom-reports/{report_id}", response_model=ApiSuccess[dict[str, Any]])
async def custom_reports_update(report_id: str, request: CustomReportUpdateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.customReportsManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            report = await update_custom_report(service_context(session, context, tenant_id, ReportingFilter()), report_id, request)
        return ApiSuccess(data=report, message="Ozel rapor guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.delete("/custom-reports/{report_id}", response_model=ApiSuccess[dict[str, Any]])
async def custom_reports_delete(report_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.customReportsManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await delete_custom_report(service_context(session, context, tenant_id, ReportingFilter()), report_id)
        return ApiSuccess(data=result, message="Ozel rapor pasife alindi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/scheduled-reports", response_model=ApiSuccess[dict[str, Any]])
async def scheduled_reports_list(session: SessionDep, context: RequestContextDep, status_value: str | None = Query(default=None, alias="status"), report_key: str | None = Query(default=None), owner_user_id: str | None = Query(default=None), page: int = Query(default=1, ge=1), page_size: int = Query(default=50, alias="pageSize", ge=1, le=200)) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.view")
    tenant_id = require_tenant(context)
    try:
        result = await list_scheduled_reports(service_context(session, context, tenant_id, ReportingFilter()), ScheduledReportListQuery(status=status_value, report_key=report_key, owner_user_id=owner_user_id, page=page, page_size=page_size))
        return ApiSuccess(data=result.model_dump(mode="json"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/scheduled-reports", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def scheduled_reports_create(request: ScheduledReportCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.scheduledReportsManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            schedule = await create_scheduled_report(service_context(session, context, tenant_id, ReportingFilter()), request)
        return ApiSuccess(data=schedule, message="Zamanlanmis rapor olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/scheduled-reports/{schedule_id}", response_model=ApiSuccess[dict[str, Any]])
async def scheduled_reports_get(schedule_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.view")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await get_scheduled_report(service_context(session, context, tenant_id, ReportingFilter()), schedule_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/scheduled-reports/{schedule_id}", response_model=ApiSuccess[dict[str, Any]])
async def scheduled_reports_update(schedule_id: str, request: ScheduledReportUpdateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.scheduledReportsManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            schedule = await update_scheduled_report(service_context(session, context, tenant_id, ReportingFilter()), schedule_id, request)
        return ApiSuccess(data=schedule, message="Zamanlanmis rapor guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/scheduled-reports/{schedule_id}/pause", response_model=ApiSuccess[dict[str, Any]])
async def scheduled_reports_pause(schedule_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.scheduledReportsManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            schedule = await set_scheduled_report_status(service_context(session, context, tenant_id, ReportingFilter()), schedule_id, "paused")
        return ApiSuccess(data=schedule, message="Zamanlanmis rapor duraklatildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/scheduled-reports/{schedule_id}/resume", response_model=ApiSuccess[dict[str, Any]])
async def scheduled_reports_resume(schedule_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.scheduledReportsManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            schedule = await set_scheduled_report_status(service_context(session, context, tenant_id, ReportingFilter()), schedule_id, "active")
        return ApiSuccess(data=schedule, message="Zamanlanmis rapor devam ettirildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/scheduled-reports/{schedule_id}/run-now", response_model=ApiSuccess[dict[str, Any]])
async def scheduled_reports_run_now(schedule_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.scheduledReportsManage")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await run_scheduled_report_now(service_context(session, context, tenant_id, ReportingFilter()), schedule_id)
        return ApiSuccess(data=result, message="Zamanlanmis rapor calistirildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/exports", response_model=ApiSuccess[dict[str, Any]])
async def exports_list(session: SessionDep, context: RequestContextDep, status_value: str | None = Query(default=None, alias="status"), report_key: str | None = Query(default=None), requested_by: str | None = Query(default=None), page: int = Query(default=1, ge=1), page_size: int = Query(default=50, alias="pageSize", ge=1, le=200)) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.export")
    tenant_id = require_tenant(context)
    try:
        result = await list_export_jobs(service_context(session, context, tenant_id, ReportingFilter()), ExportJobListQuery(status=status_value, report_key=report_key, requested_by=requested_by, page=page, page_size=page_size))
        return ApiSuccess(data=result.model_dump(mode="json"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/exports/{export_id}", response_model=ApiSuccess[dict[str, Any]])
async def exports_get(export_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.export")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await get_export_job(service_context(session, context, tenant_id, ReportingFilter()), export_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/exports/{export_id}/download-url", response_model=ApiSuccess[dict[str, Any]])
async def exports_download_url(export_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.export")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await get_export_download_url(service_context(session, context, tenant_id, ReportingFilter()), export_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/dashboard/preferences", response_model=ApiSuccess[dict[str, Any]])
async def dashboard_preferences_get(session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.dashboardView")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await get_dashboard_preferences(service_context(session, context, tenant_id, ReportingFilter())))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/dashboard/preferences", response_model=ApiSuccess[dict[str, Any]])
async def dashboard_preferences_update(request: DashboardPreferencesRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "reporting.dashboardCustomize")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            preferences = await upsert_dashboard_preferences(service_context(session, context, tenant_id, ReportingFilter()), request)
        return ApiSuccess(data=preferences, message="Dashboard tercihleri kaydedildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


def ensure_permission(context: RequestContext, permission_key: str) -> None:
    if not has_permission(context, permission_key):
        raise DomainError("Bu islem icin yetkiniz bulunmuyor.", "PERMISSION_DENIED", status.HTTP_403_FORBIDDEN)
