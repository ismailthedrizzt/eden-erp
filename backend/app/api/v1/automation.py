# ruff: noqa: B008, E501

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.automation.executor import get_run, list_runs, run_rule_now
from app.domains.automation.registry import (
    list_action_registry,
    list_condition_registry,
    list_rule_templates,
    list_trigger_registry,
)
from app.domains.automation.rules import (
    create_rule,
    delete_rule,
    get_rule,
    list_rules,
    set_rule_status,
    update_rule,
)
from app.domains.automation.schemas import (
    AutomationRuleCreateRequest,
    AutomationRuleListQuery,
    AutomationRuleUpdateRequest,
    AutomationRunNowRequest,
    AutomationSimulationRequest,
)
from app.domains.automation.service import service_context
from app.domains.automation.simulation import simulate_rule
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("/rules", response_model=ApiSuccess[dict[str, Any]])
async def rules_list(
    session: SessionDep,
    context: RequestContextDep,
    module_key: str | None = Query(default=None),
    status_value: str | None = Query(default=None, alias="status"),
    trigger_type: str | None = Query(default=None),
    failed_only: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "automation.view")
    tenant_id = require_tenant(context)
    try:
        result = await list_rules(service_context(session, context, tenant_id), AutomationRuleListQuery(module_key=module_key, status=status_value, trigger_type=trigger_type, failed_only=failed_only, page=page, page_size=page_size))
        return ApiSuccess(data=result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/rules", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def rules_create(request: AutomationRuleCreateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "automation.create")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            rule = await create_rule(service_context(session, context, tenant_id), request)
        return ApiSuccess(data=rule, message="Otomasyon kurali olusturuldu.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/rules/{rule_id}", response_model=ApiSuccess[dict[str, Any]])
async def rules_get(rule_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "automation.view")
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await get_rule(service_context(session, context, tenant_id), rule_id))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/rules/{rule_id}", response_model=ApiSuccess[dict[str, Any]])
async def rules_update(rule_id: str, request: AutomationRuleUpdateRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "automation.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            rule = await update_rule(service_context(session, context, tenant_id), rule_id, request)
        return ApiSuccess(data=rule, message="Otomasyon kurali guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.delete("/rules/{rule_id}", response_model=ApiSuccess[dict[str, Any]])
async def rules_delete(rule_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "automation.edit")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await delete_rule(service_context(session, context, tenant_id), rule_id)
        return ApiSuccess(data=result, message="Otomasyon kurali silindi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/rules/{rule_id}/activate", response_model=ApiSuccess[dict[str, Any]])
async def rules_activate(rule_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    return await _status_transition(rule_id, "active", session, context, "Otomasyon kurali aktif edildi.")


@router.post("/rules/{rule_id}/pause", response_model=ApiSuccess[dict[str, Any]])
async def rules_pause(rule_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    return await _status_transition(rule_id, "paused", session, context, "Otomasyon kurali duraklatildi.")


@router.post("/rules/{rule_id}/disable", response_model=ApiSuccess[dict[str, Any]])
async def rules_disable(rule_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    return await _status_transition(rule_id, "disabled", session, context, "Otomasyon kurali devre disi birakildi.")


@router.post("/rules/{rule_id}/run-now", response_model=ApiSuccess[dict[str, Any]])
async def rules_run_now(rule_id: str, request: AutomationRunNowRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "automation.run")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            result = await run_rule_now(service_context(session, context, tenant_id), rule_id, trigger_payload=request.trigger_payload)
        return ApiSuccess(data=result, message="Otomasyon calisma sonucu kaydedildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/rules/{rule_id}/simulate", response_model=ApiSuccess[dict[str, Any]])
async def rules_simulate(rule_id: str, request: AutomationSimulationRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "automation.run")
    tenant_id = require_tenant(context)
    try:
        result = await simulate_rule(service_context(session, context, tenant_id), rule_id, limit=request.limit, trigger_payload=request.trigger_payload)
        return ApiSuccess(data=result, message="Simulation tamamlandi. Gercek aksiyon olusturulmadi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/triggers", response_model=ApiSuccess[list[dict[str, Any]]])
async def triggers_registry(context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "automation.view")
    return ApiSuccess(data=list_trigger_registry())


@router.get("/conditions", response_model=ApiSuccess[dict[str, Any]])
async def conditions_registry(context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "automation.view")
    return ApiSuccess(data=list_condition_registry())


@router.get("/actions", response_model=ApiSuccess[list[dict[str, Any]]])
async def actions_registry(context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "automation.view")
    return ApiSuccess(data=list_action_registry())


@router.get("/templates", response_model=ApiSuccess[list[dict[str, Any]]])
async def templates_registry(context: RequestContextDep) -> ApiSuccess[list[dict[str, Any]]]:
    ensure_permission(context, "automation.view")
    return ApiSuccess(data=list_rule_templates())


@router.get("/runs", response_model=ApiSuccess[dict[str, Any]])
async def runs_list(
    session: SessionDep,
    context: RequestContextDep,
    rule_id: str | None = Query(default=None),
    status_value: str | None = Query(default=None, alias="status"),
    trigger_type: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "automation.viewRuns")
    tenant_id = require_tenant(context)
    try:
        result = await list_runs(service_context(session, context, tenant_id), rule_id=rule_id, status=status_value, trigger_type=trigger_type, page=page, page_size=page_size)
        return ApiSuccess(data=result)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/runs/{run_id}", response_model=ApiSuccess[dict[str, Any]])
async def runs_get(run_id: str, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "automation.viewRuns")
    tenant_id = require_tenant(context)
    try:
        run = await get_run(service_context(session, context, tenant_id), run_id)
        if not run:
            raise DomainError("Otomasyon run kaydi bulunamadi.", "AUTOMATION_RUN_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return ApiSuccess(data=run)
    except DomainError as error:
        raise domain_error_to_http(error) from error


async def _status_transition(rule_id: str, status_value: str, session: AsyncSession, context: RequestContext, message: str) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "automation.activate")
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            rule = await set_rule_status(service_context(session, context, tenant_id), rule_id, status_value)
        return ApiSuccess(data=rule, message=message)
    except DomainError as error:
        raise domain_error_to_http(error) from error


def ensure_permission(context: RequestContext, permission_key: str) -> None:
    if has_permission(context, permission_key) or has_permission(context, "automation.admin") or has_permission(context, "system.admin"):
        return
    raise domain_error_to_http(
        DomainError(
            "Bu otomasyon islemi icin yetkiniz bulunmuyor.",
            "AUTOMATION_PERMISSION_DENIED",
            status.HTTP_403_FORBIDDEN,
            {"permission": permission_key},
        )
    )
