from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.logging import bind_log_context, clear_log_context, current_log_context
from app.main import create_app


@pytest.fixture(autouse=True)
def clear_settings_cache() -> Generator[None]:
    get_settings.cache_clear()
    clear_log_context()
    yield
    clear_log_context()
    get_settings.cache_clear()


def test_bind_log_context_tracks_request_id() -> None:
    bind_log_context(request_id="req-1", correlation_id="corr-1", tenant_id="tenant-1")

    context = current_log_context()

    assert context["request_id"] == "req-1"
    assert context["correlation_id"] == "corr-1"
    assert context["tenant_id"] == "tenant-1"


def test_request_id_middleware_generates_and_returns_headers() -> None:
    response = TestClient(create_app()).get("/health")

    assert response.status_code == 200
    assert response.headers["x-request-id"]
    assert response.headers["x-correlation-id"]


def test_request_id_middleware_preserves_incoming_headers() -> None:
    response = TestClient(create_app()).get(
        "/health",
        headers={"x-request-id": "req-in", "x-correlation-id": "corr-in"},
    )

    assert response.headers["x-request-id"] == "req-in"
    assert response.headers["x-correlation-id"] == "corr-in"
