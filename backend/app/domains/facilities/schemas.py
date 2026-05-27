from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict


class FacilityUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    facility_name: str | None = None
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    notes: str | None = None
    metadata_json: dict[str, Any] | None = None
    base_version: int | None = None
    base_updated_at: str | None = None


class FacilityDetailResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    facility: dict[str, Any]
    company: dict[str, Any] | None = None
    branch: dict[str, Any] | None = None
    related_branches: list[dict[str, Any]] = []
    active_relations_summary: dict[str, Any] = {}
    warnings: list[str] = []
