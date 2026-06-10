from __future__ import annotations

from typing import cast

from sqlalchemy import String
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from app.persistence import (
    Base,
    LifecycleStatusMixin,
    SqlAlchemyRepository,
    TimestampMixin,
    UuidPrimaryKeyMixin,
    WorkspaceScopedMixin,
)


class ExampleOrmRecord(
    UuidPrimaryKeyMixin,
    TimestampMixin,
    WorkspaceScopedMixin,
    LifecycleStatusMixin,
    Base,
):
    __tablename__ = "test_orm_contract_records"

    name: Mapped[str] = mapped_column(String(120), nullable=False)


class FakeRepositorySession:
    def __init__(self) -> None:
        self.added: list[object] = []
        self.deleted: list[object] = []
        self.refreshed: list[object] = []
        self.flush_count = 0

    def add(self, entity: object) -> None:
        self.added.append(entity)

    async def delete(self, entity: object) -> None:
        self.deleted.append(entity)

    async def flush(self) -> None:
        self.flush_count += 1

    async def refresh(self, entity: object) -> None:
        self.refreshed.append(entity)


def test_orm_base_uses_deterministic_naming_convention() -> None:
    assert Base.metadata.naming_convention["pk"] == "pk_%(table_name)s"
    assert Base.metadata.naming_convention["fk"] == (
        "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s"
    )


def test_orm_mixins_define_canonical_columns() -> None:
    table = ExampleOrmRecord.__table__

    assert table.c.id.primary_key is True
    assert table.c.tenant_id.index is True
    assert table.c.workspace_id.index is True
    assert table.c.created_at.nullable is False
    assert table.c.updated_at.nullable is False
    assert table.c.status.nullable is False


async def test_repository_accepts_entities_not_raw_payloads() -> None:
    fake_session = FakeRepositorySession()
    repository = SqlAlchemyRepository[ExampleOrmRecord](
        cast(AsyncSession, fake_session),
        ExampleOrmRecord,
    )
    entity = ExampleOrmRecord()
    entity.name = "Atlas"
    entity.status = "draft"

    repository.add(entity)
    await repository.flush()
    await repository.refresh(entity)
    await repository.delete(entity)

    assert fake_session.added == [entity]
    assert fake_session.flush_count == 1
    assert fake_session.refreshed == [entity]
    assert fake_session.deleted == [entity]
