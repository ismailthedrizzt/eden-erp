# ruff: noqa: E501,I001

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import uuid4

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.core.security import RequestContext, has_permission
from app.domains.ai_assistant.schemas import CopilotResponse
from app.domains.ai_assistant.safety import sanitize_value
from app.domains.operations.service import table_exists

AI_MODULE_KEY = "aiCopilot"
HISTORY_TABLE = "public.ai_copilot_history"
FEEDBACK_TABLE = "public.ai_copilot_feedback"
DOCUMENT_INTELLIGENCE_TABLE = "public.ai_document_intelligence_results"


@dataclass
class AiAssistantContext:
    session: AsyncSession
    request_context: RequestContext
    tenant_id: str
    warnings: list[str] = field(default_factory=list)


def service_context(session: AsyncSession, request_context: RequestContext, tenant_id: str) -> AiAssistantContext:
    return AiAssistantContext(session=session, request_context=request_context, tenant_id=tenant_id)


def can(context: RequestContext, permission_key: str) -> bool:
    return has_permission(context, permission_key)


def require_ai_permission(ctx: AiAssistantContext, permission_key: str = "aiCopilot.use") -> None:
    if can(ctx.request_context, permission_key) or can(ctx.request_context, "aiCopilot.manageSettings") or can(ctx.request_context, "system.admin"):
        return
    raise DomainError("AI Copilot icin yetkiniz bulunmuyor.", "AI_COPILOT_PERMISSION_DENIED", status.HTTP_403_FORBIDDEN, {"permission": permission_key})


async def ensure_ai_tables(
    session: AsyncSession,
    *,
    history: bool = False,
    feedback: bool = False,
    document_intelligence: bool = False,
) -> None:
    checks = [
        (history, HISTORY_TABLE, "AI_HISTORY_TABLE_MISSING", "AI Copilot gecmis altyapisi hazir degil."),
        (feedback, FEEDBACK_TABLE, "AI_FEEDBACK_TABLE_MISSING", "AI feedback altyapisi hazir degil."),
        (document_intelligence, DOCUMENT_INTELLIGENCE_TABLE, "AI_DOCUMENT_INTELLIGENCE_TABLE_MISSING", "AI belge zekasi altyapisi hazir degil."),
    ]
    for enabled, table, code, message in checks:
        if enabled and not await table_exists(session, table):
            raise DomainError(message, code, status.HTTP_409_CONFLICT, {"module_key": AI_MODULE_KEY})


def json_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=False, default=str)


def json_list_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else [], ensure_ascii=False, default=str)


def normalize_row(row: Any) -> dict[str, Any]:
    return {key: normalize_value(value) for key, value in dict(row).items()}


def normalize_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (date, datetime)):
        return value
    return value


async def record_history_best_effort(
    ctx: AiAssistantContext,
    *,
    mode: str,
    query_text: str | None,
    context_payload: dict[str, Any],
    response: CopilotResponse,
    provider: str,
    safety_status: str,
    started_at: float,
) -> str | None:
    if not await table_exists(ctx.session, HISTORY_TABLE):
        return None
    history_id = str(uuid4())
    latency_ms = int((time.perf_counter() - started_at) * 1000)
    try:
        async with ctx.session.begin_nested():
            await ctx.session.execute(
                text(
                    """
                    insert into public.ai_copilot_history (
                      id, tenant_id, user_id, mode, module_key, current_page,
                      selected_entity_type, selected_entity_id, selected_record_label,
                      selected_record_status, query_text, context_summary_json, response_json,
                      action_key, provider, safety_status, latency_ms
                    )
                    values (
                      :id, :tenant_id, :user_id, :mode, :module_key, :current_page,
                      :selected_entity_type, :selected_entity_id, :selected_record_label,
                      :selected_record_status, :query_text, cast(:context_summary_json as jsonb), cast(:response_json as jsonb),
                      :action_key, :provider, :safety_status, :latency_ms
                    )
                    """
                ),
                {
                    "id": history_id,
                    "tenant_id": ctx.tenant_id,
                    "user_id": ctx.request_context.user_id,
                    "mode": mode,
                    "module_key": context_payload.get("module_key"),
                    "current_page": context_payload.get("current_page"),
                    "selected_entity_type": context_payload.get("selected_entity_type"),
                    "selected_entity_id": context_payload.get("selected_entity_id"),
                    "selected_record_label": context_payload.get("selected_record_label"),
                    "selected_record_status": context_payload.get("selected_record_status"),
                    "query_text": str(sanitize_value(query_text)) if query_text else None,
                    "context_summary_json": json_dumps(sanitize_value(_compact_context(context_payload))),
                    "response_json": json_dumps(sanitize_value(response.model_dump())),
                    "action_key": response.action_key,
                    "provider": provider,
                    "safety_status": safety_status,
                    "latency_ms": latency_ms,
                },
            )
        return history_id
    except Exception:
        return None


async def record_feedback(ctx: AiAssistantContext, *, history_id: str | None, rating: str, comment: str | None, metadata: dict[str, Any]) -> dict[str, Any]:
    require_ai_permission(ctx, "aiCopilot.use")
    await ensure_ai_tables(ctx.session, feedback=True)
    feedback_id = str(uuid4())
    result = await ctx.session.execute(
        text(
            """
            insert into public.ai_copilot_feedback (
              id, tenant_id, user_id, history_id, rating, comment, metadata_json
            )
            values (
              :id, :tenant_id, :user_id, :history_id, :rating, :comment, cast(:metadata_json as jsonb)
            )
            returning *
            """
        ),
        {
            "id": feedback_id,
            "tenant_id": ctx.tenant_id,
            "user_id": ctx.request_context.user_id,
            "history_id": history_id,
            "rating": rating,
            "comment": str(sanitize_value(comment)) if comment else None,
            "metadata_json": json_dumps(sanitize_value(metadata)),
        },
    )
    return normalize_row(result.mappings().one())


async def list_history(ctx: AiAssistantContext, *, limit: int = 25) -> list[dict[str, Any]]:
    require_ai_permission(ctx, "aiCopilot.viewHistory")
    if not await table_exists(ctx.session, HISTORY_TABLE):
        return []
    result = await ctx.session.execute(
        text(
            """
            select id, mode, module_key, current_page, selected_entity_type,
                   selected_entity_id, selected_record_label, query_text,
                   response_json, action_key, provider, safety_status, latency_ms, created_at
            from public.ai_copilot_history
            where tenant_id = :tenant_id
              and (:user_id is null or user_id = :user_id or :can_admin = true)
            order by created_at desc
            limit :limit
            """
        ),
        {
            "tenant_id": ctx.tenant_id,
            "user_id": ctx.request_context.user_id,
            "can_admin": can(ctx.request_context, "aiCopilot.manageSettings") or can(ctx.request_context, "system.admin"),
            "limit": limit,
        },
    )
    return [normalize_row(row) for row in result.mappings()]


async def record_document_intelligence_best_effort(
    ctx: AiAssistantContext,
    *,
    document_id: str | None,
    entity_type: str | None,
    entity_id: str | None,
    document_type_suggestion: str | None,
    summary: str | None,
    findings: list[dict[str, Any]],
    provider: str,
    confidence: float,
) -> str | None:
    if not await table_exists(ctx.session, DOCUMENT_INTELLIGENCE_TABLE):
        return None
    row_id = str(uuid4())
    try:
        async with ctx.session.begin_nested():
            await ctx.session.execute(
                text(
                    """
                    insert into public.ai_document_intelligence_results (
                      id, tenant_id, document_id, entity_type, entity_id, document_type_suggestion,
                      summary, findings_json, provider, confidence, requires_human_verification, created_by
                    )
                    values (
                      :id, :tenant_id, :document_id, :entity_type, :entity_id, :document_type_suggestion,
                      :summary, cast(:findings_json as jsonb), :provider, :confidence, true, :created_by
                    )
                    """
                ),
                {
                    "id": row_id,
                    "tenant_id": ctx.tenant_id,
                    "document_id": document_id,
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "document_type_suggestion": document_type_suggestion,
                    "summary": summary,
                    "findings_json": json_list_dumps(sanitize_value(findings)),
                    "provider": provider,
                    "confidence": confidence,
                    "created_by": ctx.request_context.user_id,
                },
            )
        return row_id
    except Exception:
        return None


async def record_ai_audit_best_effort(
    ctx: AiAssistantContext,
    *,
    action_type: str,
    entity_type: str = "ai_copilot",
    entity_id: str = "copilot",
    summary: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    if not await table_exists(ctx.session, "public.audit_logs"):
        return
    try:
        async with ctx.session.begin_nested():
            await ctx.session.execute(
                text(
                    """
                    insert into public.audit_logs (
                      tenant_id, module_key, entity_type, entity_id, action_type,
                      action_key, user_id, summary, result_status, severity, metadata_json
                    )
                    values (
                      :tenant_id, 'aiCopilot', :entity_type, :entity_id, :action_type,
                      :action_type, :user_id, :summary, 'success', 'info', cast(:metadata_json as jsonb)
                    )
                    """
                ),
                {
                    "tenant_id": ctx.tenant_id,
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "action_type": action_type,
                    "user_id": ctx.request_context.user_id,
                    "summary": summary or action_type,
                    "metadata_json": json_dumps(sanitize_value(metadata or {})),
                },
            )
    except Exception:
        return


def _compact_context(context_payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "current_page": context_payload.get("current_page"),
        "module_key": context_payload.get("module_key"),
        "selected_entity_type": context_payload.get("selected_entity_type"),
        "selected_entity_id": context_payload.get("selected_entity_id"),
        "permissions_summary": context_payload.get("permissions_summary"),
        "company_scope_summary": context_payload.get("company_scope_summary"),
        "warnings": context_payload.get("warnings", []),
    }
