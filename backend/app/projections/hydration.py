from __future__ import annotations

from typing import Any


def normalize_mapping(row: Any) -> dict[str, Any]:
    return dict(row) if row is not None else {}


def display_name_from_partner(row: dict[str, Any]) -> str | None:
    return (
        row.get("display_name")
        or row.get("trade_name")
        or " ".join(
            str(item)
            for item in [row.get("first_name"), row.get("last_name")]
            if item
        )
        or None
    )


def display_name_from_representative(row: dict[str, Any]) -> str | None:
    return row.get("display_name") or row.get("full_name") or row.get("job_title")
