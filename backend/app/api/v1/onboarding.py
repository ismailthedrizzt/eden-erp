# ruff: noqa: B008, E501

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, require_access_context, require_tenant
from app.domains.onboarding.schemas import (
    CompleteTourRequest,
    CompleteWorkspaceStepRequest,
    DismissHintRequest,
    UserOnboardingPatch,
    WorkspaceOnboardingPatch,
)
from app.domains.onboarding.service import (
    complete_user_tour,
    complete_workspace_step,
    dismiss_user_hint,
    get_onboarding_overview,
    get_user_state,
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
