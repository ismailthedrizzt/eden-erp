from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

SENSITIVE_FIELD_MARKERS = {
    "password",
    "token",
    "secret",
    "api_key",
    "apikey",
    "access_token",
    "refresh_token",
    "authorization",
    "cookie",
    "private_key",
    "signed_url",
    "identity_number",
    "national_id",
    "passport_no",
    "tax_number",
    "iban",
    "account_no",
    "phone",
    "email",
}


def _last_visible(value: str, count: int = 4) -> str:
    if len(value) <= count:
        return "***"
    return f"***{value[-count:]}"


def mask_sensitive_value(field: str, value: Any) -> Any:
    if value is None:
        return None
    text = str(value)
    normalized = field.lower()
    if any(marker in normalized for marker in ("email",)):
        if "@" not in text:
            return "***"
        prefix, domain = text.split("@", 1)
        visible = prefix[:1] if prefix else ""
        return f"{visible}***@{domain}"
    if any(marker in normalized for marker in ("phone", "iban", "account_no", "tax_number")):
        return _last_visible(text)
    if any(marker in normalized for marker in ("identity", "national_id", "passport")):
        return _last_visible(text)
    if any(marker in normalized for marker in SENSITIVE_FIELD_MARKERS):
        return "***"
    return value


def sanitize_for_log(data: Any) -> Any:
    if isinstance(data, Mapping):
        sanitized: dict[str, Any] = {}
        for key, value in data.items():
            key_text = str(key)
            if any(marker in key_text.lower() for marker in SENSITIVE_FIELD_MARKERS):
                sanitized[key_text] = mask_sensitive_value(key_text, value)
            else:
                sanitized[key_text] = sanitize_for_log(value)
        return sanitized
    if isinstance(data, str):
        if "signed" in data.lower() and "http" in data.lower():
            return "***"
        return data
    if isinstance(data, Sequence) and not isinstance(data, (str, bytes, bytearray)):
        return [sanitize_for_log(item) for item in data]
    return data


def sanitize_headers(headers: Mapping[str, Any]) -> dict[str, Any]:
    return {str(key): mask_sensitive_value(str(key), value) for key, value in headers.items()}


def sanitize_payload(payload: Any) -> Any:
    return sanitize_for_log(payload)
