from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

PermissionCategory = Literal["view", "edit", "operation", "approval", "admin"]


class PermissionContract(BaseModel):
    key: str
    label: str
    description: str
    module_key: str
    domain: str
    category: PermissionCategory
    fallback: list[str] = Field(default_factory=list)
    deprecated: bool = False


class AccessContext(BaseModel):
    tenant_id: str
    user_id: str | None = None
    permissions: list[str] = Field(default_factory=list)
    company_id: str | None = None
    branch_id: str | None = None
    organization_unit_id: str | None = None
    facility_id: str | None = None
    module_key: str | None = None
    action_key: str | None = None
    record_type: str | None = None
    record_id: str | None = None
    record_status: str | None = None
    module_status: str | None = None
    company_scope: list[str] | None = None
    branch_scope: list[str] | None = None


class PolicyDecision(BaseModel):
    allowed: bool
    code: str
    message: str
    reasons: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    required_permissions: list[str] = Field(default_factory=list)
    checked_permissions: list[str] = Field(default_factory=list)
    scope: dict[str, Any] = Field(default_factory=dict)


class PolicyInput(BaseModel):
    context: AccessContext
    action_key: str | None = None
    module_key: str | None = None
    resource_type: str | None = None
    resource_id: str | None = None
    resource: dict[str, Any] | None = None
    required_permissions: list[str] = Field(default_factory=list)
    required_record_status: list[str] = Field(default_factory=list)
    blocked_record_status: list[str] = Field(default_factory=list)
    extra_rules: list[dict[str, Any]] = Field(default_factory=list)


class ActionEligibility(BaseModel):
    action_key: str
    can_view: bool = True
    can_start: bool = False
    disabled: bool = True
    reason: str | None = None
    warnings: list[str] = Field(default_factory=list)
    target_page: str | None = None
    wizard_key: str | None = None
    required_record_status: list[str] = Field(default_factory=list)
    details: dict[str, Any] = Field(default_factory=dict)
