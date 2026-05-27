from collections.abc import AsyncIterator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


class DatabaseConfigurationError(RuntimeError):
    """Raised when database access is requested without a configured database URL."""


def get_engine() -> AsyncEngine:
    global _engine
    settings = get_settings()
    if not settings.database_url:
        raise DatabaseConfigurationError("DATABASE_URL or SUPABASE_DB_URL is required.")
    if _engine is None:
        _engine = create_async_engine(settings.database_url, pool_pre_ping=True)
    return _engine


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
        return {"status": "not_configured", "message": "Veri servisi bağlantısı yapılandırılmamış."}

    async with get_session_factory()() as session:
        await session.execute(text("select 1"))
        return {"status": "ok", "message": "Veri servisi hazır."}
