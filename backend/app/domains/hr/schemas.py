from __future__ import annotations

from datetime import date
from typing import Any, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

RecordStatus = Literal["draft", "active", "passive"]
EmploymentStatus = Literal["draft", "active", "suspended", "terminated", "passive"]
EmploymentType = Literal["full_time", "part_time", "contract", "intern", "temporary", "consultant"]
SgkStatus = Literal["not_required", "pending", "submitted", "completed", "failed"]
WorkLocationType = Literal["office", "remote", "hybrid", "field"]
Gender = Literal["male", "female", "other", "unspecified"]
DocumentStatus = Literal["missing", "uploaded", "expired", "rejected", "verified"]
DocumentType = Literal[
    "identity",
    "residence",
    "diploma",
    "health_report",
    "criminal_record",
    "contract",
    "sgk_entry",
    "sgk_exit",
    "training_certificate",
    "other",
]


class ListResult(BaseModel):
    data: list[dict[str, Any]]
    meta: dict[str, int]


class EmployeeListQuery(BaseModel):
    company_id: str | None = None
    branch_id: str | None = None
    organization_unit_id: str | None = None
    position_id: str | None = None
    employment_status: str | None = None
    employment_type: str | None = None
    sgk_status: str | None = None
    gender: str | None = None
    education_level: str | None = None
    record_status: str | None = None
    start_date_from: date | None = None
    start_date_to: date | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50
    sort: str = "updated_at"
    direction: str = "desc"


class EmployeeCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str
    person_id: str | None = None
    employee_no: str | None = Field(default=None, max_length=64)
    first_name: str = Field(min_length=1, max_length=120)
    last_name: str = Field(min_length=1, max_length=120)
    full_name: str | None = Field(default=None, max_length=260)
    identity_number: str | None = Field(default=None, max_length=32)
    passport_no: str | None = Field(default=None, max_length=64)
    nationality: str | None = Field(default="TR", max_length=80)
    birth_date: date | None = None
    gender: Gender | None = None
    marital_status: str | None = Field(default=None, max_length=40)
    education_level: str | None = Field(default=None, max_length=80)
    phone: str | None = Field(default=None, max_length=80)
    email: str | None = Field(default=None, max_length=254)
    address: str | None = None
    city: str | None = Field(default=None, max_length=120)
    district: str | None = Field(default=None, max_length=120)
    country: str | None = Field(default="TR", max_length=80)
    emergency_contact: dict[str, Any] = Field(default_factory=dict)
    photo_url: str | None = None
    notes: str | None = None
    record_status: RecordStatus = "draft"
    metadata_json: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def derive_full_name(self) -> Self:
        if not self.full_name:
            self.full_name = f"{self.first_name} {self.last_name}".strip()
        return self


class EmployeeUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    person_id: str | None = None
    employee_no: str | None = Field(default=None, max_length=64)
    first_name: str | None = Field(default=None, min_length=1, max_length=120)
    last_name: str | None = Field(default=None, min_length=1, max_length=120)
    full_name: str | None = Field(default=None, max_length=260)
    identity_number: str | None = Field(default=None, max_length=32)
    passport_no: str | None = Field(default=None, max_length=64)
    nationality: str | None = Field(default=None, max_length=80)
    birth_date: date | None = None
    gender: Gender | None = None
    marital_status: str | None = Field(default=None, max_length=40)
    education_level: str | None = Field(default=None, max_length=80)
    phone: str | None = Field(default=None, max_length=80)
    email: str | None = Field(default=None, max_length=254)
    address: str | None = None
    city: str | None = Field(default=None, max_length=120)
    district: str | None = Field(default=None, max_length=120)
    country: str | None = Field(default=None, max_length=80)
    emergency_contact: dict[str, Any] | None = None
    photo_url: str | None = None
    notes: str | None = None
    record_status: RecordStatus | None = None
    metadata_json: dict[str, Any] | None = None
    base_version: int | None = None


class EmploymentStartRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str
    branch_id: str | None = None
    organization_unit_id: str | None = None
    position_id: str | None = None
    job_title: str | None = Field(default=None, max_length=160)
    employment_type: EmploymentType
    start_date: date
    trial_period_end_date: date | None = None
    sgk_status: SgkStatus = "pending"
    sgk_workplace_registry_no: str | None = Field(default=None, max_length=80)
    work_location_type: WorkLocationType | None = None
    manager_employee_id: str | None = None
    salary_type: str | None = Field(default=None, max_length=80)
    currency: str | None = Field(default=None, max_length=8)
    notes: str | None = None
    document_files: list[dict[str, Any]] = Field(default_factory=list)


class EmploymentTerminateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    end_date: date
    termination_reason: str = Field(min_length=1, max_length=240)
    sgk_status: SgkStatus = "pending"
    sgk_exit_reference_no: str | None = Field(default=None, max_length=120)
    notes: str | None = None
    document_files: list[dict[str, Any]] = Field(default_factory=list)


class AssignmentChangeRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    effective_date: date
    branch_id: str | None = None
    organization_unit_id: str | None = None
    position_id: str | None = None
    job_title: str | None = Field(default=None, max_length=160)
    reason: str | None = Field(default=None, max_length=240)
    document_files: list[dict[str, Any]] = Field(default_factory=list)


class SgkCompletedRequest(BaseModel):
    completed_date: date
    reference_no: str | None = Field(default=None, max_length=120)
    document_files: list[dict[str, Any]] = Field(default_factory=list)
    notes: str | None = None


class EmployeeDocumentCreateRequest(BaseModel):
    document_type: DocumentType
    file_ref: dict[str, Any]
    issue_date: date | None = None
    expiry_date: date | None = None
    status: DocumentStatus = "uploaded"
    required: bool = False
    notes: str | None = None


class EmployeeDocumentUpdateRequest(BaseModel):
    file_ref: dict[str, Any] | None = None
    issue_date: date | None = None
    expiry_date: date | None = None
    status: DocumentStatus | None = None
    required: bool | None = None
    notes: str | None = None


class EmployeeSummary(BaseModel):
    total_employees: int
    active_employees: int
    draft_employees: int
    terminated_employees: int
    pending_sgk: int
    branch_distribution: dict[str, int] = Field(default_factory=dict)
    gender_distribution: dict[str, int] = Field(default_factory=dict)
    education_distribution: dict[str, int] = Field(default_factory=dict)
    employment_type_distribution: dict[str, int] = Field(default_factory=dict)
