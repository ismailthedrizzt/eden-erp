from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app

INTERNAL_HEADERS = {"x-internal-token": "test-internal-token"}


@pytest.fixture(autouse=True)
def clear_settings_cache(monkeypatch: pytest.MonkeyPatch) -> Generator[None]:
    monkeypatch.setenv("APP_ENV", "release")
    monkeypatch.setenv("AUTH_REQUIRED", "true")
    monkeypatch.setenv("INTERNAL_BACKEND_TOKEN", "test-internal-token")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_deep_health_requires_internal_token() -> None:
    app = create_app()

    response = TestClient(app).get("/api/v1/system/health/deep")

    assert response.status_code == 401
    assert response.json()["code"] == "INTERNAL_TOKEN_INVALID"


def test_deep_health_missing_database_config_returns_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DATABASE_URL", "")
    get_settings.cache_clear()
    app = create_app()

    response = TestClient(app).get("/api/v1/system/health/deep", headers=INTERNAL_HEADERS)

    assert response.status_code == 200
    assert response.json()["status"] == "error"
    assert response.json()["checks"]["database"]["status"] == "error"


def test_metrics_requires_internal_token() -> None:
    app = create_app()

    response = TestClient(app).get("/api/v1/system/metrics")

    assert response.status_code == 401
    assert response.json()["code"] == "INTERNAL_TOKEN_INVALID"


def test_metrics_endpoint_returns_snapshot() -> None:
    app = create_app()

    response = TestClient(app).get("/api/v1/system/metrics", headers=INTERNAL_HEADERS)

    assert response.status_code == 200
    assert "counters" in response.json()["data"]
