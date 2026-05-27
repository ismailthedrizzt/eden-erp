from __future__ import annotations

from typing import Any


def changed_fields(
    old_values: dict[str, Any] | None,
    new_values: dict[str, Any] | None,
) -> list[str]:
    old_values = old_values or {}
    new_values = new_values or {}
    keys = sorted(set(old_values.keys()) | set(new_values.keys()))
    return [key for key in keys if old_values.get(key) != new_values.get(key)]
