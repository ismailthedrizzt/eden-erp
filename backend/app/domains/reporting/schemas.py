from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

KpiStatus = Literal["normal", "warning", "critical", "info"]
ChartType = Literal["bar", "stacked_bar", "donut", "line", "table"]


class ReportingFilter(BaseModel):
    company_id: str | None = None
    branch_id: str | None = None
    module_key: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    only_mine: bool = False
    status: str | None = None
    group_by: str | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)


class KpiCard(BaseModel):
    key: str
    title: str
    value: int | float | str | None
    unit: str | None = None
    status: KpiStatus = "info"
    description: str = ""
    target_page: str | None = None
    module_key: str
    visible: bool = True
    warnings: list[str] = Field(default_factory=list)


class ChartDataset(BaseModel):
    key: str
    title: str
    chart_type: ChartType
    labels: list[str] = Field(default_factory=list)
    series: list[dict[str, Any]] = Field(default_factory=list)
    data: list[dict[str, Any]] = Field(default_factory=list)
    target_page: str | None = None


class DashboardResponse(BaseModel):
    filters: ReportingFilter
    cards: list[KpiCard]
    charts: list[ChartDataset]
    warnings: list[str] = Field(default_factory=list)
    generated_at: datetime
    permissions_summary: dict[str, bool] = Field(default_factory=dict)


class ReportDefinition(BaseModel):
    report_key: str
    title: str
    description: str
    module_key: str
    required_permission: str
    filters: list[str] = Field(default_factory=list)
    columns: list[dict[str, str]]
    default_sort: str | None = None
    export_enabled: bool = False


class ReportResult(BaseModel):
    data: list[dict[str, Any]]
    meta: dict[str, int]
    columns: list[dict[str, str]]
    summary: dict[str, Any] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)


class ExportRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    format: Literal["csv", "xlsx", "pdf"] = "csv"
    filters: ReportingFilter = Field(default_factory=ReportingFilter)
    saved_view_id: str | None = None
    columns: list[str] = Field(default_factory=list)


class ListResult(BaseModel):
    data: list[dict[str, Any]]
    meta: dict[str, int]


class SavedViewListQuery(BaseModel):
    module_key: str | None = None
    entity_type: str | None = None
    report_key: str | None = None
    visibility: str | None = None
    include_shared: bool = True
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)


class SavedViewCreateRequest(BaseModel):
    module_key: str
    entity_type: str | None = None
    report_key: str | None = None
    view_name: str
    description: str | None = None
    visibility: Literal[
        "private",
        "shared_with_role",
        "shared_with_users",
        "tenant_shared",
    ] = "private"
    filters_json: dict[str, Any] = Field(default_factory=dict)
    columns_json: list[dict[str, Any]] = Field(default_factory=list)
    sort_json: dict[str, Any] = Field(default_factory=dict)
    group_by_json: list[str] = Field(default_factory=list)
    chart_config_json: dict[str, Any] = Field(default_factory=dict)
    default_view: bool = False
    pinned: bool = False
    shared_role_ids: list[str] = Field(default_factory=list)
    shared_user_ids: list[str] = Field(default_factory=list)


class SavedViewUpdateRequest(BaseModel):
    view_name: str | None = None
    description: str | None = None
    visibility: (
        Literal["private", "shared_with_role", "shared_with_users", "tenant_shared"] | None
    ) = None
    filters_json: dict[str, Any] | None = None
    columns_json: list[dict[str, Any]] | None = None
    sort_json: dict[str, Any] | None = None
    group_by_json: list[str] | None = None
    chart_config_json: dict[str, Any] | None = None
    default_view: bool | None = None
    pinned: bool | None = None
    shared_role_ids: list[str] | None = None
    shared_user_ids: list[str] | None = None
    base_version: int | None = None


class SavedViewPinRequest(BaseModel):
    pinned: bool = True


class CustomReportListQuery(BaseModel):
    module_key: str | None = None
    source_type: str | None = None
    active: bool | None = None
    mine: bool = False
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)


class CustomReportCreateRequest(BaseModel):
    report_key: str
    report_name: str
    description: str | None = None
    module_key: str
    report_type: Literal["table", "summary", "chart", "hybrid"] = "table"
    source_type: Literal["predefined_projection", "predefined_report", "saved_view"]
    source_key: str
    allowed_filters_json: dict[str, Any] = Field(default_factory=dict)
    default_filters_json: dict[str, Any] = Field(default_factory=dict)
    columns_json: list[dict[str, Any]] = Field(default_factory=list)
    default_sort_json: dict[str, Any] = Field(default_factory=dict)
    chart_config_json: dict[str, Any] = Field(default_factory=dict)
    required_permissions: list[str] = Field(default_factory=list)
    export_enabled: bool = False
    schedule_enabled: bool = False
    active: bool = True


class CustomReportUpdateRequest(BaseModel):
    report_name: str | None = None
    description: str | None = None
    report_type: Literal["table", "summary", "chart", "hybrid"] | None = None
    source_type: Literal["predefined_projection", "predefined_report", "saved_view"] | None = None
    source_key: str | None = None
    allowed_filters_json: dict[str, Any] | None = None
    default_filters_json: dict[str, Any] | None = None
    columns_json: list[dict[str, Any]] | None = None
    default_sort_json: dict[str, Any] | None = None
    chart_config_json: dict[str, Any] | None = None
    required_permissions: list[str] | None = None
    export_enabled: bool | None = None
    schedule_enabled: bool | None = None
    active: bool | None = None
    base_version: int | None = None


class ScheduledReportListQuery(BaseModel):
    status: str | None = None
    report_key: str | None = None
    owner_user_id: str | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)


class ScheduledReportCreateRequest(BaseModel):
    report_key: str
    saved_view_id: str | None = None
    schedule_name: str
    description: str | None = None
    recipients_json: list[dict[str, Any]] = Field(default_factory=list)
    schedule_rule: Literal["daily", "weekly", "monthly"] = "weekly"
    timezone: str = "Europe/Istanbul"
    next_run_at: datetime | None = None
    export_format: Literal["csv", "xlsx", "pdf"] = "csv"
    email_enabled: bool = True
    email_subject_template: str | None = None
    email_body_template: str | None = None


class ScheduledReportUpdateRequest(BaseModel):
    schedule_name: str | None = None
    description: str | None = None
    saved_view_id: str | None = None
    recipients_json: list[dict[str, Any]] | None = None
    schedule_rule: Literal["daily", "weekly", "monthly"] | None = None
    timezone: str | None = None
    next_run_at: datetime | None = None
    status: Literal["active", "paused", "failed", "disabled"] | None = None
    export_format: Literal["csv", "xlsx", "pdf"] | None = None
    email_enabled: bool | None = None
    email_subject_template: str | None = None
    email_body_template: str | None = None
    base_version: int | None = None


class ExportJobListQuery(BaseModel):
    status: str | None = None
    report_key: str | None = None
    requested_by: str | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)


class DashboardPreferencesRequest(BaseModel):
    layout_json: list[dict[str, Any]] = Field(default_factory=list)
    hidden_widgets: list[str] = Field(default_factory=list)
    pinned_reports: list[str] = Field(default_factory=list)
    default_filters: dict[str, Any] = Field(default_factory=dict)
