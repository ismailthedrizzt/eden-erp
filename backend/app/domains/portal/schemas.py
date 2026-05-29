# ruff: noqa: E501

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

ExternalUserType = Literal["customer", "dealer", "supplier", "service_partner"]
PortalRole = Literal["customer_admin", "customer_user", "customer_viewer", "service_contact"]
PortalUserStatus = Literal["invited", "active", "suspended", "revoked"]
PortalPriority = Literal["low", "medium", "high", "urgent"]
PortalRequestType = Literal["fault", "maintenance", "installation", "training", "inspection", "warranty", "upgrade", "other"]


class PortalListMeta(BaseModel):
    page: int
    pageSize: int
    total: int
    totalPages: int


class PortalListResult(BaseModel):
    data: list[dict[str, Any]]
    meta: PortalListMeta


class PortalServiceRequestCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    installed_asset_id: str | None = None
    request_type: PortalRequestType = "fault"
    priority: PortalPriority = "medium"
    subject: str = Field(min_length=2, max_length=300)
    description: str | None = None
    contact_person: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    requested_date: date | None = None
    customer_availability: str | None = None
    attachments: list[dict[str, Any]] = Field(default_factory=list)


class PortalCommentRequest(BaseModel):
    comment: str = Field(min_length=1, max_length=4000)
    attachments: list[dict[str, Any]] = Field(default_factory=list)


class PortalAttachmentRequest(BaseModel):
    attachments: list[dict[str, Any]] = Field(default_factory=list)


class PortalDocumentUploadRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    owner_entity_type: Literal["service_request", "installed_asset", "stakeholder"] = "stakeholder"
    owner_entity_id: str | None = None
    document_type: str = "customer_upload"
    title: str = Field(min_length=1, max_length=240)
    file_name: str = Field(min_length=1, max_length=240)
    mime_type: str = "application/octet-stream"
    file_size: int = Field(default=0, ge=0)
    storage_bucket: str = "eden-documents"
    storage_path: str | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class PortalInvitationCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    stakeholder_id: str
    email: str = Field(min_length=3, max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    portal_role: PortalRole = "customer_user"
    auth_user_id: str | None = None
    expires_at: datetime | None = None
    access_scope_json: dict[str, Any] = Field(default_factory=dict)


class PortalUserUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    portal_role: PortalRole | None = None
    status: PortalUserStatus | None = None
    access_scope_json: dict[str, Any] | None = None
    preferences_json: dict[str, Any] | None = None


class PortalUserListQuery(BaseModel):
    stakeholder_id: str | None = None
    status: str | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50
