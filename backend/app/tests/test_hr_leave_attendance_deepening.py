from __future__ import annotations

from datetime import date

from app.domains.hr.attendance import calculate_hour_deltas
from app.domains.hr.leave_balances import calculate_remaining_days
from app.domains.hr.leave_types import DEFAULT_LEAVE_TYPES
from app.domains.hr.payroll_prep import PAYROLL_PREP_NOTICE
from app.domains.hr.timesheets import count_workdays
from app.policies.permissions import permission_exists, resolve_permission_with_fallback
from app.setup.readiness_registry import get_readiness_definition


def test_default_leave_type_seed_contract() -> None:
    keys = {item["leave_type_key"] for item in DEFAULT_LEAVE_TYPES}

    assert {
        "annual",
        "sick",
        "unpaid",
        "paid_excuse",
        "marriage",
        "bereavement",
        "maternity",
        "paternity",
        "administrative",
        "other",
    }.issubset(keys)
    assert (
        next(item for item in DEFAULT_LEAVE_TYPES if item["leave_type_key"] == "annual")[
            "requires_approval"
        ]
        is True
    )


def test_leave_balance_remaining_calculation_counts_pending_days() -> None:
    assert calculate_remaining_days(14, 2, 1, 5, 3) == 9


def test_attendance_overtime_and_missing_hours_are_derived() -> None:
    assert calculate_hour_deltas(7.5, 9) == (1.5, 0)
    assert calculate_hour_deltas(8, 6.25) == (0, 1.75)


def test_timesheet_workday_counter_excludes_weekends() -> None:
    assert count_workdays(date(2026, 5, 1), date(2026, 5, 7)) == 5.0


def test_hr_deepening_permissions_are_registered() -> None:
    assert permission_exists("hr.leaveView")
    assert permission_exists("hr.timesheetApprove")
    assert "hr.timesheetManage" in resolve_permission_with_fallback("hr.timesheetApprove")
    assert "hr.timesheetView" in resolve_permission_with_fallback("hr.payrollPrepView")


def test_hr_readiness_contract_includes_leave_attendance_tables() -> None:
    definition = get_readiness_definition("hr")
    assert definition is not None
    assert "hr_leave_types" in definition.optional_tables
    assert "hr_attendance_records" in definition.optional_tables
    assert "hr_timesheet_periods" in definition.optional_tables
    assert "hr_payroll_preparation_rows" in definition.optional_tables


def test_payroll_prep_notice_keeps_no_amount_boundary() -> None:
    assert "bordro hesaplamasi yapmaz" in PAYROLL_PREP_NOTICE
    assert "puantaj verisini hazirlar" in PAYROLL_PREP_NOTICE
