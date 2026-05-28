# ruff: noqa: E501

from app.domains.reporting.reports import REPORT_DEFINITIONS, to_definition
from app.domains.reporting.schemas import KpiCard, ReportingFilter
from app.domains.reporting.service import card, meta, status_from_count
from app.policies.permissions import PERMISSIONS
from app.setup.readiness_registry import get_readiness_definition


def test_reporting_permissions_and_readiness_are_registered() -> None:
    assert "reporting.dashboardView" in PERMISSIONS
    assert "reporting.viewFinancial" in PERMISSIONS
    definition = get_readiness_definition("reporting")

    assert definition is not None
    assert "companies" in definition.required_dependencies


def test_reporting_filter_defaults_are_safe() -> None:
    filters = ReportingFilter()

    assert filters.page == 1
    assert filters.page_size == 50
    assert filters.only_mine is False


def test_kpi_card_permission_hides_value() -> None:
    result = card(
        key="accounting.test",
        title="Finansal KPI",
        value=100,
        module_key="accounting",
        permission_visible=False,
        description="Sensitive",
    )

    assert isinstance(result, KpiCard)
    assert result.visible is False
    assert result.value is None
    assert "yetkiniz" in result.description


def test_report_definitions_cover_requested_modules() -> None:
    modules = {item["module_key"] for item in REPORT_DEFINITIONS.values()}

    assert {"companies", "partners", "representatives", "branches", "accounting", "hr", "project_management", "after_sales", "crm", "audit"}.issubset(modules)
    assert to_definition("stakeholder_report", REPORT_DEFINITIONS["stakeholder_report"]).export_enabled is True


def test_reporting_helpers() -> None:
    assert status_from_count(0) == "normal"
    assert status_from_count(1) == "warning"
    assert status_from_count(5, critical_at=5) == "critical"
    assert meta(2, 25, 70)["totalPages"] == 3
