from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

Severity = Literal["exact", "strong", "weak"]
FindingSeverity = Literal["info", "warning", "critical"]


class QualityCheckRequest(BaseModel):
    entity_types: list[str] = Field(default_factory=list)
    include_duplicates: bool = True
    include_scores: bool = True
    create_action_items: bool = True
    limit_per_entity: int = Field(default=100, ge=1, le=500)


class DuplicateDetectRequest(BaseModel):
    entity_types: list[str] = Field(default_factory=list)
    limit_per_rule: int = Field(default=25, ge=1, le=100)


class DuplicateGroupActionRequest(BaseModel):
    resolution_notes: str | None = None


class RuleUpdateRequest(BaseModel):
    active: bool | None = None
    severity: str | None = None
    config_json: dict[str, Any] | None = None
    description: str | None = None


class DuplicateCandidateItemDraft(BaseModel):
    entity_type: str
    entity_id: str
    display_name: str
    match_fields: dict[str, Any] = Field(default_factory=dict)
    is_suggested_master: bool = False


class DuplicateCandidateGroupDraft(BaseModel):
    duplicate_group_key: str
    entity_type: str
    match_score: float
    match_reason: str
    severity: Severity
    suggested_master_id: str | None = None
    items: list[DuplicateCandidateItemDraft] = Field(default_factory=list)


class MergePreviewRequest(BaseModel):
    entity_type: str
    source_entity_ids: list[str] = Field(min_length=1)
    target_entity_id: str
    field_strategy: dict[str, Any] = Field(default_factory=dict)
    duplicate_group_id: str | None = None
    reason: str | None = None


class MergeConfirmRequest(MergePreviewRequest):
    confirmed_impact_ack: bool = False


class DataQualityScore(BaseModel):
    entity_type: str
    entity_id: str
    score: float
    status: str
    missing_fields: list[str] = Field(default_factory=list)
    duplicate_risk: dict[str, Any] = Field(default_factory=dict)
    relation_warnings: list[str] = Field(default_factory=list)


class MergePreviewResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    entity_type: str
    target_entity_id: str
    source_entity_ids: list[str]
    safe_to_merge: bool
    merge_allowed: bool
    blocked_reason: str | None = None
    field_comparison: list[dict[str, Any]] = Field(default_factory=list)
    relation_impact: list[dict[str, Any]] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    suggested_strategy: dict[str, Any] = Field(default_factory=dict)

