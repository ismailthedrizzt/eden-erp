from __future__ import annotations

from app.events.contracts import EVENT_TYPES


def is_known_event_type(event_type: str) -> bool:
    return event_type in EVENT_TYPES


def list_event_types() -> list[str]:
    return sorted(EVENT_TYPES)
