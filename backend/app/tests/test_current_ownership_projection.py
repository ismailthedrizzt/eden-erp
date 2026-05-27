from __future__ import annotations

from typing import cast

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.projections.current_ownership import current_ownership_projection


@pytest.mark.asyncio
async def test_current_ownership_unavailable_returns_controlled_warning(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def unavailable(
        session: AsyncSession,
        tenant_id: str,
        company_id: str,
    ) -> list[object]:
        _ = session, tenant_id, company_id
        raise DomainError(
            "Guncel ortaklik dagilimi okunamadi.",
            "CURRENT_OWNERSHIP_UNAVAILABLE",
            409,
        )

    monkeypatch.setattr(
        "app.projections.current_ownership.get_current_ownership_for_company",
        unavailable,
    )

    result = await current_ownership_projection(
        cast(AsyncSession, object()),
        "tenant-1",
        "company-1",
    )

    assert result.data == []
    assert result.warnings == ["CURRENT_OWNERSHIP_VIEW_MISSING_FALLBACK_USED"]
