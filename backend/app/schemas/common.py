from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict


class ApiSuccess[T](BaseModel):
    data: T
    meta: dict[str, Any] | None = None
    operation_id: str | None = None
    operation_status: str | None = None
    process_instance_id: str | None = None
    warnings: list[str] = []
    message: str | None = None


class ApiError(BaseModel):
    error: str
    code: str
    details: dict[str, Any] | None = None
    operation_id: str | None = None
    operation_status: str | None = None
    process_instance_id: str | None = None
    message: str | None = None


class OperationResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    data: dict[str, Any] | None = None
    operation_id: str | None = None
    operation_status: str = "completed"
    warnings: list[str] = []
    message: str = "İşlem tamamlandı."


class PrecheckResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    ok: bool
    operation_enabled: bool
    message: str
    warnings: list[str] = []
    blocking_reasons: list[str] = []
    current: dict[str, Any] | None = None
    branches: list[dict[str, Any]] = []
    organization_units: list[dict[str, Any]] = []
    facilities: list[dict[str, Any]] = []
    selected_branch: dict[str, Any] | None = None
    impact: dict[str, Any] = {}
