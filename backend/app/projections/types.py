from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.pagination import ListMeta, ProjectionMeta

ProjectionSourceType = Literal["table", "view", "sql", "rpc", "fallback"]


class ProjectionDefinition(BaseModel):
    key: str
    name: str
    version: str
    source_name: str
    source_type: ProjectionSourceType
    source_tables: list[str] = Field(default_factory=list)
    fields: list[str] = Field(default_factory=list)
    searchable_fields: list[str] = Field(default_factory=list)
    sortable_fields: list[str] = Field(default_factory=list)
    status_field: str | None = None
    tenant_scoped: bool = True
    company_scoped: bool = False
    fallback_strategy: str | None = None

    def meta(self, *, fallback_used: bool = False) -> ProjectionMeta:
        return ProjectionMeta(
            key=self.key,
            name=self.name,
            version=self.version,
            sourceName=self.source_name,
            fallbackUsed=fallback_used,
        )


class ProjectionQueryInput(BaseModel):
    tenant_id: str
    company_id: str | None = None
    branch_id: str | None = None
    page: int = 1
    page_size: int = 50
    search: str | None = None
    sort: str | None = None
    direction: Literal["asc", "desc"] = "asc"
    statuses: list[str] = Field(default_factory=list)
    filters: dict[str, Any] = Field(default_factory=dict)


class ProjectionQueryResult(BaseModel):
    data: list[dict[str, Any]]
    meta: ListMeta
    projection: ProjectionMeta
    warnings: list[str] = Field(default_factory=list)
