from __future__ import annotations

from typing import cast

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.persistence.unit_of_work import SqlAlchemyUnitOfWork, UnitOfWorkStateError


class FakeAsyncSession:
    def __init__(self) -> None:
        self.commit_count = 0
        self.rollback_count = 0
        self.close_count = 0
        self.flush_count = 0

    async def commit(self) -> None:
        self.commit_count += 1

    async def rollback(self) -> None:
        self.rollback_count += 1

    async def close(self) -> None:
        self.close_count += 1

    async def flush(self) -> None:
        self.flush_count += 1


class PlannedFailure(Exception):
    pass


async def test_unit_of_work_requires_context_for_session() -> None:
    unit_of_work = SqlAlchemyUnitOfWork(session=cast(AsyncSession, FakeAsyncSession()))

    with pytest.raises(UnitOfWorkStateError):
        _ = unit_of_work.session


async def test_unit_of_work_rolls_back_when_commit_is_not_called() -> None:
    fake_session = FakeAsyncSession()

    async with SqlAlchemyUnitOfWork(session=cast(AsyncSession, fake_session)) as unit_of_work:
        await unit_of_work.flush()

    assert fake_session.flush_count == 1
    assert fake_session.commit_count == 0
    assert fake_session.rollback_count == 1


async def test_unit_of_work_commit_prevents_exit_rollback() -> None:
    fake_session = FakeAsyncSession()

    async with SqlAlchemyUnitOfWork(session=cast(AsyncSession, fake_session)) as unit_of_work:
        await unit_of_work.commit()

    assert fake_session.commit_count == 1
    assert fake_session.rollback_count == 0


async def test_unit_of_work_exception_rolls_back() -> None:
    fake_session = FakeAsyncSession()

    with pytest.raises(PlannedFailure):
        async with SqlAlchemyUnitOfWork(session=cast(AsyncSession, fake_session)):
            raise PlannedFailure

    assert fake_session.commit_count == 0
    assert fake_session.rollback_count == 1


async def test_unit_of_work_owned_session_is_closed() -> None:
    fake_session = FakeAsyncSession()

    async with SqlAlchemyUnitOfWork(
        session_factory=lambda: cast(AsyncSession, fake_session),
    ) as unit_of_work:
        await unit_of_work.commit()

    assert fake_session.commit_count == 1
    assert fake_session.close_count == 1
