from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

OutboxHandler = Callable[[AsyncSession, dict[str, Any]], Awaitable[dict[str, Any]]]


async def projection_invalidation_handler(
    session: AsyncSession,
    event: dict[str, Any],
) -> dict[str, Any]:
    _ = session
    return {"handler": "projection_invalidation", "status": "noop", "event_id": event.get("id")}


async def action_center_handler(session: AsyncSession, event: dict[str, Any]) -> dict[str, Any]:
    _ = session
    return {"handler": "action_center", "status": "noop", "event_id": event.get("id")}


async def audit_handler(session: AsyncSession, event: dict[str, Any]) -> dict[str, Any]:
    _ = session
    return {"handler": "audit", "status": "noop", "event_id": event.get("id")}


async def ai_context_refresh_handler(
    session: AsyncSession,
    event: dict[str, Any],
) -> dict[str, Any]:
    _ = session
    return {"handler": "ai_context_refresh", "status": "noop", "event_id": event.get("id")}


HANDLERS: dict[str, OutboxHandler] = {
    "projection_invalidation": projection_invalidation_handler,
    "action_center": action_center_handler,
    "audit": audit_handler,
    "ai_context_refresh": ai_context_refresh_handler,
}


def resolve_handlers(event: dict[str, Any]) -> dict[str, OutboxHandler]:
    _ = event
    return HANDLERS
