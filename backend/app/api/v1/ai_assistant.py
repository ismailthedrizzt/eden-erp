# ruff: noqa: B008, E501

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import DomainError, domain_error_to_http
from app.core.security import RequestContext, has_permission, require_access_context, require_tenant
from app.domains.ai_assistant.context_builder import build_copilot_context
from app.domains.ai_assistant.registry import AI_MODES, list_ai_action_registry, list_ai_templates
from app.domains.ai_assistant.schemas import (
    ActionPreviewRequest,
    CopilotContextRequest,
    CopilotFeedbackRequest,
    CopilotQueryRequest,
    DocumentIntelligenceRequest,
    FormAssistRequest,
)
from app.domains.ai_assistant.service import list_history, record_feedback, service_context
from app.domains.ai_assistant.service_layer import (
    assist_form,
    preview_action,
    query_copilot,
    summarize_or_extract_document,
)
from app.schemas.common import ApiSuccess

router = APIRouter(prefix="/copilot", dependencies=[Depends(require_access_context)])
RequestContextDep = Annotated[RequestContext, Depends(require_access_context)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.post("/query", response_model=ApiSuccess[dict[str, Any]])
async def copilot_query(request: CopilotQueryRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            response = await query_copilot(service_context(session, context, tenant_id), request)
        return ApiSuccess(data=response.model_dump(), message="AI Copilot cevabi hazir.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/context", response_model=ApiSuccess[dict[str, Any]])
async def copilot_context(request: CopilotContextRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "aiCopilot.use")
    tenant_id = require_tenant(context)
    try:
        payload = await build_copilot_context(service_context(session, context, tenant_id), request)
        return ApiSuccess(data=payload.model_dump(), message="AI context hazir.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/action-preview", response_model=ApiSuccess[dict[str, Any]])
async def copilot_action_preview(request: ActionPreviewRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            payload = await preview_action(service_context(session, context, tenant_id), request)
        return ApiSuccess(data=payload, message="AI action preview hazir; mutation yapilmadi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/form-assist", response_model=ApiSuccess[dict[str, Any]])
async def copilot_form_assist(request: FormAssistRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            response = await assist_form(service_context(session, context, tenant_id), request)
        return ApiSuccess(data=response.model_dump(), message="Form onerileri hazir.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/document-summary", response_model=ApiSuccess[dict[str, Any]])
async def copilot_document_summary(request: DocumentIntelligenceRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            response = await summarize_or_extract_document(service_context(session, context, tenant_id), request, extract=False)
        return ApiSuccess(data=response.model_dump(), message="Belge ozeti hazir.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/document-extract", response_model=ApiSuccess[dict[str, Any]])
async def copilot_document_extract(request: DocumentIntelligenceRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            response = await summarize_or_extract_document(service_context(session, context, tenant_id), request, extract=True)
        return ApiSuccess(data=response.model_dump(), message="Belge alan onerileri hazir.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.get("/suggestions", response_model=ApiSuccess[dict[str, Any]])
async def copilot_suggestions(context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    ensure_permission(context, "aiCopilot.use")
    return ApiSuccess(data={"modes": AI_MODES, "actions": list_ai_action_registry(), "templates": list_ai_templates()})


@router.get("/history", response_model=ApiSuccess[list[dict[str, Any]]])
async def copilot_history(session: SessionDep, context: RequestContextDep, limit: int = Query(default=25, ge=1, le=100)) -> ApiSuccess[list[dict[str, Any]]]:
    tenant_id = require_tenant(context)
    try:
        return ApiSuccess(data=await list_history(service_context(session, context, tenant_id), limit=limit))
    except DomainError as error:
        raise domain_error_to_http(error) from error


@router.post("/feedback", response_model=ApiSuccess[dict[str, Any]], status_code=201)
async def copilot_feedback(request: CopilotFeedbackRequest, session: SessionDep, context: RequestContextDep) -> ApiSuccess[dict[str, Any]]:
    tenant_id = require_tenant(context)
    try:
        async with session.begin():
            payload = await record_feedback(service_context(session, context, tenant_id), history_id=request.history_id, rating=request.rating, comment=request.comment, metadata=request.metadata)
        return ApiSuccess(data=payload, message="AI feedback kaydedildi.")
    except DomainError as error:
        raise domain_error_to_http(error) from error


def ensure_permission(context: RequestContext, permission_key: str) -> None:
    if has_permission(context, permission_key) or has_permission(context, "aiCopilot.manageSettings") or has_permission(context, "system.admin"):
        return
    raise domain_error_to_http(
        DomainError(
            "AI Copilot icin yetkiniz bulunmuyor.",
            "AI_COPILOT_PERMISSION_DENIED",
            status.HTTP_403_FORBIDDEN,
            {"permission": permission_key},
        )
    )
