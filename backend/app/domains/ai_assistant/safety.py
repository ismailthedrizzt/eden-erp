# ruff: noqa: E501

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from app.domains.ai_assistant.schemas import CopilotResponse

EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
IBAN_RE = re.compile(r"\bTR\d{2}[0-9A-Z]{10,30}\b", re.IGNORECASE)
PHONE_RE = re.compile(r"(?<!\d)(?:\+90|0)?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}(?!\d)")
TAX_ID_RE = re.compile(r"(?<!\d)\d{10,11}(?!\d)")
SIGNED_URL_RE = re.compile(r"https?://[^\s\"']*(?:token|signature|signed|X-Amz-Signature)[^\s\"']*", re.IGNORECASE)
SECRET_RE = re.compile(r"(?i)\b(api[_-]?key|token|secret|password|service[_-]?role)\s*[:=]\s*[^,\s}]+")


@dataclass
class SafetyResult:
    allowed: bool
    blocked_reason: str | None = None
    redactions: list[str] = field(default_factory=list)


def mask_sensitive_text(value: str) -> str:
    text = value
    text = EMAIL_RE.sub("[email_masked]", text)
    text = IBAN_RE.sub("[iban_masked]", text)
    text = PHONE_RE.sub("[phone_masked]", text)
    text = TAX_ID_RE.sub("[id_masked]", text)
    text = SIGNED_URL_RE.sub("[signed_url_masked]", text)
    text = SECRET_RE.sub("[secret_masked]", text)
    return text


def sanitize_value(value: Any) -> Any:
    if isinstance(value, str):
        return mask_sensitive_text(value)
    if isinstance(value, list):
        return [sanitize_value(item) for item in value]
    if isinstance(value, tuple):
        return [sanitize_value(item) for item in value]
    if isinstance(value, dict):
        safe: dict[str, Any] = {}
        for key, item in value.items():
            lowered = str(key).lower()
            if any(token in lowered for token in ["secret", "token", "password", "signed_url", "storage_path", "api_key"]):
                safe[str(key)] = "[redacted]"
            else:
                safe[str(key)] = sanitize_value(item)
        return safe
    return value


def evaluate_input_safety(query: str | None, context_payload: dict[str, Any] | None = None) -> SafetyResult:
    text = (query or "").lower()
    blocked_terms = ["drop table", "delete from", "select * from", "run python", "execute javascript", "bypass permission"]
    if any(term in text for term in blocked_terms):
        return SafetyResult(False, "AI copilot keyfi SQL, kod veya permission bypass istegi calistiramaz.")
    _ = context_payload
    return SafetyResult(True)


def validate_response_safety(response: CopilotResponse, allowed_action_keys: set[str]) -> SafetyResult:
    for action in response.suggested_actions:
        if action.action_key not in allowed_action_keys:
            return SafetyResult(False, f"Registry disi action reddedildi: {action.action_key}")
        if action.safety_level >= 3 and action.enabled:
            return SafetyResult(False, "Mutation yapan AI actionlari backend precheck ve acik kullanici onayi olmadan etkin olamaz.")
    if response.safe_to_execute and response.requires_user_confirmation:
        return SafetyResult(False, "Onay gerektiren cevap safe_to_execute olarak isaretlenemez.")
    return SafetyResult(True)


def sanitize_response(response: CopilotResponse) -> CopilotResponse:
    payload = response.model_dump()
    sanitized = sanitize_value(payload)
    return CopilotResponse.model_validate(sanitized)
