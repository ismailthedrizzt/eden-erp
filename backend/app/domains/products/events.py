from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ProductCatalogEvent(BaseModel):
    event_type: str
    product_id: str
    occurred_at: datetime
    payload: dict[str, Any] = Field(default_factory=dict)
