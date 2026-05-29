"""hr leave attendance payroll preparation deepening

Revision ID: 20260529_2355
Revises: 20260529_2350
Create Date: 2026-05-29
"""

# ruff: noqa: E501

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260529_2355"
down_revision: str | None = "20260529_2350"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def uuid_pk() -> sa.Column:
    return sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))


def uuid_column(name: str, *, nullable: bool = True) -> sa.Column:
    return sa.Column(name, postgresql.UUID(as_uuid=True), nullable=nullable)


def jsonb_column(name: str, default: str) -> sa.Column:
    return sa.Column(name, postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text(default))


def timestamp_column(name: str) -> sa.Column:
    return sa.Column(name, sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"))


def versioned_columns(*, deleted: bool = True) -> list[sa.Column]:
    columns = [
        uuid_column("created_by"),
        uuid_column("updated_by"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
    ]
    if deleted:
        columns.append(sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    return columns


def day_column(name: str, *, nullable: bool = False, default: str = "0") -> sa.Column:
    return sa.Column(name, sa.Numeric(10, 2), nullable=nullable, server_default=sa.text(default) if not nullable else None)


def upgrade() -> None:
    op.execute('create extension if not exists "pgcrypto"')
    op.create_table(
        "hr_leave_types",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id"),
        sa.Column("leave_type_key", sa.Text(), nullable=False),
        sa.Column("leave_type_name", sa.Text(), nullable=False),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("paid", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("requires_document", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("requires_approval", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("affects_payroll", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("affects_attendance", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        day_column("default_days_per_year", default="0"),
        sa.Column("carry_over_allowed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        day_column("max_carry_over_days", default="0"),
        sa.Column("negative_balance_allowed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("notes", sa.Text(), nullable=True),
        *versioned_columns(),
    )
    op.create_table(
        "hr_leave_balances",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id", nullable=False),
        uuid_column("employee_id", nullable=False),
        uuid_column("leave_type_id", nullable=False),
        sa.Column("period_year", sa.Integer(), nullable=False),
        day_column("entitled_days"),
        day_column("carried_over_days"),
        day_column("used_days"),
        day_column("pending_days"),
        day_column("remaining_days"),
        day_column("adjusted_days"),
        sa.Column("adjustment_reason", sa.Text(), nullable=True),
        sa.Column("last_calculated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="active"),
        jsonb_column("metadata_json", "'{}'::jsonb"),
        *versioned_columns(),
    )
    op.create_table(
        "hr_leave_requests",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id", nullable=False),
        uuid_column("employee_id", nullable=False),
        uuid_column("leave_type_id", nullable=False),
        sa.Column("request_no", sa.Text(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("start_half_day", sa.Boolean(), nullable=True),
        sa.Column("end_half_day", sa.Boolean(), nullable=True),
        day_column("total_days"),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="draft"),
        uuid_column("requested_by"),
        uuid_column("approver_id"),
        uuid_column("approved_by"),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        uuid_column("rejected_by"),
        sa.Column("rejected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("document_required", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        uuid_column("document_id"),
        uuid_column("process_instance_id"),
        sa.Column("notes", sa.Text(), nullable=True),
        jsonb_column("metadata_json", "'{}'::jsonb"),
        *versioned_columns(),
    )
    op.create_table(
        "hr_attendance_records",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id", nullable=False),
        uuid_column("employee_id", nullable=False),
        sa.Column("work_date", sa.Date(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("check_in_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("check_out_time", sa.DateTime(timezone=True), nullable=True),
        day_column("planned_hours"),
        day_column("actual_hours"),
        day_column("overtime_hours"),
        day_column("missing_hours"),
        sa.Column("source", sa.Text(), nullable=False, server_default="manual"),
        uuid_column("related_leave_request_id"),
        uuid_column("related_shift_id"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("approved", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        uuid_column("approved_by"),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        jsonb_column("metadata_json", "'{}'::jsonb"),
        *versioned_columns(),
    )
    op.create_table(
        "hr_work_schedules",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id", nullable=False),
        sa.Column("schedule_name", sa.Text(), nullable=False),
        jsonb_column("weekly_pattern", "'{}'::jsonb"),
        day_column("daily_hours", default="7.5"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("notes", sa.Text(), nullable=True),
        *versioned_columns(),
    )
    op.create_table(
        "hr_shifts",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id", nullable=False),
        sa.Column("shift_name", sa.Text(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("break_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("overnight", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        *versioned_columns(),
    )
    op.create_table(
        "hr_employee_work_schedules",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("employee_id", nullable=False),
        uuid_column("work_schedule_id", nullable=False),
        sa.Column("effective_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        jsonb_column("metadata_json", "'{}'::jsonb"),
        *versioned_columns(),
    )
    op.create_table(
        "hr_timesheet_periods",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id", nullable=False),
        sa.Column("period_key", sa.Text(), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="draft"),
        sa.Column("employee_count", sa.Integer(), nullable=False, server_default="0"),
        day_column("total_work_days"),
        day_column("total_leave_days"),
        day_column("total_absent_days"),
        day_column("total_overtime_hours"),
        uuid_column("approved_by"),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        jsonb_column("metadata_json", "'{}'::jsonb"),
        *versioned_columns(),
    )
    op.create_table(
        "hr_timesheet_rows",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("period_id", nullable=False),
        uuid_column("employee_id", nullable=False),
        day_column("planned_days"),
        day_column("worked_days"),
        day_column("leave_days"),
        day_column("unpaid_leave_days"),
        day_column("sick_leave_days"),
        day_column("absent_days"),
        day_column("overtime_hours"),
        day_column("missing_hours"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="draft"),
        jsonb_column("metadata_json", "'{}'::jsonb"),
        *versioned_columns(),
    )
    op.create_table(
        "hr_payroll_preparation_rows",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id", nullable=False),
        uuid_column("period_id", nullable=False),
        uuid_column("employee_id", nullable=False),
        day_column("worked_days"),
        day_column("leave_days"),
        day_column("unpaid_leave_days"),
        day_column("sick_leave_days"),
        day_column("absent_days"),
        day_column("overtime_hours"),
        day_column("base_salary", nullable=True),
        sa.Column("currency", sa.Text(), nullable=True),
        sa.Column("payroll_status", sa.Text(), nullable=False, server_default="not_ready"),
        jsonb_column("metadata_json", "'{}'::jsonb"),
        *versioned_columns(),
    )

    op.execute(
        """
        create unique index ix_hr_leave_types_scope_key
        on hr_leave_types (tenant_id, coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid), leave_type_key)
        where coalesce(is_deleted, false) = false
        """
    )
    op.create_index("ix_hr_leave_types_status", "hr_leave_types", ["tenant_id", "company_id", "active"])
    op.create_index("ix_hr_leave_balances_employee", "hr_leave_balances", ["tenant_id", "company_id", "employee_id"])
    op.create_index("ix_hr_leave_balances_unique", "hr_leave_balances", ["tenant_id", "employee_id", "leave_type_id", "period_year"], unique=True, postgresql_where=sa.text("coalesce(is_deleted, false) = false"))
    op.create_index("ix_hr_leave_requests_employee_dates", "hr_leave_requests", ["tenant_id", "employee_id", "start_date", "end_date"])
    op.create_index("ix_hr_leave_requests_status", "hr_leave_requests", ["tenant_id", "status"])
    op.create_index("ix_hr_leave_requests_approver_status", "hr_leave_requests", ["tenant_id", "approver_id", "status"])
    op.create_index("ix_hr_leave_requests_request_no", "hr_leave_requests", ["tenant_id", "request_no"], unique=True, postgresql_where=sa.text("coalesce(is_deleted, false) = false"))
    op.create_index("ix_hr_attendance_employee_date", "hr_attendance_records", ["tenant_id", "employee_id", "work_date"], unique=True, postgresql_where=sa.text("coalesce(is_deleted, false) = false"))
    op.create_index("ix_hr_attendance_work_date", "hr_attendance_records", ["tenant_id", "work_date"])
    op.create_index("ix_hr_attendance_status", "hr_attendance_records", ["tenant_id", "status"])
    op.create_index("ix_hr_work_schedules_scope", "hr_work_schedules", ["tenant_id", "company_id", "active"])
    op.create_index("ix_hr_shifts_scope", "hr_shifts", ["tenant_id", "company_id", "active"])
    op.create_index("ix_hr_employee_work_schedules_employee", "hr_employee_work_schedules", ["tenant_id", "employee_id", "effective_date"])
    op.create_index("ix_hr_timesheet_periods_dates", "hr_timesheet_periods", ["tenant_id", "period_start", "period_end"])
    op.create_index("ix_hr_timesheet_periods_status", "hr_timesheet_periods", ["tenant_id", "status"])
    op.create_index("ix_hr_timesheet_periods_unique", "hr_timesheet_periods", ["tenant_id", "company_id", "period_key"], unique=True, postgresql_where=sa.text("coalesce(is_deleted, false) = false"))
    op.create_index("ix_hr_timesheet_rows_period_employee", "hr_timesheet_rows", ["tenant_id", "period_id", "employee_id"], unique=True, postgresql_where=sa.text("coalesce(is_deleted, false) = false"))
    op.create_index("ix_hr_payroll_prep_period_employee", "hr_payroll_preparation_rows", ["tenant_id", "period_id", "employee_id"], unique=True, postgresql_where=sa.text("coalesce(is_deleted, false) = false"))
    op.create_index("ix_hr_payroll_prep_status", "hr_payroll_preparation_rows", ["tenant_id", "company_id", "payroll_status"])


def downgrade() -> None:
    op.drop_index("ix_hr_payroll_prep_status", table_name="hr_payroll_preparation_rows")
    op.drop_index("ix_hr_payroll_prep_period_employee", table_name="hr_payroll_preparation_rows")
    op.drop_index("ix_hr_timesheet_rows_period_employee", table_name="hr_timesheet_rows")
    op.drop_index("ix_hr_timesheet_periods_unique", table_name="hr_timesheet_periods")
    op.drop_index("ix_hr_timesheet_periods_status", table_name="hr_timesheet_periods")
    op.drop_index("ix_hr_timesheet_periods_dates", table_name="hr_timesheet_periods")
    op.drop_index("ix_hr_employee_work_schedules_employee", table_name="hr_employee_work_schedules")
    op.drop_index("ix_hr_shifts_scope", table_name="hr_shifts")
    op.drop_index("ix_hr_work_schedules_scope", table_name="hr_work_schedules")
    op.drop_index("ix_hr_attendance_status", table_name="hr_attendance_records")
    op.drop_index("ix_hr_attendance_work_date", table_name="hr_attendance_records")
    op.drop_index("ix_hr_attendance_employee_date", table_name="hr_attendance_records")
    op.drop_index("ix_hr_leave_requests_request_no", table_name="hr_leave_requests")
    op.drop_index("ix_hr_leave_requests_approver_status", table_name="hr_leave_requests")
    op.drop_index("ix_hr_leave_requests_status", table_name="hr_leave_requests")
    op.drop_index("ix_hr_leave_requests_employee_dates", table_name="hr_leave_requests")
    op.drop_index("ix_hr_leave_balances_unique", table_name="hr_leave_balances")
    op.drop_index("ix_hr_leave_balances_employee", table_name="hr_leave_balances")
    op.drop_index("ix_hr_leave_types_status", table_name="hr_leave_types")
    op.drop_index("ix_hr_leave_types_scope_key", table_name="hr_leave_types")
    op.drop_table("hr_payroll_preparation_rows")
    op.drop_table("hr_timesheet_rows")
    op.drop_table("hr_timesheet_periods")
    op.drop_table("hr_employee_work_schedules")
    op.drop_table("hr_shifts")
    op.drop_table("hr_work_schedules")
    op.drop_table("hr_attendance_records")
    op.drop_table("hr_leave_requests")
    op.drop_table("hr_leave_balances")
    op.drop_table("hr_leave_types")
