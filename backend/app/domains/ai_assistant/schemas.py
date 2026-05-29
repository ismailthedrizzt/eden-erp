from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

CopilotMode = Literal[
    "explain",
    "record_summary",
    "action_guidance",
    "form_assist",
    "document_intelligence",
    "insight",
    "admin_assist",
]


class CopilotContextRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    current_page: str | None = None
    module_key: str | None = None
    selected_entity_type: str | None = None
    selected_entity_id: str | None = None
    selected_record_label: str | None = None
    selected_record_status: str | None = None
    include_audit: bool = False
    include_documents: bool = True
    include_action_center: bool = True
    extra_context: dict[str, Any] = Field(default_factory=dict)


class CopilotQueryRequest(CopilotContextRequest):
    query: str = ""
    mode: CopilotMode | None = None


class ActionPreviewRequest(CopilotContextRequest):
    action_key: str
    form_payload: dict[str, Any] = Field(default_factory=dict)


class FormAssistRequest(CopilotContextRequest):
    intent_text: str
    form_key: str | None = None
    current_values: dict[str, Any] = Field(default_factory=dict)


class DocumentIntelligenceRequest(CopilotContextRequest):
    document_id: str | None = None
    document_text: str | None = None
    document_name: str | None = None
    document_type_hint: str | None = None


class CopilotFeedbackRequest(BaseModel):
    history_id: str | None = None
    rating: Literal["positive", "negative", "neutral"]
    comment: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class SuggestedAction(BaseModel):
    label: str
    action_key: str
    target_page: str | None = None
    wizard_key: str | None = None
    enabled: bool = False
    disabled_reason: str | None = None
    requires_confirmation: bool = False
    preview_endpoint: str | None = None
    safety_level: int = Field(default=1, ge=0, le=4)


class FormSuggestion(BaseModel):
    field: str
    label: str
    suggested_value: Any
    confidence: float = Field(default=0.5, ge=0, le=1)
    reason: str
    source: str = "ai_assistant"
    user_editable: bool = True


class DocumentFinding(BaseModel):
    field: str
    value: Any
    confidence: float = Field(default=0.5, ge=0, le=1)
    source_excerpt: str | None = None
    warning: str | None = None
    requires_verification: bool = True


class CopilotResponse(BaseModel):
    mode: CopilotMode
    title: str
    answer: str
    confidence: float = Field(default=0.5, ge=0, le=1)
    citations: list[dict[str, Any]] = Field(default_factory=list)
    suggested_actions: list[SuggestedAction] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    blocking_reasons: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)
    form_suggestions: list[FormSuggestion] = Field(default_factory=list)
    document_findings: list[DocumentFinding] = Field(default_factory=list)
    requires_user_confirmation: bool = False
    can_start_now: bool = False
    safe_to_execute: bool = False
    target_page: str | None = None
    wizard_key: str | None = None
    action_key: str | None = None
    history_id: str | None = None


class CopilotContextPayload(BaseModel):
    tenant_id: str
    user_id: str | None = None
    permissions_summary: dict[str, Any]
    company_scope_summary: dict[str, Any]
    current_page: str | None = None
    module_key: str | None = None
    selected_entity_type: str | None = None
    selected_entity_id: str | None = None
    selected_record_label: str | None = None
    selected_record_status: str | None = None
    available_actions: list[SuggestedAction] = Field(default_factory=list)
    disabled_actions_with_reasons: list[SuggestedAction] = Field(default_factory=list)
    module_readiness_summary: dict[str, Any] = Field(default_factory=dict)
    feature_flags_summary: dict[str, Any] = Field(default_factory=dict)
    pending_actions_summary: dict[str, Any] = Field(default_factory=dict)
    recent_audit_summary: list[dict[str, Any]] = Field(default_factory=list)
    document_summary: list[dict[str, Any]] = Field(default_factory=list)
    data_quality_summary: dict[str, Any] = Field(default_factory=dict)
    field_lock_context: dict[str, Any] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)
