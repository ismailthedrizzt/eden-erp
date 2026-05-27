from __future__ import annotations

from collections.abc import Generator
from typing import cast

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.policies.schemas import AccessContext
from app.policies.scope_policy import can_access_branch, can_access_company


class _MappingResult:
    def mappings(self) -> _MappingResult:
        return self

    def one_or_none(self) -> dict[str, object]:
        return {"company_id": "company-1"}


class _Session:
    async def execute(self, *_args: object, **_kwargs: object) -> _MappingResult:
        return _MappingResult()


@pytest.fixture(autouse=True)
def clear_settings_cache() -> Generator[None]:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


async def test_company_scope_denies_out_of_scope_company(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    context = AccessContext(tenant_id="tenant-1", company_scope=["company-1"])

    assert await can_access_company(
        cast(AsyncSession, _Session()),
        context,
        "company-2",
    ) is False


async def test_company_scope_missing_denies_in_production(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    context = AccessContext(tenant_id="tenant-1", company_scope=None)

    assert await can_access_company(
        cast(AsyncSession, _Session()),
        context,
        "company-1",
    ) is False


async def test_branch_scope_resolves_company_scope(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    context = AccessContext(tenant_id="tenant-1", company_scope=["company-1"])

    assert await can_access_branch(
        cast(AsyncSession, _Session()),
        context,
        "branch-1",
    ) is True
