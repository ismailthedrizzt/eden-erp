from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict


class FacilityUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    facility_name: str | None = None
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    notes: str | None = None
    metadata_json: dict[str, Any] | None = None
    base_version: int | None = None
    base_updated_at: str | None = None


class FacilityCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    company_id: str
    name: str | None = None
    facility_name: str | None = None
    facility_type: str | None = None
    related_branch_id: str | None = None
    branch_id: str | None = None
    country: str | None = None
    city: str | None = None
    district: str | None = None
    neighborhood: str | None = None
    address: str | None = None
    postal_code: str | None = None
    phone: str | None = None
    email: str | None = None
    start_date: str | None = None
    notes: str | None = None
    coordinates: dict[str, Any] | None = None


class FacilityListResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    data: list[dict[str, Any]]
    meta: dict[str, Any] = {}
    projection: dict[str, Any] = {}


class FacilityDetailResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    facility: dict[str, Any]
    company: dict[str, Any] | None = None
    branch: dict[str, Any] | None = None
    related_branches: list[dict[str, Any]] = []
    active_relations_summary: dict[str, Any] = {}
    warnings: list[str] = []
