from __future__ import annotations

from typing import Any


def next_version_no(parent: dict[str, Any]) -> int:
    return int(parent.get("version_no") or 1) + 1

