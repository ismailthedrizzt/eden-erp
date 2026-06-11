from __future__ import annotations

from datetime import date, datetime
from datetime import time as datetime_time
from typing import Any


def normalize_optional_datetime(value: Any, *, field_name: str = "datetime") -> datetime | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, datetime_time.min)
    if isinstance(value, str):
        normalized = value.strip()
        if not normalized:
            return None
        if normalized.endswith("Z"):
            normalized = f"{normalized[:-1]}+00:00"
        try:
            return datetime.fromisoformat(normalized)
        except ValueError as exc:
            raise ValueError(f"{field_name} must be a valid ISO datetime") from exc
    raise TypeError(f"{field_name} must be datetime, date, ISO string, or null")
