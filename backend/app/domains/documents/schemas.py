# ruff: noqa: E501

from __future__ import annotations

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

DocumentStatus = Literal["draft", "uploaded", "verified", "rejected", "expired", "archived", "deleted"]
VerificationStatus = Literal["not_required", "pending", "verified", "rejected"]
RelationType = Literal[
    "primary",
    "supporting",
    "evidence",
    "attachment",
    "generated_report",
    "import_file",
    "export_file",
    "service_photo",
    "identity_document",
]
AccessAction = Literal["view", "download", "preview", "upload", "delete", "verify", "reject"]


class DocumentCreateRequest(BaseModel):
    company_id: str | None = None
    branch_id: str | None = None
    owner_entity_type: str = Field(min_length=1, max_length=80)
    owner_entity_id: str = Field(min_length=1, max_length=120)
    document_type: str = Field(min_length=1, max_length=120)
    document_category: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=240)
    description: str | None = Field(default=None, max_length=1000)
    file_name: str = Field(min_length=1, max_length=255)
    mime_type: str = Field(default="application/octet-stream", max_length=180)
    file_size: int = Field(default=0, ge=0)
    storage_bucket: str | None = None
    storage_path: str | None = None
    storage_provider: str = "supabase"
    checksum: str | None = None
    status: DocumentStatus = "uploaded"
    verification_status: VerificationStatus = "not_required"
    required: bool = False
    issue_date: date | None = None
    expiry_date: date | None = None
    tags: list[str] = Field(default_factory=list)
    metadata_json: dict[str, Any] = Field(default_factory=dict)
    relation_type: RelationType = "attachment"


class DocumentUploadRequest(BaseModel):
    company_id: str | None = None
    branch_id: str | None = None
    owner_entity_type: str = Field(min_length=1, max_length=80)
    owner_entity_id: str = Field(min_length=1, max_length=120)
    document_type: str = Field(min_length=1, max_length=120)
    document_category: str = Field(default="general", max_length=80)
    title: str | None = Field(default=None, max_length=240)
    description: str | None = Field(default=None, max_length=1000)
    file_name: str = Field(min_length=1, max_length=255)
    mime_type: str = Field(default="application/octet-stream", max_length=180)
    file_size: int = Field(default=0, ge=0)
    content_base64: str | None = None
    storage_bucket: str | None = None
    storage_path: str | None = None
    storage_provider: str = "supabase"
    required: bool = False
    verification_required: bool = False
    issue_date: date | None = None
    expiry_date: date | None = None
    tags: list[str] = Field(default_factory=list)
    metadata_json: dict[str, Any] = Field(default_factory=dict)
    relation_type: RelationType = "attachment"


class EntityDocumentUploadRequest(DocumentUploadRequest):
    owner_entity_type: str = "entity"
    owner_entity_id: str = "entity"


class DocumentUpdateRequest(BaseModel):
    title: str | None = Field(default=None, max_length=240)
    description: str | None = Field(default=None, max_length=1000)
    document_type: str | None = Field(default=None, max_length=120)
    document_category: str | None = Field(default=None, max_length=80)
    status: DocumentStatus | None = None
    verification_status: VerificationStatus | None = None
    required: bool | None = None
    issue_date: date | None = None
    expiry_date: date | None = None
    tags: list[str] | None = None
    metadata_json: dict[str, Any] | None = None


class DocumentRejectRequest(BaseModel):
    rejected_reason: str = Field(min_length=1, max_length=1000)


class DocumentUrlResponse(BaseModel):
    document_id: str
    action: str
    url: str
    expires_in: int
    storage_provider: str


class DocumentRequirement(BaseModel):
    requirement_key: str
    module_key: str
    operation_key: str | None = None
    entity_type: str
    document_type: str
    required: bool = False
    condition: dict[str, Any] = Field(default_factory=dict)
    description: str | None = None
    accepted_file_types: list[str] = Field(default_factory=list)
    max_file_size: int | None = None
    expiry_required: bool = False
    verification_required: bool = False


class DocumentRequirementQuery(BaseModel):
    module_key: str | None = None
    operation_key: str | None = None
    entity_type: str | None = None


class DocumentListQuery(BaseModel):
    module_key: str | None = None
    document_type: str | None = None
    document_category: str | None = None
    status: str | None = None
    verification_status: str | None = None
    required: bool | None = None
    company_id: str | None = None
    owner_entity_type: str | None = None
    owner_entity_id: str | None = None
    uploaded_by: str | None = None
    search: str | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)
    sort: str = "created_at"
    direction: Literal["asc", "desc"] = "desc"

    @field_validator("sort")
    @classmethod
    def validate_sort(cls, value: str) -> str:
        allowed = {
            "created_at",
            "updated_at",
            "title",
            "document_type",
            "status",
            "expiry_date",
            "file_size",
        }
        return value if value in allowed else "created_at"
