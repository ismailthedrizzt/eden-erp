from __future__ import annotations

from collections.abc import Generator
from typing import cast

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request

from app.core.config import get_settings
from app.core.errors import DomainError
from app.policies.access_context import resolve_tenant_id


class _MappingResult:
    def __init__(self, row: dict[str, object] | None) -> None:
        self.row = row

    def mappings(self) -> _MappingResult:
        return self

    def one_or_none(self) -> dict[str, object] | None:
        return self.row


class _Session:
    def __init__(self, row: dict[str, object] | None) -> None:
        self.row = row

    async def execute(self, *_args: object, **_kwargs: object) -> _MappingResult:
        return _MappingResult(self.row)


def _request(headers: dict[str, str] | None = None) -> Request:
    raw_headers = [
        (key.lower().encode("ascii"), value.encode("ascii"))
        for key, value in (headers or {}).items()
    ]
    return Request({"type": "http", "method": "GET", "path": "/", "headers": raw_headers})


@pytest.fixture(autouse=True)
def clear_settings_cache() -> Generator[None]:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


async def test_tenant_header_requires_membership_validation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    tenant_id = await resolve_tenant_id(
        _request({"x-tenant-id": "tenant-1"}),
        cast(AsyncSession, _Session({"role_key": "admin"})),
        user_id="user-1",
        requested_tenant_id="tenant-1",
        trusted_proxy=False,
    )

    assert tenant_id == "tenant-1"


async def test_user_not_member_of_tenant_denies(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")

    with pytest.raises(DomainError) as exc:
        await resolve_tenant_id(
            _request({"x-tenant-id": "tenant-2"}),
            cast(AsyncSession, _Session(None)),
            user_id="user-1",
            requested_tenant_id="tenant-2",
            trusted_proxy=False,
        )

    assert exc.value.code == "TENANT_ACCESS_DENIED"


async def test_development_trusted_proxy_header_can_supply_tenant(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("AUTH_REQUIRED", "false")

    tenant_id = await resolve_tenant_id(
        _request({"x-tenant-id": "tenant-dev"}),
        cast(AsyncSession, _Session(None)),
        user_id=None,
        requested_tenant_id="tenant-dev",
        trusted_proxy=True,
    )

    assert tenant_id == "tenant-dev"
