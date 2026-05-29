from __future__ import annotations

# ruff: noqa: E501
from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

WarrantyStatus = Literal["in_warranty", "out_of_warranty", "unknown", "void"]
AssetStatus = Literal["active", "inactive", "decommissioned", "transferred"]
ServiceRequestType = Literal["fault", "maintenance", "installation", "training", "inspection", "warranty", "upgrade", "other"]
ServiceRequestStatus = Literal["new", "triage", "assigned", "scheduled", "in_progress", "waiting_customer", "waiting_parts", "resolved", "closed", "cancelled"]
ServicePriority = Literal["low", "medium", "high", "urgent"]
ServiceSource = Literal["phone", "email", "web", "internal", "customer_portal", "other"]
ServiceType = Literal["installation", "repair", "maintenance", "inspection", "remote_support", "training", "replacement", "other"]
ServiceRecordStatus = Literal["planned", "in_progress", "completed", "cancelled", "failed"]
ServiceResult = Literal["resolved", "unresolved", "follow_up_required", "customer_cancelled", "warranty_rejected"]
MaintenanceType = Literal["periodic", "warranty", "inspection", "calibration", "cleaning", "software_update", "safety_check", "other"]
MaintenanceIntervalType = Literal["days", "weeks", "months", "usage_hours", "custom"]
MaintenanceDueStatus = Literal["scheduled", "due_soon", "overdue", "service_request_created", "completed", "skipped"]
FieldAssignmentStatus = Literal["assigned", "accepted", "rejected", "on_the_way", "arrived", "in_progress", "completed", "cancelled"]


class ListResult(BaseModel):
    data: list[dict[str, Any]]
    meta: dict[str, int]


class InstalledAssetListQuery(BaseModel):
    company_id: str | None = None
    customer_account_id: str | None = None
    product_id: str | None = None
    warranty_status: str | None = None
    status: str | None = None
    serial_no: str | None = None
    maintenance_due_until: date | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50
    sort: str = "updated_at"
    direction: str = "desc"


class ServiceRequestListQuery(BaseModel):
    company_id: str | None = None
    customer_account_id: str | None = None
    installed_asset_id: str | None = None
    product_id: str | None = None
    status: str | None = None
    priority: str | None = None
    assigned_user_id: str | None = None
    assigned_employee_id: str | None = None
    due_from: date | None = None
    due_to: date | None = None
    source: str | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50
    sort: str = "updated_at"
    direction: str = "desc"


class ServiceRecordListQuery(BaseModel):
    company_id: str | None = None
    service_request_id: str | None = None
    installed_asset_id: str | None = None
    product_id: str | None = None
    service_type: str | None = None
    status: str | None = None
    result: str | None = None
    technician_user_id: str | None = None
    technician_employee_id: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50
    sort: str = "service_date"
    direction: str = "desc"


class MaintenancePlanListQuery(BaseModel):
    company_id: str | None = None
    product_id: str | None = None
    installed_asset_id: str | None = None
    active: bool | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50
    sort: str = "updated_at"
    direction: str = "desc"


class MaintenanceDueListQuery(BaseModel):
    company_id: str | None = None
    maintenance_plan_id: str | None = None
    installed_asset_id: str | None = None
    status: str | None = None
    assigned_user_id: str | None = None
    due_from: date | None = None
    due_until: date | None = None
    limit: int = Field(default=100, ge=1, le=500)


class FieldAssignmentListQuery(BaseModel):
    company_id: str | None = None
    service_request_id: str | None = None
    service_record_id: str | None = None
    installed_asset_id: str | None = None
    technician_user_id: str | None = None
    technician_employee_id: str | None = None
    status: str | None = None
    scheduled_from: datetime | None = None
    scheduled_to: datetime | None = None
    mine: bool = False
    page: int = 1
    page_size: int = 50
    sort: str = "scheduled_start"
    direction: str = "asc"


class ChecklistTemplateListQuery(BaseModel):
    company_id: str | None = None
    product_id: str | None = None
    service_type: str | None = None
    active: bool | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50
    sort: str = "updated_at"
    direction: str = "desc"


class InstalledAssetCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    owning_company_id: str
    customer_account_id: str | None = None
    customer_company_id: str | None = None
    customer_name: str = Field(min_length=1, max_length=240)
    product_id: str
    serial_no: str | None = Field(default=None, max_length=160)
    asset_tag: str | None = Field(default=None, max_length=160)
    installation_date: date | None = None
    warranty_start_date: date | None = None
    warranty_end_date: date | None = None
    warranty_status: WarrantyStatus | None = None
    maintenance_required: bool | None = None
    next_maintenance_date: date | None = None
    facility_id: str | None = None
    branch_id: str | None = None
    address: str | None = None
    city: str | None = None
    district: str | None = None
    contact_person: str | None = None
    contact_phone: str | None = None
    status: AssetStatus = "active"
    notes: str | None = None
    document_files: list[dict[str, Any]] = Field(default_factory=list)
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class InstalledAssetUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    customer_account_id: str | None = None
    customer_company_id: str | None = None
    customer_name: str | None = Field(default=None, min_length=1, max_length=240)
    serial_no: str | None = Field(default=None, max_length=160)
    asset_tag: str | None = Field(default=None, max_length=160)
    installation_date: date | None = None
    warranty_start_date: date | None = None
    warranty_end_date: date | None = None
    warranty_status: WarrantyStatus | None = None
    maintenance_required: bool | None = None
    next_maintenance_date: date | None = None
    facility_id: str | None = None
    branch_id: str | None = None
    address: str | None = None
    city: str | None = None
    district: str | None = None
    contact_person: str | None = None
    contact_phone: str | None = None
    status: AssetStatus | None = None
    notes: str | None = None
    document_files: list[dict[str, Any]] | None = None
    metadata_json: dict[str, Any] | None = None
    base_version: int | None = None


class ServiceRequestCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str
    customer_account_id: str | None = None
    customer_name: str = Field(min_length=1, max_length=240)
    installed_asset_id: str | None = None
    product_id: str | None = None
    request_no: str | None = Field(default=None, max_length=80)
    request_type: ServiceRequestType = "fault"
    priority: ServicePriority = "medium"
    status: ServiceRequestStatus = "new"
    subject: str = Field(min_length=1, max_length=300)
    description: str | None = None
    reported_at: datetime | None = None
    requested_date: date | None = None
    due_date: date | None = None
    contact_person: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    location: str | None = None
    assigned_user_id: str | None = None
    assigned_employee_id: str | None = None
    schedule_date: datetime | None = None
    warranty_check_result: WarrantyStatus | None = None
    estimated_duration_minutes: int | None = Field(default=None, ge=0)
    required_skills: list[str] = Field(default_factory=list)
    suggested_technician_user_id: str | None = None
    suggested_technician_employee_id: str | None = None
    required_parts_preview: list[dict[str, Any]] = Field(default_factory=list)
    customer_availability: str | None = None
    project_task_id: str | None = None
    create_project_task: bool = False
    source: ServiceSource | None = None
    document_files: list[dict[str, Any]] = Field(default_factory=list)
    notes: str | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class ServiceRequestUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    customer_account_id: str | None = None
    customer_name: str | None = Field(default=None, min_length=1, max_length=240)
    installed_asset_id: str | None = None
    product_id: str | None = None
    request_type: ServiceRequestType | None = None
    priority: ServicePriority | None = None
    status: ServiceRequestStatus | None = None
    subject: str | None = Field(default=None, min_length=1, max_length=300)
    description: str | None = None
    requested_date: date | None = None
    due_date: date | None = None
    contact_person: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    location: str | None = None
    assigned_user_id: str | None = None
    assigned_employee_id: str | None = None
    schedule_date: datetime | None = None
    warranty_check_result: WarrantyStatus | None = None
    estimated_duration_minutes: int | None = Field(default=None, ge=0)
    required_skills: list[str] | None = None
    suggested_technician_user_id: str | None = None
    suggested_technician_employee_id: str | None = None
    required_parts_preview: list[dict[str, Any]] | None = None
    customer_availability: str | None = None
    project_task_id: str | None = None
    source: ServiceSource | None = None
    document_files: list[dict[str, Any]] | None = None
    notes: str | None = None
    metadata_json: dict[str, Any] | None = None
    base_version: int | None = None


class ServiceRequestAssignRequest(BaseModel):
    assigned_user_id: str | None = None
    assigned_employee_id: str | None = None
    create_project_task: bool = False
    notes: str | None = None


class ServiceRequestAssignTechnicianRequest(BaseModel):
    technician_user_id: str | None = None
    technician_employee_id: str | None = None
    scheduled_start: datetime | None = None
    scheduled_end: datetime | None = None
    create_project_task: bool = True
    notes: str | None = None


class ServiceRequestCloseRequest(BaseModel):
    status: Literal["resolved", "closed", "cancelled"] = "closed"
    notes: str | None = None


class ServiceRecordCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str
    service_request_id: str | None = None
    installed_asset_id: str | None = None
    product_id: str | None = None
    service_no: str | None = Field(default=None, max_length=80)
    service_type: ServiceType = "repair"
    service_date: date
    technician_user_id: str | None = None
    technician_employee_id: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    duration_minutes: int | None = Field(default=None, ge=0)
    status: ServiceRecordStatus = "planned"
    fault_description: str | None = None
    work_performed: str | None = None
    parts_used: list[dict[str, Any]] = Field(default_factory=list)
    result: ServiceResult | None = None
    warranty_covered: bool | None = None
    customer_signature_file: dict[str, Any] | None = None
    service_report_file: dict[str, Any] | None = None
    photos: list[dict[str, Any]] = Field(default_factory=list)
    next_action: str | None = None
    next_service_date: date | None = None
    notes: str | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class ServiceRecordUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    service_request_id: str | None = None
    installed_asset_id: str | None = None
    product_id: str | None = None
    service_type: ServiceType | None = None
    service_date: date | None = None
    technician_user_id: str | None = None
    technician_employee_id: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    duration_minutes: int | None = Field(default=None, ge=0)
    status: ServiceRecordStatus | None = None
    fault_description: str | None = None
    work_performed: str | None = None
    parts_used: list[dict[str, Any]] | None = None
    result: ServiceResult | None = None
    warranty_covered: bool | None = None
    customer_signature_file: dict[str, Any] | None = None
    service_report_file: dict[str, Any] | None = None
    photos: list[dict[str, Any]] | None = None
    next_action: str | None = None
    next_service_date: date | None = None
    notes: str | None = None
    metadata_json: dict[str, Any] | None = None
    base_version: int | None = None


class ServiceRecordCompleteRequest(BaseModel):
    result: ServiceResult = "resolved"
    work_performed: str | None = None
    warranty_covered: bool | None = None
    end_time: datetime | None = None
    duration_minutes: int | None = Field(default=None, ge=0)
    next_action: str | None = None
    next_service_date: date | None = None
    create_followup_task: bool = False
    followup_assignee_user_id: str | None = None
    followup_assignee_employee_id: str | None = None
    notes: str | None = None


class MaintenancePlanCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str | None = None
    product_id: str | None = None
    installed_asset_id: str | None = None
    plan_name: str = Field(min_length=1, max_length=240)
    maintenance_type: MaintenanceType = "periodic"
    interval_type: MaintenanceIntervalType = "days"
    interval_value: int = Field(default=30, ge=1)
    checklist_template_id: str | None = None
    active: bool = True
    next_run_date: date | None = None
    last_run_date: date | None = None
    assigned_team_id: str | None = None
    default_priority: ServicePriority = "medium"
    notes: str | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class MaintenancePlanUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str | None = None
    product_id: str | None = None
    installed_asset_id: str | None = None
    plan_name: str | None = Field(default=None, min_length=1, max_length=240)
    maintenance_type: MaintenanceType | None = None
    interval_type: MaintenanceIntervalType | None = None
    interval_value: int | None = Field(default=None, ge=1)
    checklist_template_id: str | None = None
    active: bool | None = None
    next_run_date: date | None = None
    last_run_date: date | None = None
    assigned_team_id: str | None = None
    default_priority: ServicePriority | None = None
    notes: str | None = None
    metadata_json: dict[str, Any] | None = None
    base_version: int | None = None


class MaintenanceDueCreateServiceRequest(BaseModel):
    assigned_user_id: str | None = None
    assigned_employee_id: str | None = None
    create_project_task: bool = True
    notes: str | None = None


class MaintenanceDueSkipRequest(BaseModel):
    notes: str | None = None


class FieldAssignmentRejectRequest(BaseModel):
    rejection_reason: str = Field(min_length=1, max_length=1000)


class FieldAssignmentStatusRequest(BaseModel):
    status: FieldAssignmentStatus
    service_record_id: str | None = None
    notes: str | None = None


class ChecklistTemplateCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    company_id: str | None = None
    product_id: str | None = None
    service_type: ServiceType | str = "maintenance"
    checklist_name: str = Field(min_length=1, max_length=240)
    items: list[dict[str, Any]] = Field(default_factory=list)
    active: bool = True
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class ServiceChecklistPatchRequest(BaseModel):
    checklist_template_id: str
    results: dict[str, Any] = Field(default_factory=dict)
    completed: bool = False


class ServiceRecordStartRequest(BaseModel):
    start_time: datetime | None = None
    notes: str | None = None


class ServiceRecordPhotosRequest(BaseModel):
    photos: list[dict[str, Any]] = Field(default_factory=list)


class AfterSalesSummary(BaseModel):
    installed_assets: int = 0
    open_service_requests: int = 0
    overdue_service_requests: int = 0
    maintenance_due: int = 0
    completed_services: int = 0
    assigned_field_jobs: int = 0
    overdue_field_jobs: int = 0
    completed_services_this_month: int = 0
    follow_up_required_count: int = 0
    by_request_status: dict[str, int] = Field(default_factory=dict)
