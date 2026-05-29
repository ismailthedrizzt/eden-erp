# ruff: noqa: E501,I001

from __future__ import annotations

from app.core.security import RequestContext
from app.domains.ai_assistant.action_resolver import action_preview_payload, allowed_action_keys, resolve_actions_for_query
from app.domains.ai_assistant.document_intelligence import summarize_document
from app.domains.ai_assistant.form_assist import build_form_suggestions
from app.domains.ai_assistant.safety import evaluate_input_safety, mask_sensitive_text, validate_response_safety
from app.domains.ai_assistant.schemas import CopilotResponse, DocumentIntelligenceRequest, FormAssistRequest, SuggestedAction
from app.policies.permissions import PERMISSIONS
from app.setup.readiness_registry import get_readiness_definition


def context_with_permissions(*permissions: str) -> RequestContext:
    return RequestContext(
        tenant_id="00000000-0000-0000-0000-000000000000",
        user_id="11111111-1111-1111-1111-111111111111",
        permissions=list(permissions),
    )


def test_ai_safety_masks_sensitive_values() -> None:
    text = "Ali 5551234567 ali@example.com TR120006200119000006672315 ve 12345678901"
    masked = mask_sensitive_text(text)
    assert "ali@example.com" not in masked
    assert "TR120006200119000006672315" not in masked
    assert "12345678901" not in masked
    assert "[email_masked]" in masked


def test_ai_safety_blocks_code_and_sql_requests() -> None:
    result = evaluate_input_safety("select * from users sonra permission bypass yap")
    assert not result.allowed
    assert result.blocked_reason


def test_ai_action_registry_permission_and_critical_guards() -> None:
    context = context_with_permissions("aiCopilot.use", "documents.upload", "branches.closingStart")
    actions = resolve_actions_for_query("belge yukle ve sube kapat", context)
    upload = next(action for action in actions if action.action_key == "upload_document")
    assert upload.enabled
    closing = action_preview_payload("branch_closing", context, {})
    assert closing["allowed"] is False
    assert closing["mutates_data"] is False
    assert "Kritik" in str(closing["blocking_reasons"][0])


def test_ai_response_rejects_unknown_actions() -> None:
    response = CopilotResponse(
        mode="action_guidance",
        title="unsafe",
        answer="unsafe",
        suggested_actions=[SuggestedAction(label="Run", action_key="run_arbitrary_sql", enabled=True)],
    )
    result = validate_response_safety(response, allowed_action_keys())
    assert not result.allowed


def test_form_assist_is_suggestion_only() -> None:
    suggestions = build_form_suggestions(
        FormAssistRequest(
            intent_text="Fotografciya 500 TL sahsi odedim, belge aranacak",
            form_key="accounting_transaction",
        )
    )
    fields = {item.field for item in suggestions}
    assert {"amount", "currency", "document_status"}.issubset(fields)
    assert all(item.user_editable for item in suggestions)


def test_document_intelligence_requires_verification() -> None:
    summary, doc_type, findings, confidence = summarize_document(
        DocumentIntelligenceRequest(document_text="Fatura ABC20260001 29.05.2026 toplam 1.250,00 TL")
    )
    assert doc_type == "invoice"
    assert "dogrulanmis resmi belge yorumu degildir" in summary
    assert confidence > 0.5
    assert findings
    assert all(item.requires_verification for item in findings)


def test_ai_permissions_and_readiness_registered() -> None:
    for permission in [
        "aiCopilot.use",
        "aiCopilot.formAssist",
        "aiCopilot.documentIntelligence",
        "aiCopilot.adminAssist",
        "aiCopilot.viewHistory",
        "aiCopilot.manageSettings",
    ]:
        assert permission in PERMISSIONS

    definition = get_readiness_definition("aiCopilot")
    assert definition is not None
    assert "ai_copilot_history" in definition.required_tables
    assert "ai_document_intelligence_results" in definition.optional_tables
