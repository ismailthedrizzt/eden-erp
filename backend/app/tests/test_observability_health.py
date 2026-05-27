from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app


@pytest.fixture(autouse=True)
def clear_settings_cache() -> Generator[None]:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_deep_health_missing_database_config_returns_error() -> None:
    app = create_app()

    response = TestClient(app).get("/api/v1/system/health/deep")

    assert response.status_code == 200
    assert response.json()["status"] == "error"
    assert response.json()["checks"]["database"]["status"] == "error"


def test_metrics_endpoint_returns_snapshot() -> None:
    app = create_app()

    response = TestClient(app).get("/api/v1/system/metrics")

    assert response.status_code == 200
    assert "counters" in response.json()["data"]
