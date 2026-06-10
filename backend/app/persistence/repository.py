from __future__ import annotations

from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.persistence.orm import Base


class SqlAlchemyRepository[ModelT: Base]:
    """Typed repository base for SQLAlchemy ORM-backed write paths.

    New CRUD, wizard and lifecycle flows should construct ORM entities from
    service-layer command models, then persist them through repositories. Raw
    request dictionaries do not belong in this layer.
    """

    def __init__(self, session: AsyncSession, model: type[ModelT]) -> None:
        self.session = session
        self.model = model

    async def get(self, entity_id: UUID) -> ModelT | None:
        return await self.session.get(self.model, entity_id)

    async def list(self, statement: Select[tuple[ModelT]] | None = None) -> list[ModelT]:
        query = statement if statement is not None else select(self.model)
        result = await self.session.scalars(query)
        return list(result.all())

    def add(self, entity: ModelT) -> None:
        self.session.add(entity)

    async def delete(self, entity: ModelT) -> None:
        await self.session.delete(entity)

    async def flush(self) -> None:
        await self.session.flush()

    async def refresh(self, entity: ModelT) -> None:
        await self.session.refresh(entity)
