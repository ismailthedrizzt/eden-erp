# ruff: noqa: B008, E501

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, require_access_context, require_tenant
from app.domains.admin.settings import get_workspace_settings
from app.domains.onboarding.schemas import (
    CompleteTourRequest,
    CompleteWorkspaceStepRequest,
    DismissHintRequest,
    UserOnboardingPatch,
    UserPreferencesPatch,
    WorkspaceOnboardingPatch,
)
from app.domains.onboarding.service import (
    complete_user_tour,
    complete_workspace_step,
    dismiss_user_hint,
    get_onboarding_overview,
    get_user_preferences,
    get_user_state,
    patch_user_preferences,
    patch_user_state,
    patch_workspace_state,
    reset_user_help,
    reset_workspace_onboarding,
    service_context,
    skip_workspace_onboarding,
)
from app.schemas.common import ApiSuccess

router = APIRouter(dependencies=[Depends(require_access_context)])
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


def _metadata_value(*sources: Any, key: str) -> str | None:
    for source in sources:
        if isinstance(source, dict):
            value = source.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    return None


async def _bootstrap_workspace_payload(
    session: AsyncSession,
    tenant_id: str,
    context: RequestContext,
) -> dict[str, Any]:
    workspace_settings = await get_workspace_settings(session, tenant_id)
    result = await session.execute(
        text(
            """
            select id, name, metadata_json
            from public.erp_instances
            where id = :tenant_id
            limit 1
            """
        ),
        {"tenant_id": tenant_id},
    )
    instance = dict(result.mappings().one_or_none() or {})
    instance_meta = instance.get("metadata_json") if isinstance(instance.get("metadata_json"), dict) else {}
    workspace_meta = workspace_settings.get("metadata_json") if isinstance(workspace_settings.get("metadata_json"), dict) else {}
    return {
        "id": str(instance.get("id") or tenant_id),
        "name": workspace_settings.get("workspace_name") or instance.get("name") or "Calisma Alani",
        "user_id": context.user_id,
        "role_key": None,
        "role_label": None,
        "is_default": False,
        "is_current": True,
        "logoUrl": _metadata_value(workspace_meta, instance_meta, key="logoUrl"),
        "lightLogoUrl": _metadata_value(workspace_meta, instance_meta, key="lightLogoUrl"),
        "darkLogoUrl": _metadata_value(workspace_meta, instance_meta, key="darkLogoUrl"),
    }


@router.get("/onboarding/workspace", response_model=ApiSuccess[dict[str, Any]])
async def onboarding_workspace_get(
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await get_onboarding_overview(session, service_context(context, tenant_id)))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/onboarding/workspace", response_model=ApiSuccess[dict[str, Any]])
async def onboarding_workspace_patch(
    request: WorkspaceOnboardingPatch,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await patch_workspace_state(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=row, message="Calisma alani onboarding durumu guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/onboarding/workspace/complete-step", response_model=ApiSuccess[dict[str, Any]])
async def onboarding_workspace_complete_step(
    request: CompleteWorkspaceStepRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await complete_workspace_step(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=row, message="Onboarding adimi tamamlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/onboarding/workspace/skip", response_model=ApiSuccess[dict[str, Any]])
async def onboarding_workspace_skip(
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await skip_workspace_onboarding(session, service_context(context, tenant_id))
        return ApiSuccess(data=row, message="Onboarding daha sonra devam etmek uzere atlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/onboarding/workspace/reset", response_model=ApiSuccess[dict[str, Any]])
async def onboarding_workspace_reset(
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await reset_workspace_onboarding(session, service_context(context, tenant_id))
        return ApiSuccess(data=row, message="Onboarding durumu sifirlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/onboarding/user", response_model=ApiSuccess[dict[str, Any]])
async def onboarding_user_get(
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await get_user_state(session, service_context(context, tenant_id)))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/onboarding/preferences", response_model=ApiSuccess[dict[str, Any]])
async def onboarding_preferences_get(
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await get_user_preferences(session, service_context(context, tenant_id)))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/onboarding/session/bootstrap", response_model=ApiSuccess[dict[str, Any]])
async def onboarding_session_bootstrap(
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        ctx = service_context(context, tenant_id)
        workspace = await _bootstrap_workspace_payload(session, tenant_id, context)
        user_state = await get_user_state(session, ctx)
        preferences = await get_user_preferences(session, ctx)
        ui_preferences = preferences.get("uiPreferences", {})
        return ApiSuccess(data={
            "workspace": workspace,
            "userState": {
                "isFirstLogin": not bool(user_state.get("hasSeenFirstRunWelcome")),
                "shouldShowSystemTour": not bool(user_state.get("hasSeenGlobalTour")),
                "introVersion": user_state.get("lastOnboardingVersion") or "v1",
                "introCurrentStep": None,
                "uiPreferences": ui_preferences,
            },
            "onboardingPreferences": user_state,
            "modules": [],
            "permissions": {
                "effectivePermissions": sorted(set(context.permissions or [])),
                "permissionFallbacks": {},
            },
            "policy": {
                "availableModules": [],
                "availableActions": [],
                "deniedActions": [],
            },
        })
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/onboarding/preferences", response_model=ApiSuccess[dict[str, Any]])
async def onboarding_preferences_patch(
    request: UserPreferencesPatch,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await patch_user_preferences(session, service_context(context, tenant_id), request.uiPreferences)
        return ApiSuccess(data=row, message="Kullanici tercihleri kaydedildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.patch("/onboarding/user", response_model=ApiSuccess[dict[str, Any]])
async def onboarding_user_patch(
    request: UserOnboardingPatch,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await patch_user_state(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=row, message="Kullanici onboarding tercihi guncellendi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/onboarding/user/complete-tour", response_model=ApiSuccess[dict[str, Any]])
async def onboarding_user_complete_tour(
    request: CompleteTourRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await complete_user_tour(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=row, message="Tur tamamlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/onboarding/user/dismiss-hint", response_model=ApiSuccess[dict[str, Any]])
async def onboarding_user_dismiss_hint(
    request: DismissHintRequest,
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await dismiss_user_hint(session, service_context(context, tenant_id), request)
        return ApiSuccess(data=row, message="Yardim ipucu kapatildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/onboarding/user/reset-help", response_model=ApiSuccess[dict[str, Any]])
async def onboarding_user_reset_help(
    session: SessionDep,
    context: RequestContextDep,
) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            row = await reset_user_help(session, service_context(context, tenant_id))
        return ApiSuccess(data=row, message="Yardim ve tur durumu sifirlandi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error
