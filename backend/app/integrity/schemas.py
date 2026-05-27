from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

IntegritySeverity = Literal["info", "warning", "blocking", "critical"]


class IntegrityCheckResult(BaseModel):
    key: str
    ok: bool
    severity: IntegritySeverity = "info"
    message: str
    reasons: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    affected_entities: list[dict[str, Any]] = Field(default_factory=list)
    suggested_actions: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class IntegritySummary(BaseModel):
    ok: bool
    blocking_count: int = 0
    warning_count: int = 0
    critical_count: int = 0
    results: list[IntegrityCheckResult] = Field(default_factory=list)
    blocking_reasons: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    suggested_actions: list[str] = Field(default_factory=list)
