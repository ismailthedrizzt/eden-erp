# ruff: noqa: B008, E501

from __future__ import annotations

from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.reporting.dashboard import (
    get_dashboard,
    get_dashboard_summary,
    get_module_dashboard,
)
from app.domains.reporting.exports import prepare_report_export
from app.domains.reporting.metrics import build_kpis
from app.domains.reporting.reports import (
    get_report_definition,
    list_report_definitions,
    query_report,
)
from app.domains.reporting.schemas import ExportRequest, ReportingFilter
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
        result = await query_report(service_context(session, context, tenant_id, filters), report_key, filters)
        return ApiSuccess(data=result.model_dump(mode="json"))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/reports/{report_key}/export", response_model=ApiSuccess[dict[str, Any]])
async def report_export_endpoint(report_key: str, request: ExportRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        result = await prepare_report_export(service_context(session, context, tenant_id, request.filters), report_key, request)
        return ApiSuccess(data=result, message="Rapor export hazirlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


def ensure_permission(context: RequestContext, permission_key: str) -> None:
    if not has_permission(context, permission_key):
        raise DomainError("Bu islem icin yetkiniz bulunmuyor.", "PERMISSION_DENIED", status.HTTP_403_FORBIDDEN)
