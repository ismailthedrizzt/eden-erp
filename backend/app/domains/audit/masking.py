from __future__ import annotations

from typing import Any

FULL_MASK_KEYS = {"password", "token", "secret", "api_key", "authorization"}
LAST4_MASK_KEYS = {"iban", "account_no", "identity_number", "tax_number", "vkn", "tckn"}
PARTIAL_MASK_KEYS = {"phone", "email"}


def mask_string_last4(value: str) -> str:
    if len(value) <= 4:
        return "*" * len(value)
    return f"{'*' * (len(value) - 4)}{value[-4:]}"


def mask_email(value: str) -> str:
    if "@" not in value:
        return mask_string_last4(value)
    name, domain = value.split("@", 1)
    visible = name[:2] if len(name) > 2 else name[:1]
    return f"{visible}***@{domain}"


def mask_phone(value: str) -> str:
    digits = "".join(char for char in value if char.isdigit())
    if len(digits) < 4:
        return "***"
    return f"***{digits[-4:]}"


def mask_sensitive_value(key: str, value: Any) -> Any:
    key_lower = key.lower()
    if any(token in key_lower for token in FULL_MASK_KEYS):
        return "***"
    if any(token in key_lower for token in LAST4_MASK_KEYS):
        return mask_string_last4(str(value))
    if "email" in key_lower:
        return mask_email(str(value))
    if "phone" in key_lower or "gsm" in key_lower:
        return mask_phone(str(value))
    return value


def mask_sensitive_data(value: Any, key: str = "") -> Any:
    if isinstance(value, dict):
        return {
            item_key: mask_sensitive_data(item_value, item_key)
            for item_key, item_value in value.items()
        }
    if isinstance(value, list):
        return [mask_sensitive_data(item, key) for item in value]
    if key:
        return mask_sensitive_value(key, value)
    return value
