from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


class EventEnvelope(BaseModel):
    event_id: str = Field(default_factory=lambda: str(uuid4()))
    event_type: str
    event_version: str = "1.0"
    tenant_id: str
    company_id: str | None = None
    aggregate_type: str
    aggregate_id: str
    operation_id: str | None = None
    process_instance_id: str | None = None
    causation_id: str | None = None
    correlation_id: str | None = None
    occurred_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    payload: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)
