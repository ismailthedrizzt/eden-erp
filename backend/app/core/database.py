import time
from collections.abc import AsyncIterator
from typing import Any

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings
from app.core.logging import log_warning
from app.core.metrics import observe_duration

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None
_listeners_attached = False


class DatabaseConfigurationError(RuntimeError):
    """Raised when database access is requested without a configured database URL."""


def get_engine() -> AsyncEngine:
    global _engine
    settings = get_settings()
    if not settings.database_url:
        raise DatabaseConfigurationError("DATABASE_URL or SUPABASE_DB_URL is required.")
    if _engine is None:
        _engine = create_async_engine(
            settings.database_url,
            pool_pre_ping=True,
            pool_size=settings.effective_db_pool_size,
            max_overflow=settings.db_max_overflow,
            pool_timeout=settings.db_pool_timeout,
            pool_recycle=settings.db_pool_recycle,
            connect_args=_connect_args(settings.database_url, settings.db_statement_timeout_ms),
        )
        _attach_query_timing_listeners(_engine)
    return _engine


def _connect_args(database_url: str, statement_timeout_ms: int | None) -> dict[str, Any]:
    if not statement_timeout_ms or statement_timeout_ms <= 0:
        return {}
    if "asyncpg" not in database_url:
        return {}
    return {"server_settings": {"statement_timeout": str(statement_timeout_ms)}}


def database_pool_summary() -> dict[str, Any]:
    settings = get_settings()
    return {
        "pool_size": settings.effective_db_pool_size,
        "base_pool_size": settings.db_pool_size,
        "worker_pool_size": settings.worker_db_pool_size,
        "max_overflow": settings.db_max_overflow,
        "pool_timeout": settings.db_pool_timeout,
        "pool_recycle": settings.db_pool_recycle,
        "statement_timeout_ms": settings.db_statement_timeout_ms,
        "slow_query_ms": settings.db_slow_query_ms,
        "use_supabase_pooler": settings.use_supabase_pooler,
    }


def _attach_query_timing_listeners(engine: AsyncEngine) -> None:
    global _listeners_attached
    if _listeners_attached:
        return
    _listeners_attached = True

    @event.listens_for(engine.sync_engine, "before_cursor_execute")
    def before_cursor_execute(
        conn: Any,
        _cursor: Any,
        _statement: str,
        _parameters: Any,
        _context: Any,
        _executemany: bool,
    ) -> None:
        conn.info.setdefault("eden_query_start_time", []).append(time.perf_counter())

    @event.listens_for(engine.sync_engine, "after_cursor_execute")
    def after_cursor_execute(
        conn: Any,
        _cursor: Any,
        statement: str,
        _parameters: Any,
        _context: Any,
        _executemany: bool,
    ) -> None:
        starts = conn.info.get("eden_query_start_time") or []
        if not starts:
            return
        started = starts.pop(-1)
        duration_ms = (time.perf_counter() - started) * 1000
        observe_duration("db_query_duration_ms", duration_ms)
        threshold = get_settings().db_slow_query_ms
        if duration_ms >= threshold:
            log_warning(
                "Slow database query detected.",
                logger_name="eden.database",
                duration_ms=round(duration_ms, 2),
                error_code="DB_SLOW_QUERY",
                details={"statement": statement[:240]},
            )


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(get_engine(), expire_on_commit=False)
    return _session_factory


async def get_session() -> AsyncIterator[AsyncSession]:
    async with get_session_factory()() as session:
        yield session


async def check_database_health() -> dict[str, str]:
    if not get_settings().database_url:
        return {"status": "not_configured", "message": "Veri servisi baglantisi yapilandirilmamis."}

    async with get_session_factory()() as session:
        await session.execute(text("select 1"))
        return {"status": "ok", "message": "Veri servisi hazir."}
