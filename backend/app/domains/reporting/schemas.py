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

    format: Literal["csv"] = "csv"
    filters: ReportingFilter = Field(default_factory=ReportingFilter)
