from __future__ import annotations

from math import ceil
from typing import Any, Literal

from pydantic import BaseModel, Field

SortDirection = Literal["asc", "desc"]


class ListMeta(BaseModel):
    page: int
    pageSize: int
    total: int
    totalPages: int


class ProjectionMeta(BaseModel):
    key: str
    name: str
    version: str
    sourceName: str
    fallbackUsed: bool = False


class ListResponse[T](BaseModel):
    data: list[T]
    meta: ListMeta
    projection: ProjectionMeta | None = None
    warnings: list[str] = Field(default_factory=list)


class ProjectionQueryParams(BaseModel):
    page: int = 1
    page_size: int = 50
    search: str | None = None
    sort: str | None = None
    direction: SortDirection = "asc"
    statuses: list[str] = Field(default_factory=list)
    filters: dict[str, Any] = Field(default_factory=dict)


def build_list_meta(page: int, page_size: int, total: int) -> ListMeta:
    safe_page = max(page, 1)
    safe_page_size = min(max(page_size, 1), 200)
    total_pages = ceil(total / safe_page_size) if total > 0 else 0
    return ListMeta(
        page=safe_page,
        pageSize=safe_page_size,
        total=total,
        totalPages=total_pages,
    )
