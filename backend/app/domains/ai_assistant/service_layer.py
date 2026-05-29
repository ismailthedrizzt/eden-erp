# ruff: noqa: E501

from __future__ import annotations

import time

from app.domains.ai_assistant.action_resolver import (
    action_preview_payload,
    allowed_action_keys,
    resolve_actions_for_query,
)
from app.domains.ai_assistant.context_builder import build_copilot_context
from app.domains.ai_assistant.document_intelligence import summarize_document
from app.domains.ai_assistant.form_assist import build_form_suggestions
from app.domains.ai_assistant.providers.local_rule_provider import LocalRuleProvider
from app.domains.ai_assistant.safety import (
    evaluate_input_safety,
    sanitize_response,
    sanitize_value,
    validate_response_safety,
)
from app.domains.ai_assistant.schemas import (
    ActionPreviewRequest,
    CopilotMode,
    CopilotQueryRequest,
    CopilotResponse,
    DocumentIntelligenceRequest,
    FormAssistRequest,
)
from app.domains.ai_assistant.service import (
    AiAssistantContext,
    record_ai_audit_best_effort,
    record_document_intelligence_best_effort,
    record_history_best_effort,
    require_ai_permission,
)


async def query_copilot(ctx: AiAssistantContext, request: CopilotQueryRequest) -> CopilotResponse:
    require_ai_permission(ctx, "aiCopilot.use")
    started_at = time.perf_counter()
    mode = request.mode or infer_mode(request)
    context_payload = (await build_copilot_context(ctx, request)).model_dump()
    input_safety = evaluate_input_safety(request.query, context_payload)
    if not input_safety.allowed:
        response = CopilotResponse(
            mode=mode,
            title="Guvenlik nedeniyle engellendi",
            answer="Bu istek AI Copilot guvenlik sinirlarini asiyor. Keyfi kod, SQL veya permission bypass calistirilamaz.",
            confidence=0.9,
            blocking_reasons=[input_safety.blocked_reason or "AI safety guard blocked the request."],
            safe_to_execute=False,
        )
        await record_ai_audit_best_effort(ctx, action_type="ai_blocked_by_safety", summary=response.answer, metadata={"reason": input_safety.blocked_reason})
        return response

    provider = LocalRuleProvider()
    response = await provider.answer(query=request.query, mode=mode, context_payload=context_payload)
    module_key = context_payload.get("module_key")
    actions = resolve_actions_for_query(request.query or "", ctx.request_context, module_key=module_key if isinstance(module_key, str) else None)
    response.suggested_actions = actions
    response.warnings.extend(context_payload.get("warnings", []))
    response.blocking_reasons.extend(
        action.disabled_reason for action in actions if not action.enabled and action.disabled_reason
    )
    response.can_start_now = any(action.enabled for action in actions)
    response.safe_to_execute = False
    response.requires_user_confirmation = any(action.requires_confirmation for action in actions if action.enabled)
    response.target_page = next((action.target_page for action in actions if action.enabled), None)
    response.wizard_key = next((action.wizard_key for action in actions if action.enabled and action.wizard_key), None)
    response.action_key = next((action.action_key for action in actions if action.enabled), None)
    response.answer = enrich_answer(response.answer, mode, context_payload)
    response = sanitize_response(response)
    output_safety = validate_response_safety(response, allowed_action_keys())
    if not output_safety.allowed:
        response = CopilotResponse(
            mode=mode,
            title="Cevap guvenlik filtresinden gecmedi",
            answer="AI cevabi registry veya safe action kurallarini gecemedigi icin sade aciklamaya dusuldu.",
            confidence=0.7,
            blocking_reasons=[output_safety.blocked_reason or "AI output blocked."],
            safe_to_execute=False,
        )
    history_id = await record_history_best_effort(
        ctx,
        mode=mode,
        query_text=request.query,
        context_payload=context_payload,
        response=response,
        provider=provider.name,
        safety_status="allowed" if output_safety.allowed else "blocked",
        started_at=started_at,
    )
    response.history_id = history_id
    return response


async def preview_action(ctx: AiAssistantContext, request: ActionPreviewRequest) -> dict[str, object]:
    require_ai_permission(ctx, "aiCopilot.use")
    payload = action_preview_payload(request.action_key, ctx.request_context, sanitize_value(request.form_payload))
    await record_ai_audit_best_effort(ctx, action_type="ai_action_preview_created", entity_type="ai_action", entity_id=request.action_key, summary="AI action preview created.", metadata=payload)
    return payload


async def assist_form(ctx: AiAssistantContext, request: FormAssistRequest) -> CopilotResponse:
    require_ai_permission(ctx, "aiCopilot.formAssist")
    context_payload = (await build_copilot_context(ctx, request)).model_dump()
    suggestions = build_form_suggestions(request)
    response = CopilotResponse(
        mode="form_assist",
        title="Form taslagi hazir",
        answer="Alan onerileri yalnizca taslaktir. Kaydetmeden once kullanici duzenlemesi ve backend validation gerekir.",
        confidence=max((item.confidence for item in suggestions), default=0.55),
        form_suggestions=suggestions,
        warnings=["AI form assist resmi veri degistirmez."],
        next_steps=["Onerilen alanlari forma uygula.", "Dusuk confidence alanlari kontrol et.", "Kayit icin normal backend validation akisini kullan."],
        requires_user_confirmation=True,
        can_start_now=True,
        safe_to_execute=False,
    )
    await record_history_best_effort(ctx, mode="form_assist", query_text=request.intent_text, context_payload=context_payload, response=response, provider="local_rule", safety_status="allowed", started_at=time.perf_counter())
    return sanitize_response(response)


async def summarize_or_extract_document(ctx: AiAssistantContext, request: DocumentIntelligenceRequest, *, extract: bool = False) -> CopilotResponse:
    require_ai_permission(ctx, "aiCopilot.documentIntelligence")
    context_payload = (await build_copilot_context(ctx, request)).model_dump()
    summary, doc_type, findings, confidence = summarize_document(request)
    response = CopilotResponse(
        mode="document_intelligence",
        title="Belge zekasi onerisi",
        answer=summary,
        confidence=confidence,
        document_findings=findings,
        warnings=["AI belge sonucu dogrulanmis resmi kaynak degildir.", "Alanlar insan onayi olmadan belge metadata'sina yazilmaz."],
        next_steps=["Belge turu ve tarih alanlarini kontrol et.", "Gerekirse belge dogrulama akisina gonder.", "Onerileri kaydetmeden once kullanici onayi al."],
        requires_user_confirmation=True,
        can_start_now=bool(findings),
        safe_to_execute=False,
    )
    _ = extract
    await record_document_intelligence_best_effort(
        ctx,
        document_id=request.document_id,
        entity_type=request.selected_entity_type,
        entity_id=request.selected_entity_id,
        document_type_suggestion=doc_type,
        summary=summary,
        findings=[item.model_dump() for item in findings],
        provider="local_rule",
        confidence=confidence,
    )
    await record_history_best_effort(ctx, mode="document_intelligence", query_text=request.document_name or request.document_text, context_payload=context_payload, response=response, provider="local_rule", safety_status="allowed", started_at=time.perf_counter())
    return sanitize_response(response)


def infer_mode(request: CopilotQueryRequest) -> CopilotMode:
    query = request.query.lower()
    if request.selected_entity_id and any(term in query for term in ["ozet", "özet", "summary", "durum"]):
        return "record_summary"
    if any(term in query for term in ["belge", "document", "evrak", "alan cikar"]):
        return "document_intelligence"
    if any(term in query for term in ["neden", "calismiyor", "kurulum", "hazir degil"]):
        return "admin_assist" if "admin" in query or "kurulum" in query else "explain"
    if any(term in query for term in ["yap", "olustur", "ac", "kapat", "git", "baslat", "hazirla"]):
        return "action_guidance"
    if any(term in query for term in ["rapor", "kpi", "dashboard"]):
        return "insight"
    return "explain"


def enrich_answer(answer: str, mode: str, context_payload: dict[str, object]) -> str:
    label = context_payload.get("selected_record_label") or context_payload.get("selected_entity_id")
    module_key = context_payload.get("module_key") or "genel"
    readiness = context_payload.get("module_readiness_summary") or {}
    if mode == "record_summary" and label:
        return f"{label} kaydi icin ozet: modul {module_key}. {answer}"
    if mode == "admin_assist" and isinstance(readiness, dict) and readiness.get("status"):
        return f"Kurulum/hazirlik durumu: {readiness.get('status')}. {answer}"
    if mode == "action_guidance":
        return f"Bu istek icin yalnizca registry'de tanimli guvenli aksiyonlar onerildi. {answer}"
    return answer
