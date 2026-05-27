from __future__ import annotations

from collections.abc import Generator

import pytest

from app.core.config import get_settings
from app.core.database import database_pool_summary


@pytest.fixture(autouse=True)
def clear_settings_cache() -> Generator[None]:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_database_pool_config_loads_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DB_POOL_SIZE", "9")
    monkeypatch.setenv("DB_MAX_OVERFLOW", "12")
    monkeypatch.setenv("DB_POOL_TIMEOUT", "7")
    monkeypatch.setenv("DB_POOL_RECYCLE", "600")
    monkeypatch.setenv("DB_STATEMENT_TIMEOUT_MS", "1500")
    monkeypatch.setenv("USE_SUPABASE_POOLER", "true")
    get_settings.cache_clear()

    summary = database_pool_summary()

    assert summary["pool_size"] == 9
    assert summary["max_overflow"] == 12
    assert summary["pool_timeout"] == 7
    assert summary["pool_recycle"] == 600
    assert summary["statement_timeout_ms"] == 1500
    assert summary["use_supabase_pooler"] is True


def test_outbox_worker_performance_config_loads(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OUTBOX_MAX_RUNTIME_MS", "12000")
    monkeypatch.setenv("OUTBOX_LOCK_TTL_SECONDS", "90")
    monkeypatch.setenv("OUTBOX_MAX_RETRIES", "8")
    get_settings.cache_clear()

    settings = get_settings()

    assert settings.outbox_max_runtime_ms == 12000
    assert settings.outbox_lock_ttl_seconds == 90
    assert settings.outbox_max_retries == 8
