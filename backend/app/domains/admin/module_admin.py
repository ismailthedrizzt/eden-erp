from __future__ import annotations

from typing import Any

_MODULE_ACTIVATION_OVERRIDES: dict[str, dict[str, bool]] = {}


def set_module_activation(tenant_id: str, module_key: str, enabled: bool) -> None:
    _MODULE_ACTIVATION_OVERRIDES.setdefault(tenant_id, {})[module_key] = enabled


def is_module_enabled(tenant_id: str, module_key: str, default: bool = True) -> bool:
    return _MODULE_ACTIVATION_OVERRIDES.get(tenant_id, {}).get(module_key, default)


def module_activation_payload(tenant_id: str) -> dict[str, Any]:
    return dict(_MODULE_ACTIVATION_OVERRIDES.get(tenant_id, {}))

