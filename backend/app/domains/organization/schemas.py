from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict


class OrganizationUnitUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: str | None = None
    short_name: str | None = None
    parent_unit_id: str | None = None
    notes: str | None = None
    metadata_json: dict[str, Any] | None = None
    base_version: int | None = None
    base_updated_at: str | None = None


class OrganizationUnitCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str
    name: str
    short_name: str | None = None
    unit_type_id: str | None = None
    unit_type: str | None = None
    parent_unit_id: str | None = None
    related_branch_id: str | None = None
    start_date: str | None = None
    notes: str | None = None


class OrganizationPositionCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str | None = None
    organization_unit_id: str | None = None
    unit_id: str | None = None
    position_title: str | None = None
    title: str | None = None
    position_code: str | None = None
    position_type: str | None = None
    headcount_planned: int | None = None
    norm_count: int | None = None
    headcount_actual: int | None = None
    active_count: int | None = None
    employment_type: str | None = None
    work_type: str | None = None
    status: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    notes: str | None = None


class OrganizationUnitListResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    organization_units: list[dict[str, Any]]
    positions: list[dict[str, Any]] = []
    unitTypes: list[dict[str, Any]] = []
    meta: dict[str, Any] = {}


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
