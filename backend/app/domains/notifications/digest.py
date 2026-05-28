# ruff: noqa: E501

from __future__ import annotations

from typing import Any


def build_digest_preview(notifications: list[dict[str, Any]]) -> dict[str, Any]:
    unread = [row for row in notifications if row.get("status") == "unread"]
    urgent = [row for row in unread if row.get("priority") == "urgent" or row.get("severity") == "critical"]
    return {
        "total": len(notifications),
        "unread": len(unread),
        "urgent": len(urgent),
        "summary": ", ".join(str(row.get("title") or "") for row in unread[:5]),
    }
