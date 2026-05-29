# ruff: noqa: B008

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.admin.schemas import (
    AdminSettingsUpdate,
    FeatureFlagAdminUpdateRequest,
    IntegrationTestRequest,
    ModuleActivationAdminRequest,
    WorkspaceSettingsUpdate,
)
from app.domains.admin.service import (
    admin_context,
    admin_dashboard,
    dispatch_outbox_once,
    get_admin_settings,
    get_deep_health,
    get_health,
    get_outbox,
    list_admin_modules,
    list_features,
    list_integrations,
    module_payload,
    retry_outbox_event,
    run_integration_test,
    update_admin_settings,
    update_feature,
    update_module_activation,
    update_workspace,
)
from app.domains.admin.settings import get_workspace_settings
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("", response_model=ApiSuccess[dict[str, Any]])
async def get_admin_dashboard(
    request: Request,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_any_permission(context, ["settings.view", "system.admin"])
    tenant_id = require_tenant(context)
    data = await admin_dashboard(session, _service_context(context, tenant_id, request))
    return ApiSuccess(data=data)


@router.get("/workspace-settings", response_model=ApiSuccess[dict[str, Any]])
async def get_workspace(
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_any_permission(context, ["settings.view", "system.admin"])
    tenant_id = require_tenant(context)
    return ApiSuccess(data=await get_workspace_settings(session, tenant_id))


@router.patch("/workspace-settings", response_model=ApiSuccess[dict[str, Any]])
async def patch_workspace(
    request_body: WorkspaceSettingsUpdate,
    request: Request,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_any_permission(context, ["settings.edit", "system.admin"])
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            data = await update_workspace(
                session,
                _service_context(context, tenant_id, request),
                request_body,
            )
        return ApiSuccess(data=data, message="Calisma alani ayarlari guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/modules", response_model=ApiSuccess[dict[str, Any]])
async def get_modules(
    request: Request,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_any_permission(context, ["settings.view", "settings.modulesManage", "system.admin"])
    tenant_id = require_tenant(context)
    data = await list_admin_modules(session, _service_context(context, tenant_id, request))
    return ApiSuccess(data=data)


@router.get("/modules/{module_key}", response_model=ApiSuccess[dict[str, Any]])
async def get_module(
    module_key: str,
    request: Request,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_any_permission(context, ["settings.view", "settings.modulesManage", "system.admin"])
    tenant_id = require_tenant(context)
    try:
        data = await module_payload(
            session,
            _service_context(context, tenant_id, request),
            module_key,
        )
        return ApiSuccess(data=data)
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/modules/{module_key}/activation", response_model=ApiSuccess[dict[str, Any]])
async def patch_module_activation(
    module_key: str,
    payload: ModuleActivationAdminRequest,
    request: Request,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_any_permission(context, ["settings.modulesManage", "system.admin"])
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            data = await update_module_activation(
                session,
                _service_context(context, tenant_id, request),
                module_key,
                payload,
            )
        return ApiSuccess(data=data, message="Modul aktivasyonu guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/features", response_model=ApiSuccess[dict[str, Any]])
async def get_features(
    request: Request,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_any_permission(context, ["settings.view", "settings.modulesManage", "system.admin"])
    tenant_id = require_tenant(context)
    data = await list_features(session, _service_context(context, tenant_id, request))
    return ApiSuccess(data=data)


@router.patch("/features/{feature_key}", response_model=ApiSuccess[dict[str, Any]])
async def patch_feature(
    feature_key: str,
    payload: FeatureFlagAdminUpdateRequest,
    request: Request,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_any_permission(context, ["settings.modulesManage", "system.admin"])
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            data = await update_feature(
                session,
                _service_context(context, tenant_id, request),
                feature_key,
                payload,
            )
        return ApiSuccess(data=data, message="Ozellik bayragi guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/health", response_model=ApiSuccess[dict[str, Any]])
async def get_admin_health(
    request: Request,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_any_permission(context, ["settings.view", "system.admin"])
    tenant_id = require_tenant(context)
    return ApiSuccess(data=await get_health(session, _service_context(context, tenant_id, request)))


@router.get("/health/deep", response_model=ApiSuccess[dict[str, Any]])
async def get_admin_deep_health(
    request: Request,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_any_permission(context, ["system.admin"])
    tenant_id = require_tenant(context)
    data = await get_deep_health(session, _service_context(context, tenant_id, request))
    return ApiSuccess(data=data)


@router.get("/integrations", response_model=ApiSuccess[dict[str, Any]])
async def get_admin_integrations(
    request: Request,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_any_permission(context, ["settings.view", "system.admin"])
    tenant_id = require_tenant(context)
    data = await list_integrations(session, _service_context(context, tenant_id, request))
    return ApiSuccess(data=data)


@router.post("/integrations/{integration_key}/test", response_model=ApiSuccess[dict[str, Any]])
async def post_integration_test(
    integration_key: str,
    payload: IntegrationTestRequest,
    request: Request,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_any_permission(context, ["settings.edit", "system.admin"])
    tenant_id = require_tenant(context)
    async with session.begin():
        data = await run_integration_test(
            session,
            _service_context(context, tenant_id, request),
            integration_key,
            payload,
        )
    return ApiSuccess(data=data, message="Entegrasyon kontrolu tamamlandi.")


@router.get("/outbox", response_model=ApiSuccess[dict[str, Any]])
async def get_admin_outbox(
    request: Request,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_any_permission(context, ["outbox.dispatch", "system.admin"])
    tenant_id = require_tenant(context)
    return ApiSuccess(data=await get_outbox(session, _service_context(context, tenant_id, request)))


@router.post("/outbox/{event_id}/retry", response_model=ApiSuccess[dict[str, Any]])
async def post_outbox_retry(
    event_id: str,
    request: Request,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_any_permission(context, ["outbox.dispatch", "system.admin"])
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            data = await retry_outbox_event(
                session,
                _service_context(context, tenant_id, request),
                event_id,
            )
        return ApiSuccess(data=data, message="Outbox olayi tekrar kuyruga alindi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/outbox/dispatch-once", response_model=ApiSuccess[dict[str, Any]])
async def post_outbox_dispatch_once(
    request: Request,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_any_permission(context, ["outbox.dispatch", "system.admin"])
    tenant_id = require_tenant(context)
    async with session.begin():
        data = await dispatch_outbox_once(session, _service_context(context, tenant_id, request))
    return ApiSuccess(data=data, message="Outbox dispatch tek seferlik calisti.")


@router.get("/settings", response_model=ApiSuccess[dict[str, Any]])
async def get_settings(
    request: Request,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_any_permission(context, ["settings.view", "system.admin"])
    tenant_id = require_tenant(context)
    data = await get_admin_settings(session, _service_context(context, tenant_id, request))
    return ApiSuccess(data=data)


@router.patch("/settings/{settings_key}", response_model=ApiSuccess[dict[str, Any]])
async def patch_settings(
    settings_key: str,
    payload: AdminSettingsUpdate,
    request: Request,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    ensure_any_permission(context, ["settings.edit", "system.admin"])
    tenant_id = require_tenant(context)
    async with session.begin():
        data = await update_admin_settings(
            session,
            _service_context(context, tenant_id, request),
            settings_key,
            payload,
        )
    return ApiSuccess(data=data, message="Admin ayari guncellendi.")


def ensure_any_permission(context: RequestContext, permissions: list[str]) -> None:
    if any(has_permission(context, permission) for permission in permissions):
        return
    raise DomainError(
        "Bu islem icin yetkiniz yok.",
        "PERMISSION_DENIED",
        status.HTTP_403_FORBIDDEN,
    )


def _service_context(context: RequestContext, tenant_id: str, request: Request) -> dict[str, Any]:
    return admin_context(
        {
            "user_id": context.user_id,
            "request_id": request.headers.get("x-request-id"),
        },
        tenant_id,
    )
