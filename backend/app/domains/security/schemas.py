from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

RiskLevel = Literal["low", "medium", "high", "critical"]
ScopeMode = Literal[
    "all_companies",
    "assigned_companies",
    "assigned_branches",
    "organization_unit_scope",
    "own_tasks_only",
    "read_only",
    "custom",
]
PermissionCategory = Literal["view", "edit", "operation", "approval", "admin"]


class PermissionRecord(BaseModel):
    key: str
    label: str
    description: str
    module_key: str
    module_label: str
    domain: str
    category: PermissionCategory
    risk_level: RiskLevel = "low"
    fallback: list[str] = Field(default_factory=list)
    deprecated: bool = False
    critical_warning: str | None = None


class PermissionGroup(BaseModel):
    module_key: str
    module_label: str
    permissions: list[PermissionRecord]


class RoleRecord(BaseModel):
    id: str
    tenant_id: str | None = None
    role_key: str
    role_name: str
    description: str | None = None
    system_role: bool = False
    risk_level: RiskLevel = "medium"
    status: str = "active"
    permissions: list[str] = Field(default_factory=list)
    default_scope: ScopeMode = "assigned_companies"
    module_dependencies: list[str] = Field(default_factory=list)
    user_count: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None


class RoleCreate(BaseModel):
    role_key: str
    role_name: str
    description: str | None = None
    risk_level: RiskLevel = "medium"
    permissions: list[str] = Field(default_factory=list)


class RolePatch(BaseModel):
    role_name: str | None = None
    description: str | None = None
    risk_level: RiskLevel | None = None
    status: str | None = None


class RolePermissionsPatch(BaseModel):
    permission_keys: list[str]
    change_reason: str | None = None


class UserProfile(BaseModel):
    id: str
    tenant_id: str | None = None
    auth_user_id: str | None = None
    display_name: str
    email: str | None = None
    status: str = "active"
    last_login_at: datetime | None = None
    role_keys: list[str] = Field(default_factory=list)
    company_scope_summary: str = "Kapsam tanimli degil"
    branch_scope_summary: str = "Kapsam tanimli degil"
    effective_permission_count: int = 0
    metadata_json: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime | None = None
    updated_at: datetime | None = None


class UserPatch(BaseModel):
    display_name: str | None = None
    email: str | None = None
    status: str | None = None
    metadata_json: dict[str, Any] | None = None


class UserRoleMutation(BaseModel):
    role_id: str
    company_id: str | None = None
    branch_id: str | None = None
    scope_mode: ScopeMode | None = None
    reason: str | None = None


class UserRoleAssignment(BaseModel):
    id: str
    role_id: str
    role_key: str
    role_name: str
    company_id: str | None = None
    branch_id: str | None = None
    scope_mode: ScopeMode | None = None
    created_at: datetime | None = None


class CompanyScopeRecord(BaseModel):
    id: str | None = None
    company_id: str
    company_name: str | None = None
    can_view: bool = True
    can_edit: bool = False
    can_operate: bool = False


class BranchScopeRecord(BaseModel):
    id: str | None = None
    branch_id: str
    branch_name: str | None = None
    company_id: str | None = None
    can_view: bool = True
    can_edit: bool = False
    can_operate: bool = False


class UserScopeResponse(BaseModel):
    user_id: str
    scope_modes: list[ScopeMode] = Field(default_factory=list)
    company_scopes: list[CompanyScopeRecord] = Field(default_factory=list)
    branch_scopes: list[BranchScopeRecord] = Field(default_factory=list)
    effective_summary: list[str] = Field(default_factory=list)


class UserScopesPatch(BaseModel):
    company_scopes: list[CompanyScopeRecord] = Field(default_factory=list)
    branch_scopes: list[BranchScopeRecord] = Field(default_factory=list)
    change_reason: str | None = None


class PermissionMatrixCell(BaseModel):
    role_id: str
    role_key: str
    permission_key: str
    granted: bool
    risk_level: RiskLevel = "low"
    warning: str | None = None


class PermissionMatrixResponse(BaseModel):
    roles: list[RoleRecord]
    groups: list[PermissionGroup]
    cells: list[PermissionMatrixCell]
    warnings: list[str] = Field(default_factory=list)


class PolicyTestRequest(BaseModel):
    tested_user_id: str
    action_key: str | None = None
    module_key: str | None = None
    permission_key: str | None = None
    company_id: str | None = None
    branch_id: str | None = None
    record_type: str | None = None
    record_id: str | None = None
    record_status: str | None = None


class PolicyTestResult(BaseModel):
    allowed: bool
    decision: Literal["allowed", "denied"]
    reasons: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    permission_result: dict[str, Any] = Field(default_factory=dict)
    scope_result: dict[str, Any] = Field(default_factory=dict)
    module_result: dict[str, Any] = Field(default_factory=dict)
    policy_result: dict[str, Any] = Field(default_factory=dict)


class PermissionDenialRecord(BaseModel):
    id: str
    actor_user_id: str | None = None
    action_type: str
    record_type: str | None = None
    record_id: str | None = None
    reason: str
    created_at: datetime | None = None


class AccessSummary(BaseModel):
    users: int = 0
    active_users: int = 0
    roles: int = 0
    system_roles: int = 0
    risky_permissions: int = 0
    permission_denials_30d: int = 0
    scope_denials_30d: int = 0
    warnings: list[str] = Field(default_factory=list)


class SecurityEvent(BaseModel):
    model_config = ConfigDict(extra="allow")

    event_type: str
    affected_user_id: str | None = None
    role_id: str | None = None
    permission_keys: list[str] = Field(default_factory=list)
    reason: str | None = None
