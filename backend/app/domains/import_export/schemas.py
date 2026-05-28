from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

FileType = Literal["csv", "xlsx"]
ImportJobStatus = Literal[
    "uploaded",
    "mapping_required",
    "validating",
    "validation_failed",
    "ready_to_import",
    "importing",
    "completed",
    "failed",
    "cancelled",
]
ImportRowStatus = Literal[
    "uploaded",
    "valid",
    "invalid",
    "warning",
    "duplicate",
    "imported",
    "skipped",
    "failed",
]
ExportJobStatus = Literal["queued", "processing", "completed", "failed", "cancelled"]
BulkJobStatus = Literal[
    "draft",
    "validation_failed",
    "ready_to_confirm",
    "processing",
    "completed",
    "failed",
    "cancelled",
]


def default_supported_file_types() -> list[FileType]:
    return ["csv", "xlsx"]


class ColumnRule(BaseModel):
    model_config = ConfigDict(extra="allow")

    field: str
    label: str
    required: bool = False
    data_type: str = "string"
    enum_values: list[str] = Field(default_factory=list)
    description: str | None = None
    controlled: bool = False


class ImportTemplate(BaseModel):
    model_config = ConfigDict(extra="allow")

    template_key: str
    module_key: str
    entity_type: str
    label: str
    description: str
    required_columns: list[str]
    optional_columns: list[str]
    sample_rows: list[dict[str, Any]]
    validation_rules: list[ColumnRule]
    field_mapping_hints: dict[str, list[str]]
    downloadable_template: bool = True
    duplicate_strategy: Literal["show_only", "skip_duplicates", "error_duplicate"] = "show_only"
    supported_file_types: list[FileType] = Field(default_factory=default_supported_file_types)
    import_modes: list[str] = Field(default_factory=lambda: ["create"])
    operation_controlled_fields: list[str] = Field(default_factory=list)


class ImportJobCreateRequest(BaseModel):
    module_key: str
    entity_type: str
    import_type: str = "create"
    company_id: str | None = None
    template_key: str | None = None


class ImportUploadRequest(BaseModel):
    source_file_name: str
    file_type: FileType | None = None
    content_text: str | None = None
    content_base64: str | None = None
    rows: list[dict[str, Any]] | None = None
    field_mapping: dict[str, str] | None = None

    @field_validator("source_file_name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Dosya adi zorunludur.")
        return cleaned


class ImportMappingRequest(BaseModel):
    field_mapping: dict[str, str]


class ImportValidateRequest(BaseModel):
    field_mapping: dict[str, str] | None = None


class ImportConfirmRequest(BaseModel):
    import_valid_rows_only: bool = True
    skip_duplicates: bool = True


class ExportJobCreateRequest(BaseModel):
    module_key: str
    entity_type: str
    report_key: str | None = None
    filters: dict[str, Any] = Field(default_factory=dict)
    columns: list[str] = Field(default_factory=list)
    file_type: Literal["csv"] = "csv"


class BulkActionCreateRequest(BaseModel):
    module_key: str
    entity_type: str
    action_key: str
    selected_ids: list[str] = Field(default_factory=list)
    payload: dict[str, Any] = Field(default_factory=dict)
    dry_run: bool = True


class BulkActionConfirmRequest(BaseModel):
    confirm: bool = True


class ValidationIssue(BaseModel):
    row_number: int
    field: str | None = None
    code: str
    message: str
    suggested_fix: str | None = None
    original_value: Any | None = None


class ParsedFile(BaseModel):
    rows: list[dict[str, Any]]
    columns: list[str]
    file_type: FileType
