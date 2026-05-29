"""advanced reporting saved views schedules exports

Revision ID: 20260529_2370
Revises: 20260529_2360
Create Date: 2026-05-29
"""

# ruff: noqa: E501

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260529_2370"
down_revision: str | None = "20260529_2360"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def uuid_pk() -> sa.Column:
    return sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))


def uuid_column(name: str, *, nullable: bool = True) -> sa.Column:
    return sa.Column(name, postgresql.UUID(as_uuid=True), nullable=nullable)


def jsonb_column(name: str, default: str) -> sa.Column:
    return sa.Column(name, postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text(default))


def timestamp_column(name: str, *, nullable: bool = False) -> sa.Column:
    return sa.Column(name, sa.DateTime(timezone=True), nullable=nullable, server_default=None if nullable else sa.text("now()"))


def upgrade() -> None:
    op.execute('create extension if not exists "pgcrypto"')
    op.create_table(
        "reporting_saved_views",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("owner_user_id", nullable=False),
        sa.Column("module_key", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=True),
        sa.Column("report_key", sa.Text(), nullable=True),
        sa.Column("view_name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("visibility", sa.Text(), nullable=False, server_default="private"),
        jsonb_column("filters_json", "'{}'::jsonb"),
        jsonb_column("columns_json", "'[]'::jsonb"),
        jsonb_column("sort_json", "'{}'::jsonb"),
        jsonb_column("group_by_json", "'[]'::jsonb"),
        jsonb_column("chart_config_json", "'{}'::jsonb"),
        sa.Column("default_view", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("pinned", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        jsonb_column("shared_role_ids", "'[]'::jsonb"),
        jsonb_column("shared_user_ids", "'[]'::jsonb"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_table(
        "reporting_custom_reports",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        sa.Column("report_key", sa.Text(), nullable=False),
        sa.Column("report_name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("module_key", sa.Text(), nullable=False),
        sa.Column("report_type", sa.Text(), nullable=False, server_default="table"),
        sa.Column("source_type", sa.Text(), nullable=False),
        sa.Column("source_key", sa.Text(), nullable=False),
        jsonb_column("allowed_filters_json", "'{}'::jsonb"),
        jsonb_column("default_filters_json", "'{}'::jsonb"),
        jsonb_column("columns_json", "'[]'::jsonb"),
        jsonb_column("default_sort_json", "'{}'::jsonb"),
        jsonb_column("chart_config_json", "'{}'::jsonb"),
        jsonb_column("required_permissions", "'[]'::jsonb"),
        sa.Column("export_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("schedule_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        uuid_column("created_by"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
    )
    op.create_table(
        "reporting_scheduled_reports",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        sa.Column("report_key", sa.Text(), nullable=False),
        uuid_column("saved_view_id"),
        sa.Column("schedule_name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        uuid_column("owner_user_id", nullable=False),
        jsonb_column("recipients_json", "'[]'::jsonb"),
        sa.Column("schedule_rule", sa.Text(), nullable=False),
        sa.Column("timezone", sa.Text(), nullable=False, server_default="Europe/Istanbul"),
        timestamp_column("next_run_at"),
        timestamp_column("last_run_at", nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="active"),
        sa.Column("export_format", sa.Text(), nullable=False, server_default="csv"),
        sa.Column("email_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("email_subject_template", sa.Text(), nullable=True),
        sa.Column("email_body_template", sa.Text(), nullable=True),
        sa.Column("last_result_status", sa.Text(), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
    )
    op.create_table(
        "reporting_export_jobs",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        sa.Column("report_key", sa.Text(), nullable=False),
        uuid_column("saved_view_id"),
        uuid_column("requested_by", nullable=False),
        sa.Column("export_format", sa.Text(), nullable=False),
        jsonb_column("filters_json", "'{}'::jsonb"),
        jsonb_column("columns_json", "'[]'::jsonb"),
        sa.Column("status", sa.Text(), nullable=False, server_default="queued"),
        sa.Column("row_count", sa.Integer(), nullable=True),
        uuid_column("file_document_id"),
        sa.Column("file_ref", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        timestamp_column("expires_at", nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        timestamp_column("created_at"),
        timestamp_column("completed_at", nullable=True),
    )
    op.create_table(
        "reporting_report_run_logs",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        sa.Column("report_key", sa.Text(), nullable=False),
        uuid_column("scheduled_report_id"),
        uuid_column("export_job_id"),
        sa.Column("run_type", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("row_count", sa.Integer(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        uuid_column("run_by"),
        jsonb_column("metadata_json", "'{}'::jsonb"),
        timestamp_column("created_at"),
    )
    op.create_table(
        "reporting_dashboard_preferences",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("user_id", nullable=False),
        jsonb_column("layout_json", "'[]'::jsonb"),
        jsonb_column("hidden_widgets", "'[]'::jsonb"),
        jsonb_column("pinned_reports", "'[]'::jsonb"),
        jsonb_column("default_filters", "'{}'::jsonb"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
    )

    op.create_index("ix_reporting_saved_views_owner", "reporting_saved_views", ["tenant_id", "owner_user_id"])
    op.create_index("ix_reporting_saved_views_module", "reporting_saved_views", ["tenant_id", "module_key"])
    op.create_index("ix_reporting_saved_views_report", "reporting_saved_views", ["tenant_id", "report_key"])
    op.create_index("ix_reporting_saved_views_visibility", "reporting_saved_views", ["tenant_id", "visibility"])
    op.create_index("ix_reporting_custom_reports_key", "reporting_custom_reports", ["tenant_id", "report_key"], unique=True)
    op.create_index("ix_reporting_custom_reports_module", "reporting_custom_reports", ["tenant_id", "module_key", "active"])
    op.create_index("ix_reporting_scheduled_reports_status", "reporting_scheduled_reports", ["tenant_id", "status", "next_run_at"])
    op.create_index("ix_reporting_scheduled_reports_owner", "reporting_scheduled_reports", ["tenant_id", "owner_user_id"])
    op.create_index("ix_reporting_export_jobs_status", "reporting_export_jobs", ["tenant_id", "status", "created_at"])
    op.create_index("ix_reporting_export_jobs_requested_by", "reporting_export_jobs", ["tenant_id", "requested_by"])
    op.create_index("ix_reporting_run_logs_created", "reporting_report_run_logs", ["tenant_id", "created_at"])
    op.create_index("ix_reporting_run_logs_report", "reporting_report_run_logs", ["tenant_id", "report_key"])
    op.create_index("ix_reporting_dashboard_preferences_user", "reporting_dashboard_preferences", ["tenant_id", "user_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_reporting_dashboard_preferences_user", table_name="reporting_dashboard_preferences")
    op.drop_index("ix_reporting_run_logs_report", table_name="reporting_report_run_logs")
    op.drop_index("ix_reporting_run_logs_created", table_name="reporting_report_run_logs")
    op.drop_index("ix_reporting_export_jobs_requested_by", table_name="reporting_export_jobs")
    op.drop_index("ix_reporting_export_jobs_status", table_name="reporting_export_jobs")
    op.drop_index("ix_reporting_scheduled_reports_owner", table_name="reporting_scheduled_reports")
    op.drop_index("ix_reporting_scheduled_reports_status", table_name="reporting_scheduled_reports")
    op.drop_index("ix_reporting_custom_reports_module", table_name="reporting_custom_reports")
    op.drop_index("ix_reporting_custom_reports_key", table_name="reporting_custom_reports")
    op.drop_index("ix_reporting_saved_views_visibility", table_name="reporting_saved_views")
    op.drop_index("ix_reporting_saved_views_report", table_name="reporting_saved_views")
    op.drop_index("ix_reporting_saved_views_module", table_name="reporting_saved_views")
    op.drop_index("ix_reporting_saved_views_owner", table_name="reporting_saved_views")
    op.drop_table("reporting_dashboard_preferences")
    op.drop_table("reporting_report_run_logs")
    op.drop_table("reporting_export_jobs")
    op.drop_table("reporting_scheduled_reports")
    op.drop_table("reporting_custom_reports")
    op.drop_table("reporting_saved_views")
