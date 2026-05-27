from __future__ import annotations

from typing import Any


def address_summary(row: dict[str, Any]) -> str | None:
    parts = [
        row.get("neighborhood"),
        row.get("district"),
        row.get("city"),
        row.get("address"),
    ]
    summary = ", ".join(str(part) for part in parts if part)
    return summary or None


def zero_branch_summary() -> dict[str, Any]:
    return {
        "total_branch_count": 0,
        "active_branch_count": 0,
        "official_branch_count": 0,
        "operation_point_count": 0,
        "closed_branch_count": 0,
        "last_opened_branch": None,
        "last_closed_branch": None,
        "branches": [],
    }


def branch_summary_from_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    active_statuses = {"active", "aktif", "open", "opened"}
    closed_statuses = {"closed", "kapali", "passive", "pasif", "terminated"}
    active_rows = [
        row
        for row in rows
        if str(row.get("record_status") or row.get("status") or "").lower()
        in active_statuses
    ]
    closed_rows = [
        row
        for row in rows
        if str(row.get("record_status") or row.get("status") or "").lower()
        in closed_statuses
    ]
    official_rows = [row for row in rows if bool(row.get("is_official_branch"))]
    operation_rows = [
        row for row in rows if str(row.get("branch_type") or "") == "operation_point"
    ]
    sorted_opened = sorted(
        rows,
        key=lambda row: str(row.get("opening_registration_date") or row.get("created_at") or ""),
        reverse=True,
    )
    sorted_closed = sorted(
        closed_rows,
        key=lambda row: str(row.get("closing_registration_date") or row.get("updated_at") or ""),
        reverse=True,
    )
    return {
        "total_branch_count": len(rows),
        "active_branch_count": len(active_rows),
        "official_branch_count": len(official_rows),
        "operation_point_count": len(operation_rows),
        "closed_branch_count": len(closed_rows),
        "last_opened_branch": sorted_opened[0] if sorted_opened else None,
        "last_closed_branch": sorted_closed[0] if sorted_closed else None,
        "branches": rows,
    }
