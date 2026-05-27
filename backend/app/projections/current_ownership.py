from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.domains.ownership.current import get_current_ownership_for_company


class CurrentOwnershipProjection(BaseModel):
    data: list[dict[str, Any]]
    warnings: list[str] = Field(default_factory=list)


async def current_ownership_projection(
    session: AsyncSession,
    tenant_id: str,
    company_id: str,
) -> CurrentOwnershipProjection:
    try:
        rows = await get_current_ownership_for_company(session, tenant_id, company_id)
        return CurrentOwnershipProjection(
            data=[row.model_dump(mode="json") for row in rows],
            warnings=[],
        )
    except DomainError as error:
        if error.code == "CURRENT_OWNERSHIP_UNAVAILABLE":
            return CurrentOwnershipProjection(
                data=[],
                warnings=["CURRENT_OWNERSHIP_VIEW_MISSING_FALLBACK_USED"],
            )
        raise
