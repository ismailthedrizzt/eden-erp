from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

SearchResultType = Literal[
    "record",
    "action",
    "page",
    "report",
    "task",
    "document",
    "setting",
    "help",
]


class SearchRequest(BaseModel):
    query: str = ""
    current_page: str | None = None
    selected_record_type: str | None = None
    selected_record_id: str | None = None
    module_filter: str | None = None
    entity_types: list[str] = Field(default_factory=list)
    limit: int = Field(default=25, ge=1, le=50)
    include_actions: bool = True
    include_recent: bool = True
    include_commands: bool = True


class SearchResult(BaseModel):
    id: str
    result_type: SearchResultType
    entity_type: str | None = None
    entity_id: str | None = None
    module_key: str
    title: str
    subtitle: str | None = None
    description: str | None = None
    status: str | None = None
    badge: str | None = None
    icon: str | None = None
    target_page: str
    action_key: str | None = None
    confidence: float = 0.0
    matched_fields: list[str] = Field(default_factory=list)
    highlights: dict[str, list[str]] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)
    disabled: bool = False
    disabled_reason: str | None = None


class SearchGroup(BaseModel):
    key: str
    label: str
    results: list[SearchResult] = Field(default_factory=list)
    total_count: int = 0


class SearchSuggestion(BaseModel):
    text: str
    type: str = "query"
    reason: str | None = None


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult] = Field(default_factory=list)
    groups: list[SearchGroup] = Field(default_factory=list)
    suggestions: list[SearchSuggestion] = Field(default_factory=list)
    actions: list[SearchResult] = Field(default_factory=list)
    recent: list[SearchResult] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class CommandPaletteResponse(BaseModel):
    query: str
    top_result: SearchResult | None = None
    grouped_results: list[SearchGroup] = Field(default_factory=list)
    quick_actions: list[SearchResult] = Field(default_factory=list)
    recent_items: list[SearchResult] = Field(default_factory=list)
    suggestions: list[SearchSuggestion] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class RecentItemRequest(BaseModel):
    entity_type: str
    entity_id: str
    title: str
    target_page: str
    module_key: str
