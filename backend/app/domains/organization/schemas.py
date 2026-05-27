from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict


class OrganizationUnitUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: str | None = None
    parent_unit_id: str | None = None
    notes: str | None = None
    metadata_json: dict[str, Any] | None = None
    base_version: int | None = None
    base_updated_at: str | None = None


class OrganizationUnitDetailResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    unit: dict[str, Any]
    company: dict[str, Any] | None = None
    parent_unit: dict[str, Any] | None = None
    child_units: list[dict[str, Any]] = []
    related_branch: dict[str, Any] | None = None
    positions_summary: dict[str, Any] = {}
    employees_summary: dict[str, Any] = {}
    warnings: list[str] = []
