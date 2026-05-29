# ruff: noqa: E501,I001

from __future__ import annotations

from typing import Any

from sqlalchemy import text

from app.domains.ai_assistant.action_resolver import list_ai_actions
from app.domains.ai_assistant.schemas import CopilotContextPayload, CopilotContextRequest
from app.domains.ai_assistant.service import AiAssistantContext, can
from app.domains.ai_assistant.safety import sanitize_value
from app.domains.operations.service import table_exists
from app.features.registry import is_feature_enabled
from app.setup.readiness_checker import check_module_readiness


async def build_copilot_context(ctx: AiAssistantContext, request: CopilotContextRequest) -> CopilotContextPayload:
    permissions = list(ctx.request_context.permissions or [])
    module_key = request.module_key or module_from_page(request.current_page)
    actions = list_ai_actions(ctx.request_context, module_key=module_key)
    enabled_actions = [action for action in actions if action.enabled][:8]
    disabled_actions = [action for action in actions if not action.enabled][:8]
    warnings: list[str] = []

    readiness = await _readiness_summary(ctx, module_key, warnings)
    payload = CopilotContextPayload(
        tenant_id=ctx.tenant_id,
        user_id=ctx.request_context.user_id,
        permissions_summary={
            "count": len(permissions),
            "can_use_ai": can(ctx.request_context, "aiCopilot.use"),
            "can_use_form_assist": can(ctx.request_context, "aiCopilot.formAssist"),
            "can_use_document_intelligence": can(ctx.request_context, "aiCopilot.documentIntelligence"),
            "can_view_audit": can(ctx.request_context, "audit.view"),
            "can_admin_ai": can(ctx.request_context, "aiCopilot.adminAssist") or can(ctx.request_context, "system.admin"),
        },
        company_scope_summary={
            "scope": ctx.request_context.company_scope,
            "company_count": len(ctx.request_context.company_scope_ids or []),
            "branch_count": len(ctx.request_context.branch_scope_ids or []),
            "scope_limited": bool(ctx.request_context.company_scope_ids or ctx.request_context.branch_scope_ids),
        },
        current_page=request.current_page,
        module_key=module_key,
        selected_entity_type=request.selected_entity_type,
        selected_entity_id=request.selected_entity_id,
        selected_record_label=request.selected_record_label,
        selected_record_status=request.selected_record_status,
        available_actions=enabled_actions,
        disabled_actions_with_reasons=disabled_actions,
        module_readiness_summary=readiness,
        feature_flags_summary=feature_flag_summary(ctx.tenant_id),
        pending_actions_summary=await _pending_actions_summary(ctx, request, warnings),
        recent_audit_summary=await _audit_summary(ctx, request, warnings) if request.include_audit and can(ctx.request_context, "audit.view") else [],
        document_summary=await _document_summary(ctx, request, warnings) if request.include_documents and can(ctx.request_context, "documents.view") else [],
        data_quality_summary=await _data_quality_summary(ctx, request, warnings),
        field_lock_context=sanitize_value(request.extra_context.get("field_lock_context", {})) if isinstance(request.extra_context, dict) else {},
        warnings=warnings,
    )
    return CopilotContextPayload.model_validate(sanitize_value(payload.model_dump()))


def module_from_page(current_page: str | None) -> str | None:
    if not current_page:
        return None
    page = current_page.lower()
    if "/ik" in page:
        return "hr"
    if "/satis-sonrasi" in page:
        return "after_sales"
    if "/crm" in page:
        return "crm"
    if "/raporlama" in page:
        return "reporting"
    if "/muhasebe" in page:
        return "accounting"
    if "/belgeler" in page:
        return "documents"
    if "/sistem/otomasyon" in page:
        return "automation"
    if "/sistem" in page:
        return "settings"
    if "/sirket" in page:
        return "companies"
    return None


def feature_flag_summary(tenant_id: str) -> dict[str, bool]:
    keys = [
        "aiCopilot.enabled",
        "aiCopilot.recordSummary",
        "aiCopilot.formAssist",
        "aiCopilot.documentIntelligence",
        "aiCopilot.safeActions",
        "aiCopilot.adminAssist",
        "aiCopilot.feedback",
        "aiCopilot.history",
    ]
    return {key: is_feature_enabled(tenant_id, key) for key in keys}


async def _readiness_summary(ctx: AiAssistantContext, module_key: str | None, warnings: list[str]) -> dict[str, Any]:
    if not module_key:
        return {}
    try:
        result = await check_module_readiness(ctx.session, ctx.tenant_id, module_key)
        return {
            "module_key": result.module_key,
            "ok": result.ok,
            "status": result.status,
            "missing_tables": result.missing_tables,
            "missing_dependencies": result.missing_dependencies,
            "warnings": result.warnings[:5],
        }
    except Exception:
        await ctx.session.rollback()
        warnings.append("Modul hazirlik ozeti su anda okunamadi.")
        return {"module_key": module_key, "ok": False, "status": "unknown"}


async def _pending_actions_summary(ctx: AiAssistantContext, request: CopilotContextRequest, warnings: list[str]) -> dict[str, Any]:
    if not request.include_action_center or not await table_exists(ctx.session, "public.action_center_items"):
        return {"available": False}
    try:
        where = ["tenant_id = :tenant_id", "status in ('open','pending','assigned','overdue')"]
        params: dict[str, Any] = {"tenant_id": ctx.tenant_id}
        if request.selected_entity_type and request.selected_entity_id:
            where.append("source_type = :source_type and source_id = :source_id")
            params["source_type"] = request.selected_entity_type
            params["source_id"] = request.selected_entity_id
        result = await ctx.session.execute(
            text(f"select count(*) as total from public.action_center_items where {' and '.join(where)}"),
            params,
        )
        return {"available": True, "open_count": int(result.scalar_one_or_none() or 0)}
    except Exception:
        await ctx.session.rollback()
        warnings.append("Action Center ozeti su anda okunamadi.")
        return {"available": False}


async def _audit_summary(ctx: AiAssistantContext, request: CopilotContextRequest, warnings: list[str]) -> list[dict[str, Any]]:
    if not await table_exists(ctx.session, "public.audit_logs"):
        return []
    try:
        where = ["tenant_id = :tenant_id"]
        params: dict[str, Any] = {"tenant_id": ctx.tenant_id}
        if request.selected_entity_type and request.selected_entity_id:
            where.append("entity_type = :entity_type and entity_id = :entity_id")
            params["entity_type"] = request.selected_entity_type
            params["entity_id"] = request.selected_entity_id
        result = await ctx.session.execute(
            text(
                f"""
                select action_type, summary, result_status, severity, created_at
                from public.audit_logs
                where {' and '.join(where)}
                order by created_at desc
                limit 5
                """
            ),
            params,
        )
        return [dict(row) for row in result.mappings()]
    except Exception:
        await ctx.session.rollback()
        warnings.append("Audit ozeti su anda okunamadi.")
        return []


async def _document_summary(ctx: AiAssistantContext, request: CopilotContextRequest, warnings: list[str]) -> list[dict[str, Any]]:
    if not await table_exists(ctx.session, "public.documents"):
        return []
    try:
        where = ["tenant_id = :tenant_id"]
        params: dict[str, Any] = {"tenant_id": ctx.tenant_id}
        if request.selected_entity_type and request.selected_entity_id and await table_exists(ctx.session, "public.document_relations"):
            result = await ctx.session.execute(
                text(
                    """
                    select d.id, d.title, d.document_type, d.status, d.created_at
                    from public.documents d
                    join public.document_relations r on r.document_id = d.id
                    where d.tenant_id = :tenant_id
                      and r.entity_type = :entity_type
                      and r.entity_id = :entity_id
                    order by d.created_at desc
                    limit 5
                    """
                ),
                {"tenant_id": ctx.tenant_id, "entity_type": request.selected_entity_type, "entity_id": request.selected_entity_id},
            )
        else:
            result = await ctx.session.execute(
                text(f"select id, title, document_type, status, created_at from public.documents where {' and '.join(where)} order by created_at desc limit 5"),
                params,
            )
        return [dict(row) for row in result.mappings()]
    except Exception:
        await ctx.session.rollback()
        warnings.append("Belge ozeti su anda okunamadi.")
        return []


async def _data_quality_summary(ctx: AiAssistantContext, request: CopilotContextRequest, warnings: list[str]) -> dict[str, Any]:
    if not await table_exists(ctx.session, "public.data_quality_findings"):
        return {"available": False}
    try:
        where = ["tenant_id = :tenant_id", "status in ('open','new','triage')"]
        params: dict[str, Any] = {"tenant_id": ctx.tenant_id}
        if request.selected_entity_type and request.selected_entity_id:
            where.append("entity_type = :entity_type and entity_id = :entity_id")
            params["entity_type"] = request.selected_entity_type
            params["entity_id"] = request.selected_entity_id
        result = await ctx.session.execute(text(f"select count(*) from public.data_quality_findings where {' and '.join(where)}"), params)
        return {"available": True, "open_findings": int(result.scalar_one_or_none() or 0)}
    except Exception:
        await ctx.session.rollback()
        warnings.append("Veri kalitesi ozeti su anda okunamadi.")
        return {"available": False}
