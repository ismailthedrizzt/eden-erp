from __future__ import annotations

from collections.abc import Generator
from typing import cast

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.policies.access_context import (
    has_permission,
    load_effective_permissions,
    merge_permission_fallbacks,
)
from app.policies.schemas import AccessContext


class _MappingResult:
    def __init__(self, rows: list[dict[str, object]]) -> None:
        self.rows = rows

    def mappings(self) -> _MappingResult:
        return self

    def all(self) -> list[dict[str, object]]:
        return self.rows


class _Session:
    async def execute(self, statement: object, *_args: object, **_kwargs: object) -> _MappingResult:
        sql = str(statement)
        if "p.permission_key" in sql:
            return _MappingResult([{"permission_key": "companies.edit"}])
        return _MappingResult([{"role_key": "member"}])


@pytest.fixture(autouse=True)
def clear_settings_cache() -> Generator[None]:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_permission_fallback_merge_includes_parent_permissions() -> None:
    permissions = merge_permission_fallbacks(["branches.openingStart"])

    assert "branches.openingStart" in permissions
    assert "companies.edit" in permissions


def test_has_permission_uses_fallbacks() -> None:
    context = AccessContext(tenant_id="tenant-1", permissions=["companies.edit"])

    assert has_permission(context, "branches.openingStart") is True


async def test_load_effective_permissions_from_roles() -> None:
    permissions = await load_effective_permissions(
        cast(AsyncSession, _Session()),
        "tenant-1",
        "user-1",
    )

    assert "companies.edit" in permissions
