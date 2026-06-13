from __future__ import annotations

from datetime import date, datetime
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
    model_config = ConfigDict(extra="forbid")

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
    base_updated_at: str | None = None

    @model_validator(mode="after")
    def derive_full_name(self) -> Self:
        if not self.full_name:
            self.full_name = f"{self.first_name} {self.last_name}".strip()
        return self


class EmployeeUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

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
    model_config = ConfigDict(extra="forbid")

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
    client_request_id: str | None = None
    base_version: int | None = None
    base_updated_at: str | None = None


class EmploymentTerminateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    end_date: date
    termination_reason: str = Field(min_length=1, max_length=240)
    sgk_status: SgkStatus = "pending"
    sgk_exit_reference_no: str | None = Field(default=None, max_length=120)
    notes: str | None = None
    document_files: list[dict[str, Any]] = Field(default_factory=list)
    client_request_id: str | None = None
    base_version: int | None = None
    base_updated_at: str | None = None


class AssignmentChangeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    effective_date: date
    branch_id: str | None = None
    organization_unit_id: str | None = None
    position_id: str | None = None
    job_title: str | None = Field(default=None, max_length=160)
    reason: str | None = Field(default=None, max_length=240)
    document_files: list[dict[str, Any]] = Field(default_factory=list)
    client_request_id: str | None = None
    base_version: int | None = None
    base_updated_at: str | None = None


class SgkCompletedRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    completed_date: date
    reference_no: str | None = Field(default=None, max_length=120)
    document_files: list[dict[str, Any]] = Field(default_factory=list)
    notes: str | None = None
    client_request_id: str | None = None
    base_version: int | None = None
    base_updated_at: str | None = None


class EmployeeDocumentCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    document_type: DocumentType
    file_ref: dict[str, Any]
    issue_date: date | None = None
    expiry_date: date | None = None
    status: DocumentStatus = "uploaded"
    required: bool = False
    notes: str | None = None
    client_request_id: str | None = None
    base_version: int | None = None
    base_updated_at: str | None = None


class EmployeeDocumentUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

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


class EmployeeRecordResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    tenant_id: str | None = None
    company_id: str | None = None
    employee_no: str | None = None
    full_name: str | None = None
    employment_status: str | None = None
    sgk_status: str | None = None
    record_status: str | None = None
    warnings: list[str] = Field(default_factory=list)


class EmployeeListResponse(BaseModel):
    data: list[EmployeeRecordResponse]
    meta: dict[str, int]


class EmployeeDocumentResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    employee_id: str | None = None
    document_type: str | None = None
    status: str | None = None
    file_ref: dict[str, Any] | None = None


LeaveCategory = Literal[
    "annual",
    "sick",
    "unpaid",
    "paid_excuse",
    "maternity",
    "paternity",
    "marriage",
    "bereavement",
    "administrative",
    "other",
]
LeaveRequestStatus = Literal[
    "draft",
    "submitted",
    "pending_approval",
    "approved",
    "rejected",
    "cancelled",
]
AttendanceStatus = Literal[
    "present",
    "absent",
    "leave",
    "sick_leave",
    "holiday",
    "weekend",
    "remote",
    "field",
    "late",
    "early_leave",
    "overtime",
]
AttendanceSource = Literal["manual", "import", "device", "mobile", "system"]
TimesheetStatus = Literal[
    "draft", "calculating", "ready_for_review", "approved", "locked", "cancelled"
]
TimesheetRowStatus = Literal["draft", "reviewed", "approved", "locked"]
PayrollPrepStatus = Literal["not_ready", "ready", "locked", "exported"]


class LeaveTypeListQuery(BaseModel):
    company_id: str | None = None
    category: str | None = None
    active: bool | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50
    sort: str = "leave_type_name"
    direction: str = "asc"


class LeaveTypeCreateRequest(BaseModel):
    company_id: str | None = None
    leave_type_key: str = Field(min_length=1, max_length=80)
    leave_type_name: str = Field(min_length=1, max_length=160)
    category: LeaveCategory = "other"
    paid: bool = True
    requires_document: bool = False
    requires_approval: bool = True
    affects_payroll: bool = True
    affects_attendance: bool = True
    default_days_per_year: float = Field(default=0, ge=0)
    carry_over_allowed: bool = False
    max_carry_over_days: float = Field(default=0, ge=0)
    negative_balance_allowed: bool = False
    active: bool = True
    notes: str | None = None


class LeaveTypeUpdateRequest(BaseModel):
    company_id: str | None = None
    leave_type_key: str | None = Field(default=None, min_length=1, max_length=80)
    leave_type_name: str | None = Field(default=None, min_length=1, max_length=160)
    category: LeaveCategory | None = None
    paid: bool | None = None
    requires_document: bool | None = None
    requires_approval: bool | None = None
    affects_payroll: bool | None = None
    affects_attendance: bool | None = None
    default_days_per_year: float | None = Field(default=None, ge=0)
    carry_over_allowed: bool | None = None
    max_carry_over_days: float | None = Field(default=None, ge=0)
    negative_balance_allowed: bool | None = None
    active: bool | None = None
    notes: str | None = None
    base_version: int | None = None


class LeaveBalanceAdjustRequest(BaseModel):
    entitled_days: float | None = None
    carried_over_days: float | None = None
    adjusted_days: float | None = None
    adjustment_reason: str | None = None
    status: str | None = None
    metadata_json: dict[str, Any] | None = None
    base_version: int | None = None


class LeaveRequestListQuery(BaseModel):
    company_id: str | None = None
    employee_id: str | None = None
    leave_type_id: str | None = None
    status: str | None = None
    approver_id: str | None = None
    mine: bool = False
    pending_approval: bool = False
    date_from: date | None = None
    date_to: date | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50
    sort: str = "created_at"
    direction: str = "desc"


class LeaveRequestCreateRequest(BaseModel):
    employee_id: str
    leave_type_id: str
    start_date: date
    end_date: date
    start_half_day: bool | None = None
    end_half_day: bool | None = None
    total_days: float | None = Field(default=None, gt=0)
    reason: str | None = None
    status: LeaveRequestStatus = "draft"
    approver_id: str | None = None
    document_id: str | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> Self:
        if self.start_date > self.end_date:
            raise ValueError("start_date end_date oncesinde veya ayni gun olmalidir")
        if self.total_days is None:
            days = float((self.end_date - self.start_date).days + 1)
            if self.start_half_day:
                days -= 0.5
            if self.end_half_day:
                days -= 0.5
            self.total_days = max(0.5, days)
        return self


class LeaveRequestUpdateRequest(BaseModel):
    leave_type_id: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    start_half_day: bool | None = None
    end_half_day: bool | None = None
    total_days: float | None = Field(default=None, gt=0)
    reason: str | None = None
    approver_id: str | None = None
    document_id: str | None = None
    notes: str | None = None
    base_version: int | None = None


class LeaveRejectRequest(BaseModel):
    rejection_reason: str = Field(min_length=1)


class LeaveCancelRequest(BaseModel):
    notes: str | None = None


class AttendanceListQuery(BaseModel):
    company_id: str | None = None
    employee_id: str | None = None
    status: str | None = None
    source: str | None = None
    approved: bool | None = None
    date_from: date | None = None
    date_to: date | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50
    sort: str = "work_date"
    direction: str = "desc"


class AttendanceCreateRequest(BaseModel):
    employee_id: str
    work_date: date
    status: AttendanceStatus = "present"
    check_in_time: datetime | None = None
    check_out_time: datetime | None = None
    planned_hours: float = Field(default=0, ge=0)
    actual_hours: float = Field(default=0, ge=0)
    overtime_hours: float | None = None
    missing_hours: float | None = None
    source: AttendanceSource = "manual"
    related_leave_request_id: str | None = None
    related_shift_id: str | None = None
    notes: str | None = None
    approved: bool = False


class AttendanceUpdateRequest(BaseModel):
    status: AttendanceStatus | None = None
    check_in_time: datetime | None = None
    check_out_time: datetime | None = None
    planned_hours: float | None = Field(default=None, ge=0)
    actual_hours: float | None = Field(default=None, ge=0)
    overtime_hours: float | None = None
    missing_hours: float | None = None
    source: AttendanceSource | None = None
    related_leave_request_id: str | None = None
    related_shift_id: str | None = None
    notes: str | None = None
    approved: bool | None = None
    approved_by: str | None = None
    base_version: int | None = None


class AttendanceImportRequest(BaseModel):
    records: list[AttendanceCreateRequest] = Field(default_factory=list)


class WorkScheduleListQuery(BaseModel):
    company_id: str | None = None
    active: bool | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50
    sort: str = "schedule_name"
    direction: str = "asc"


class WorkScheduleCreateRequest(BaseModel):
    company_id: str
    schedule_name: str = Field(min_length=1, max_length=160)
    weekly_pattern: dict[str, Any] = Field(default_factory=dict)
    daily_hours: float = Field(default=7.5, ge=0)
    active: bool = True
    notes: str | None = None


class WorkScheduleUpdateRequest(BaseModel):
    company_id: str | None = None
    schedule_name: str | None = Field(default=None, min_length=1, max_length=160)
    weekly_pattern: dict[str, Any] | None = None
    daily_hours: float | None = Field(default=None, ge=0)
    active: bool | None = None
    notes: str | None = None
    base_version: int | None = None


class WorkScheduleAssignmentRequest(BaseModel):
    work_schedule_id: str
    effective_date: date
    end_date: date | None = None


class TimesheetListQuery(BaseModel):
    company_id: str | None = None
    status: str | None = None
    period_from: date | None = None
    period_to: date | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50
    sort: str = "period_start"
    direction: str = "desc"


class TimesheetCreateRequest(BaseModel):
    company_id: str
    period_key: str = Field(min_length=1, max_length=80)
    period_start: date
    period_end: date

    @model_validator(mode="after")
    def validate_period(self) -> Self:
        if self.period_start > self.period_end:
            raise ValueError("period_start period_end oncesinde veya ayni gun olmalidir")
        return self


class PayrollPrepListQuery(BaseModel):
    company_id: str | None = None
    period_id: str | None = None
    employee_id: str | None = None
    payroll_status: str | None = None
    page: int = 1
    page_size: int = 50
    sort: str = "updated_at"
    direction: str = "desc"
