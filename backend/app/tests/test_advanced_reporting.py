from __future__ import annotations

from datetime import UTC, datetime

from app.domains.reporting.report_registry import (
    ADVANCED_REPORT_KEYS,
    advanced_report_catalog,
    report_source_allowed,
)
from app.domains.reporting.reports import REPORT_DEFINITIONS
from app.domains.reporting.schemas import (
    CustomReportCreateRequest,
    DashboardPreferencesRequest,
    ExportRequest,
    SavedViewCreateRequest,
    ScheduledReportCreateRequest,
)
from app.domains.reporting.service import max_export_rows, next_run_for_rule
from app.policies.permissions import PERMISSIONS
from app.setup.readiness_registry import get_readiness_definition


def test_advanced_report_sources_are_registered() -> None:
    for key in ADVANCED_REPORT_KEYS:
        assert key in REPORT_DEFINITIONS
        assert report_source_allowed(key)

    catalog = advanced_report_catalog()
    assert {item["report_key"] for item in catalog} == set(ADVANCED_REPORT_KEYS)


def test_advanced_reporting_schemas_normalize_defaults() -> None:
    view = SavedViewCreateRequest(module_key="accounting", view_name="Belge Takip")
    assert view.visibility == "private"
    assert view.filters_json == {}
    assert view.columns_json == []

    custom = CustomReportCreateRequest(
        report_key="custom_operations_risk",
        report_name="Operations Risk",
        module_key="reporting",
        source_type="predefined_report",
        source_key="operations_risk_report",
    )
    assert custom.report_type == "table"
    assert custom.export_enabled is False

    schedule = ScheduledReportCreateRequest(
        report_key="operations_risk_report",
        schedule_name="Weekly Risk",
    )
    assert schedule.schedule_rule == "weekly"
    assert schedule.timezone == "Europe/Istanbul"

    export = ExportRequest(saved_view_id="view-id", columns=["company_id"])
    assert export.format == "csv"
    assert export.columns == ["company_id"]

    preferences = DashboardPreferencesRequest(hidden_widgets=["hr.sensitive"])
    assert preferences.layout_json == []
    assert preferences.hidden_widgets == ["hr.sensitive"]


def test_advanced_reporting_permissions_and_readiness() -> None:
    for permission in [
        "reporting.savedViewsManage",
        "reporting.customReportsManage",
        "reporting.scheduledReportsManage",
        "reporting.exportManage",
        "reporting.dashboardCustomize",
    ]:
        assert permission in PERMISSIONS

    definition = get_readiness_definition("reporting")
    assert definition is not None
    assert "reporting_saved_views" in definition.required_tables
    assert "reporting_scheduled_reports" in definition.required_tables
    assert "reporting_export_jobs" in definition.required_tables


def test_reporting_schedule_and_export_limits() -> None:
    base = datetime(2026, 5, 29, 9, 0, tzinfo=UTC)

    assert next_run_for_rule("daily", base).day == 30
    assert next_run_for_rule("weekly", base).day == 5
    assert next_run_for_rule("monthly", base).day == 28
    assert max_export_rows() == 5000

