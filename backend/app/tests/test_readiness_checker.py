from __future__ import annotations

from typing import cast

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.setup.readiness_checker import check_module_readiness


@pytest.mark.asyncio
async def test_branches_readiness_missing_table_blocks(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def missing_table(session: AsyncSession, table_name: str) -> bool:
        _ = session, table_name
        return False

    async def existing_view(session: AsyncSession, view_name: str) -> bool:
        _ = session, view_name
        return True

    async def existing_rpc(session: AsyncSession, rpc_name: str) -> bool:
        _ = session, rpc_name
        return True

    monkeypatch.setattr("app.setup.readiness_checker.check_table_exists", missing_table)
    monkeypatch.setattr("app.setup.readiness_checker.check_view_exists", existing_view)
    monkeypatch.setattr("app.setup.readiness_checker.check_rpc_exists", existing_rpc)

    result = await check_module_readiness(
        cast(AsyncSession, object()),
        "tenant-1",
        "branches",
    )

    assert result.ok is False
    assert result.status == "setup_required"
    assert "company_branches" in result.missing_tables
