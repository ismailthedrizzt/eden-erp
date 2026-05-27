from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

OutboxStatus = Literal["pending", "processing", "completed", "published", "failed", "skipped"]


class OutboxEvent(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    tenant_id: str | None = None
    company_id: str | None = None
    module_key: str
    event_type: str
    aggregate_type: str
    aggregate_id: str | None = None
    event_version: str = "1.0"
    operation_id: str | None = None
    process_instance_id: str | None = None
    causation_id: str | None = None
    correlation_id: str | None = None
    payload_json: dict[str, Any] = Field(default_factory=dict)
    metadata_json: dict[str, Any] = Field(default_factory=dict)
    status: OutboxStatus = "pending"
    retry_count: int = 0
    max_retries: int = 5
    locked_at: str | None = None
    locked_by: str | None = None
    last_error: str | None = None
    created_at: str | None = None
    occurred_at: str | None = None
    updated_at: str | None = None


class OutboxDispatchSummary(BaseModel):
    processed: int = 0
    completed: int = 0
    failed: int = 0
    retried: int = 0
    skipped: int = 0
    duration_ms: int = 0
    errors: list[str] = Field(default_factory=list)
