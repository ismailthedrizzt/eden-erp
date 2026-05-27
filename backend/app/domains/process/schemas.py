from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

ProcessStatus = Literal["draft", "active", "waiting_approval", "completed", "cancelled", "failed"]
TaskStatus = Literal["open", "in_progress", "completed", "cancelled", "overdue"]
ApprovalStatus = Literal["pending", "approved", "rejected", "cancelled"]


class ProcessInstance(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    tenant_id: str
    company_id: str | None = None
    module_key: str
    process_key: str
    process_version: str
    entity_type: str
    entity_id: str | None = None
    operation_key: str | None = None
    operation_id: str | None = None
    status: ProcessStatus
    current_step_key: str | None = None
    payload_json: dict[str, Any] = Field(default_factory=dict)
    result_json: dict[str, Any] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)
    started_by: str | None = None
    completed_by: str | None = None
    started_at: str | None = None
    completed_at: str | None = None
    cancelled_at: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    version: int = 1
    is_deleted: bool = False


class ProcessTask(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    tenant_id: str
    process_instance_id: str
    company_id: str | None = None
    module_key: str
    entity_type: str | None = None
    entity_id: str | None = None
    step_key: str
    title: str
    description: str | None = None
    status: TaskStatus
    assigned_to: str | None = None
    assigned_role: str | None = None
    assigned_permission: str | None = None
    due_at: str | None = None
    completed_by: str | None = None
    completed_at: str | None = None
    payload_json: dict[str, Any] = Field(default_factory=dict)
    result_json: dict[str, Any] = Field(default_factory=dict)
    created_at: str | None = None
    updated_at: str | None = None
    is_deleted: bool = False


class ProcessApproval(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    tenant_id: str
    process_instance_id: str
    task_id: str | None = None
    company_id: str | None = None
    module_key: str
    approval_type: str
    status: ApprovalStatus
    requested_by: str | None = None
    approver_id: str | None = None
    approver_role: str | None = None
    approver_permission: str | None = None
    decision_note: str | None = None
    requested_at: str | None = None
    decided_at: str | None = None
    payload_json: dict[str, Any] = Field(default_factory=dict)
    created_at: str | None = None
    updated_at: str | None = None


class ProcessEvent(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    tenant_id: str
    process_instance_id: str
    company_id: str | None = None
    module_key: str
    event_type: str
    step_key: str | None = None
    old_status: str | None = None
    new_status: str | None = None
    payload_json: dict[str, Any] = Field(default_factory=dict)
    created_by: str | None = None
    created_at: str | None = None


class StartProcessRequest(BaseModel):
    module_key: str
    process_key: str
    process_version: str = "1.0"
    entity_type: str
    entity_id: str | None = None
    company_id: str | None = None
    operation_key: str | None = None
    operation_id: str | None = None
    payload_json: dict[str, Any] = Field(default_factory=dict)


class CompleteStepRequest(BaseModel):
    payload_json: dict[str, Any] = Field(default_factory=dict)
    result_json: dict[str, Any] = Field(default_factory=dict)


class CancelProcessRequest(BaseModel):
    reason: str | None = None


class CreateTaskRequest(BaseModel):
    process_instance_id: str
    company_id: str | None = None
    module_key: str
    entity_type: str | None = None
    entity_id: str | None = None
    step_key: str
    title: str
    description: str | None = None
    assigned_to: str | None = None
    assigned_role: str | None = None
    assigned_permission: str | None = None
    due_at: str | None = None
    payload_json: dict[str, Any] = Field(default_factory=dict)


class CompleteTaskRequest(BaseModel):
    result_json: dict[str, Any] = Field(default_factory=dict)


class AssignTaskRequest(BaseModel):
    assigned_to: str | None = None
    assigned_role: str | None = None
    assigned_permission: str | None = None


class CreateApprovalRequest(BaseModel):
    process_instance_id: str
    task_id: str | None = None
    company_id: str | None = None
    module_key: str
    approval_type: str
    approver_id: str | None = None
    approver_role: str | None = None
    approver_permission: str | None = None
    payload_json: dict[str, Any] = Field(default_factory=dict)


class ApprovalDecisionRequest(BaseModel):
    decision_note: str | None = None
