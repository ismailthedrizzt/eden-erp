from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AfterSalesEvent(BaseModel):
    event_type: str
    aggregate_type: str
    aggregate_id: str
    occurred_at: datetime
    payload: dict[str, Any] = Field(default_factory=dict)
