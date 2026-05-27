from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.errors import DomainError
from app.main import create_app


@pytest.fixture(autouse=True)
def clear_settings_cache() -> Generator[None]:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_domain_error_standard_response() -> None:
    app = create_app()

    @app.get("/domain-error")
    async def domain_error() -> None:
        raise DomainError("Islem yapilamadi.", "BUSINESS_RULE", 409)

    response = TestClient(app).get("/domain-error", headers={"x-request-id": "req-1"})

    assert response.status_code == 409
    assert response.json()["code"] == "BUSINESS_RULE"
    assert response.json()["request_id"] == "req-1"


def test_unexpected_exception_returns_generic_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    app = create_app()

    @app.get("/boom")
    async def boom() -> None:
        raise RuntimeError("secret stack detail")

    response = TestClient(app, raise_server_exceptions=False).get(
        "/boom",
        headers={"x-request-id": "req-2"},
    )

    assert response.status_code == 500
    assert response.json()["code"] == "INTERNAL_SERVER_ERROR"
    assert response.json()["error"] == "Islem tamamlanamadi. Lutfen tekrar deneyin."
    assert response.json()["request_id"] == "req-2"
    assert response.json()["details"] == {}
