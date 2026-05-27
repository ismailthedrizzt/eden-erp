from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AuditLog(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    tenant_id: str
    company_id: str | None = None
    branch_id: str | None = None
    module_key: str | None = None
    entity_type: str | None = None
    entity_id: str | None = None
    action_type: str
    action_key: str | None = None
    operation_id: str | None = None
    process_instance_id: str | None = None
    task_id: str | None = None
    approval_id: str | None = None
    outbox_event_id: str | None = None
    user_id: str | None = None
    old_values: dict[str, Any] | None = None
    new_values: dict[str, Any] | None = None
    changed_fields: list[str] = Field(default_factory=list)
    summary: str | None = None
    reason: str | None = None
    result_status: str = "success"
    severity: str = "info"
    metadata_json: dict[str, Any] = Field(default_factory=dict)
    created_at: str | None = None


class AuditRecordRequest(BaseModel):
    action_type: str
    action_key: str | None = None
    summary: str | None = None
    entity_type: str | None = None
    entity_id: str | None = None
    company_id: str | None = None
    branch_id: str | None = None
    module_key: str | None = None
    operation_id: str | None = None
    process_instance_id: str | None = None
    task_id: str | None = None
    approval_id: str | None = None
    outbox_event_id: str | None = None
    old_values: dict[str, Any] | None = None
    new_values: dict[str, Any] | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)
    result_status: str = "success"
    severity: str = "info"


class AuditQuery(BaseModel):
    entity_type: str | None = None
    entity_id: str | None = None
    company_id: str | None = None
    branch_id: str | None = None
    module_key: str | None = None
    action_type: str | None = None
    user_id: str | None = None
    operation_id: str | None = None
    process_instance_id: str | None = None
    date_from: str | None = None
    date_to: str | None = None
    limit: int = 50
    offset: int = 0
