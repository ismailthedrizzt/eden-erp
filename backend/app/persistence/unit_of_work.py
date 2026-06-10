from __future__ import annotations

from collections.abc import Callable
from types import TracebackType

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session_factory

SessionFactory = Callable[[], AsyncSession]


class UnitOfWorkStateError(RuntimeError):
    """Raised when a unit of work is used outside its transaction boundary."""


class SqlAlchemyUnitOfWork:
    """Explicit transaction boundary for backend write flows.

    A service that creates, updates, submits or performs lifecycle transitions
    must either call `commit()` after all repository writes succeed, or the unit
    of work rolls back on exit. This keeps CRUD and operation flows from relying
    on implicit persistence.
    """

    def __init__(
        self,
        *,
        session_factory: SessionFactory | None = None,
        session: AsyncSession | None = None,
    ) -> None:
        if session_factory is not None and session is not None:
            raise UnitOfWorkStateError("Provide either session_factory or session, not both.")
        self._session_factory = session_factory
        self._provided_session = session
        self._session: AsyncSession | None = None
        self._owns_session = False
        self._committed = False

    @property
    def session(self) -> AsyncSession:
        if self._session is None:
            raise UnitOfWorkStateError("Unit of work session is only available inside context.")
        return self._session

    async def __aenter__(self) -> SqlAlchemyUnitOfWork:
        if self._provided_session is not None:
            self._session = self._provided_session
            self._owns_session = False
        else:
            factory = self._session_factory or get_session_factory()
            self._session = factory()
            self._owns_session = True
        self._committed = False
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        _exc: BaseException | None,
        _traceback: TracebackType | None,
    ) -> None:
        if self._session is None:
            return

        try:
            if exc_type is not None:
                await self._session.rollback()
            elif not self._committed:
                await self._session.rollback()
        finally:
            if self._owns_session:
                await self._session.close()
            self._session = None
            self._owns_session = False
            self._committed = False

    async def flush(self) -> None:
        await self.session.flush()

    async def commit(self) -> None:
        await self.session.commit()
        self._committed = True

    async def rollback(self) -> None:
        await self.session.rollback()
        self._committed = False
