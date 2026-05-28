from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

ProjectType = Literal[
    "internal",
    "customer",
    "implementation",
    "support",
    "rnd",
    "maintenance",
    "other",
]
ProjectStatus = Literal["draft", "active", "on_hold", "completed", "cancelled"]
IssueType = Literal[
    "task",
    "bug",
    "improvement",
    "support",
    "incident",
    "research",
    "documentation",
    "checklist",
]
IssueStatus = Literal[
    "backlog",
    "todo",
    "in_progress",
    "blocked",
    "review",
    "done",
    "cancelled",
]
Priority = Literal["lowest", "low", "medium", "high", "highest", "urgent"]


class ListResult(BaseModel):
    data: list[dict[str, Any]]
    meta: dict[str, int]


class ProjectListQuery(BaseModel):
    company_id: str | None = None
    branch_id: str | None = None
    organization_unit_id: str | None = None
    status: str | None = None
    project_type: str | None = None
    priority: str | None = None
    manager_id: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50
    sort: str = "updated_at"
    direction: str = "desc"


class ProjectTaskListQuery(BaseModel):
    company_id: str | None = None
    project_id: str | None = None
    branch_id: str | None = None
    organization_unit_id: str | None = None
    facility_id: str | None = None
    status: str | None = None
    priority: str | None = None
    issue_type: str | None = None
    assignee_user_id: str | None = None
    assignee_employee_id: str | None = None
    related_module: str | None = None
    related_entity_type: str | None = None
    related_entity_id: str | None = None
    due_from: date | None = None
    due_to: date | None = None
    overdue: bool | None = None
    label: str | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50
    sort: str = "updated_at"
    direction: str = "desc"


class ProjectCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str
    branch_id: str | None = None
    organization_unit_id: str | None = None
    facility_id: str | None = None
    project_key: str | None = Field(default=None, max_length=64)
    project_name: str = Field(min_length=1, max_length=240)
    project_type: ProjectType = "internal"
    description: str | None = None
    project_owner_id: str | None = None
    project_manager_id: str | None = None
    start_date: date | None = None
    target_end_date: date | None = None
    actual_end_date: date | None = None
    status: ProjectStatus = "active"
    priority: Priority = "medium"
    progress_percent: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    budget_amount: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, max_length=8)
    tags: list[str] = Field(default_factory=list)
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class ProjectUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    branch_id: str | None = None
    organization_unit_id: str | None = None
    facility_id: str | None = None
    project_key: str | None = Field(default=None, max_length=64)
    project_name: str | None = Field(default=None, min_length=1, max_length=240)
    project_type: ProjectType | None = None
    description: str | None = None
    project_owner_id: str | None = None
    project_manager_id: str | None = None
    start_date: date | None = None
    target_end_date: date | None = None
    actual_end_date: date | None = None
    status: ProjectStatus | None = None
    priority: Priority | None = None
    progress_percent: Decimal | None = Field(default=None, ge=0, le=100)
    budget_amount: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, max_length=8)
    tags: list[str] | None = None
    metadata_json: dict[str, Any] | None = None
    base_version: int | None = None


class ProjectTaskCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str
    project_id: str | None = None
    branch_id: str | None = None
    organization_unit_id: str | None = None
    facility_id: str | None = None
    issue_key: str | None = Field(default=None, max_length=64)
    title: str = Field(min_length=1, max_length=300)
    description: str | None = None
    issue_type: IssueType = "task"
    status: IssueStatus = "todo"
    priority: Priority = "medium"
    assignee_user_id: str | None = None
    assignee_employee_id: str | None = None
    reporter_user_id: str | None = None
    due_date: date | None = None
    start_date: date | None = None
    estimated_hours: Decimal | None = Field(default=None, ge=0)
    spent_hours: Decimal | None = Field(default=None, ge=0)
    labels: list[str] = Field(default_factory=list)
    related_module: str | None = Field(default=None, max_length=80)
    related_entity_type: str | None = Field(default=None, max_length=120)
    related_entity_id: str | None = None
    parent_task_id: str | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class ProjectTaskUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    project_id: str | None = None
    branch_id: str | None = None
    organization_unit_id: str | None = None
    facility_id: str | None = None
    issue_key: str | None = Field(default=None, max_length=64)
    title: str | None = Field(default=None, min_length=1, max_length=300)
    description: str | None = None
    issue_type: IssueType | None = None
    status: IssueStatus | None = None
    priority: Priority | None = None
    assignee_user_id: str | None = None
    assignee_employee_id: str | None = None
    reporter_user_id: str | None = None
    due_date: date | None = None
    start_date: date | None = None
    estimated_hours: Decimal | None = Field(default=None, ge=0)
    spent_hours: Decimal | None = Field(default=None, ge=0)
    labels: list[str] | None = None
    related_module: str | None = Field(default=None, max_length=80)
    related_entity_type: str | None = Field(default=None, max_length=120)
    related_entity_id: str | None = None
    parent_task_id: str | None = None
    metadata_json: dict[str, Any] | None = None
    base_version: int | None = None


class TaskTransitionRequest(BaseModel):
    status: IssueStatus
    reason: str | None = Field(default=None, max_length=500)


class TaskAssignRequest(BaseModel):
    assignee_user_id: str | None = None
    assignee_employee_id: str | None = None
    reason: str | None = Field(default=None, max_length=500)


class TaskCommentCreateRequest(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


class TaskAttachmentCreateRequest(BaseModel):
    file_ref: dict[str, Any]
    file_name: str = Field(min_length=1, max_length=260)
    file_type: str | None = Field(default=None, max_length=120)


class ProjectSummary(BaseModel):
    total_tasks: int = 0
    open_tasks: int = 0
    done_tasks: int = 0
    overdue_tasks: int = 0
    progress_percent: Decimal = Decimal("0")
    workload_by_assignee: dict[str, int] = Field(default_factory=dict)


class ProjectsSummary(BaseModel):
    total_projects: int = 0
    active_projects: int = 0
    open_tasks: int = 0
    overdue_tasks: int = 0
    urgent_tasks: int = 0
    tasks_by_status: dict[str, int] = Field(default_factory=dict)
