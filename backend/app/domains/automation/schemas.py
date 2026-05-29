from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

TriggerType = Literal["event", "schedule", "condition", "manual"]
RuleStatus = Literal["draft", "active", "paused", "disabled", "failed"]
RunMode = Literal["sync_safe", "async_worker"]
RunStatus = Literal[
    "success",
    "skipped",
    "failed",
    "throttled",
    "condition_not_met",
    "permission_denied",
    "readiness_missing",
]


class AutomationRuleListQuery(BaseModel):
    module_key: str | None = None
    status: str | None = None
    trigger_type: str | None = None
    failed_only: bool = False
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)


class AutomationRuleCreateRequest(BaseModel):
    rule_key: str | None = None
    rule_name: str
    description: str | None = None
    module_key: str
    trigger_type: TriggerType
    trigger_config: dict[str, Any] = Field(default_factory=dict)
    condition_config: dict[str, Any] = Field(default_factory=dict)
    action_config: dict[str, Any] = Field(default_factory=dict)
    status: RuleStatus = "draft"
    priority: str = "normal"
    run_mode: RunMode = "async_worker"
    max_runs_per_day: int | None = Field(default=None, ge=1, le=1000)
    cooldown_minutes: int | None = Field(default=None, ge=1, le=1440)
    next_run_at: datetime | None = None


class AutomationRuleUpdateRequest(BaseModel):
    rule_name: str | None = None
    description: str | None = None
    module_key: str | None = None
    trigger_type: TriggerType | None = None
    trigger_config: dict[str, Any] | None = None
    condition_config: dict[str, Any] | None = None
    action_config: dict[str, Any] | None = None
    status: RuleStatus | None = None
    priority: str | None = None
    run_mode: RunMode | None = None
    max_runs_per_day: int | None = Field(default=None, ge=1, le=1000)
    cooldown_minutes: int | None = Field(default=None, ge=1, le=1440)
    next_run_at: datetime | None = None
    base_version: int | None = None


class AutomationRunListQuery(BaseModel):
    rule_id: str | None = None
    status: str | None = None
    trigger_type: str | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)


class AutomationSimulationRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    limit: int = Field(default=20, ge=1, le=100)
    trigger_payload: dict[str, Any] = Field(default_factory=dict)


class AutomationRunNowRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    trigger_payload: dict[str, Any] = Field(default_factory=dict)


class AutomationStatusResponse(BaseModel):
    id: str
    status: str

