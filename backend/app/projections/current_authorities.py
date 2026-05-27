from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.representatives.service import get_current_authority


async def hydrate_current_authority(
    session: AsyncSession,
    context: dict[str, Any],
    representative_id: str,
) -> dict[str, Any] | None:
    return await get_current_authority(session, context, representative_id)
