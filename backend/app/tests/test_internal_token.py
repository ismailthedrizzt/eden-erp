from __future__ import annotations

from collections.abc import Generator
from typing import Any, cast

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.core.config import get_settings
from app.core.security import is_internal_request, require_internal_token


def _request(headers: dict[str, str] | None = None) -> Request:
    raw_headers = [
        (key.lower().encode("ascii"), value.encode("ascii"))
        for key, value in (headers or {}).items()
    ]
    return Request({"type": "http", "method": "POST", "path": "/", "headers": raw_headers})


@pytest.fixture(autouse=True)
def clear_settings_cache() -> Generator[None]:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_internal_token_valid(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("INTERNAL_BACKEND_TOKEN", "secret")
    request = _request({"authorization": "Bearer secret"})

    assert is_internal_request(request) is True
    require_internal_token(request)


def test_internal_token_invalid(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("INTERNAL_BACKEND_TOKEN", "secret")
    request = _request({"authorization": "Bearer wrong"})

    with pytest.raises(HTTPException) as exc:
        require_internal_token(request)

    assert exc.value.status_code == 401
    detail = cast(dict[str, Any], exc.value.detail)
    assert detail["code"] == "INTERNAL_TOKEN_INVALID"
