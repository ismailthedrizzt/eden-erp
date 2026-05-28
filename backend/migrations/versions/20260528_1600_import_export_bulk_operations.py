# ruff: noqa: E501

"""import export bulk operations

Revision ID: 20260528_1600
Revises: 20260528_1500
Create Date: 2026-05-28
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260528_1600"
down_revision: str | None = "20260528_1500"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def uuid_pk() -> sa.Column:
    return sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))


def uuid_column(name: str, *, nullable: bool = True) -> sa.Column:
    return sa.Column(name, postgresql.UUID(as_uuid=True), nullable=nullable)


def timestamp_column(name: str, *, nullable: bool = False) -> sa.Column:
    return sa.Column(name, sa.DateTime(timezone=True), nullable=nullable, server_default=sa.text("now()") if not nullable else None)


def jsonb_column(name: str, default: str = "'{}'::jsonb", *, nullable: bool = False) -> sa.Column:
    return sa.Column(name, postgresql.JSONB(astext_type=sa.Text()), nullable=nullable, server_default=sa.text(default) if not nullable else None)


def upgrade() -> None:
    op.execute('create extension if not exists "pgcrypto"')
    op.create_table(
        "data_import_jobs",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id"),
        sa.Column("module_key", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=False),
        sa.Column("import_type", sa.Text(), nullable=False, server_default="create"),
        sa.Column("source_file_name", sa.Text(), nullable=True),
        jsonb_column("source_file_ref"),
        sa.Column("file_type", sa.Text(), nullable=False, server_default="csv"),
        sa.Column("status", sa.Text(), nullable=False, server_default="uploaded"),
        sa.Column("total_rows", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("valid_rows", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("invalid_rows", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duplicate_rows", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("warning_rows", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("imported_rows", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("skipped_rows", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_rows", sa.Integer(), nullable=False, server_default="0"),
        jsonb_column("field_mapping"),
        jsonb_column("validation_summary"),
        jsonb_column("error_report_file_ref", nullable=True),
        jsonb_column("dry_run_result"),
        uuid_column("created_by"),
        uuid_column("confirmed_by"),
        timestamp_column("created_at"),
        timestamp_column("confirmed_at", nullable=True),
        timestamp_column("completed_at", nullable=True),
        timestamp_column("updated_at"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
    )
    op.create_table(
        "data_import_job_rows",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("import_job_id", nullable=False),
        sa.Column("row_number", sa.Integer(), nullable=False),
        jsonb_column("raw_data"),
        jsonb_column("normalized_data"),
        sa.Column("status", sa.Text(), nullable=False, server_default="uploaded"),
        jsonb_column("errors", "'[]'::jsonb"),
        jsonb_column("warnings", "'[]'::jsonb"),
        uuid_column("target_entity_id"),
        timestamp_column("created_at"),
    )
    op.create_table(
        "data_export_jobs",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        sa.Column("module_key", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=False),
        sa.Column("report_key", sa.Text(), nullable=True),
        jsonb_column("filters"),
        jsonb_column("columns", "'[]'::jsonb"),
        sa.Column("file_type", sa.Text(), nullable=False, server_default="csv"),
        sa.Column("status", sa.Text(), nullable=False, server_default="queued"),
        sa.Column("row_count", sa.Integer(), nullable=False, server_default="0"),
        jsonb_column("file_ref", nullable=True),
        uuid_column("created_by"),
        timestamp_column("created_at"),
        timestamp_column("completed_at", nullable=True),
    )
    op.create_table(
        "data_bulk_action_jobs",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        sa.Column("module_key", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=False),
        sa.Column("action_key", sa.Text(), nullable=False),
        jsonb_column("selected_ids", "'[]'::jsonb"),
        jsonb_column("payload"),
        sa.Column("status", sa.Text(), nullable=False, server_default="draft"),
        sa.Column("total_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("success_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("skipped_count", sa.Integer(), nullable=False, server_default="0"),
        uuid_column("created_by"),
        uuid_column("confirmed_by"),
        timestamp_column("created_at"),
        timestamp_column("completed_at", nullable=True),
    )
    op.create_table(
        "data_bulk_action_results",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("bulk_job_id", nullable=False),
        uuid_column("entity_id", nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
        jsonb_column("warnings", "'[]'::jsonb"),
        timestamp_column("created_at"),
    )
    op.create_index("ix_data_import_jobs_tenant_status_created", "data_import_jobs", ["tenant_id", "status", "created_at"])
    op.create_index("ix_data_import_jobs_tenant_module_entity", "data_import_jobs", ["tenant_id", "module_key", "entity_type"])
    op.create_index("ix_data_import_rows_job_row", "data_import_job_rows", ["tenant_id", "import_job_id", "row_number"])
    op.create_index("ix_data_export_jobs_tenant_status_created", "data_export_jobs", ["tenant_id", "status", "created_at"])
    op.create_index("ix_data_export_jobs_tenant_module_entity", "data_export_jobs", ["tenant_id", "module_key", "entity_type"])
    op.create_index("ix_data_bulk_jobs_tenant_status_created", "data_bulk_action_jobs", ["tenant_id", "status", "created_at"])
    op.create_index("ix_data_bulk_jobs_tenant_module_entity", "data_bulk_action_jobs", ["tenant_id", "module_key", "entity_type"])
    op.create_index("ix_data_bulk_results_job", "data_bulk_action_results", ["tenant_id", "bulk_job_id"])


def downgrade() -> None:
    op.drop_index("ix_data_bulk_results_job", table_name="data_bulk_action_results")
    op.drop_index("ix_data_bulk_jobs_tenant_module_entity", table_name="data_bulk_action_jobs")
    op.drop_index("ix_data_bulk_jobs_tenant_status_created", table_name="data_bulk_action_jobs")
    op.drop_index("ix_data_export_jobs_tenant_module_entity", table_name="data_export_jobs")
    op.drop_index("ix_data_export_jobs_tenant_status_created", table_name="data_export_jobs")
    op.drop_index("ix_data_import_rows_job_row", table_name="data_import_job_rows")
    op.drop_index("ix_data_import_jobs_tenant_module_entity", table_name="data_import_jobs")
    op.drop_index("ix_data_import_jobs_tenant_status_created", table_name="data_import_jobs")
    op.drop_table("data_bulk_action_results")
    op.drop_table("data_bulk_action_jobs")
    op.drop_table("data_export_jobs")
    op.drop_table("data_import_job_rows")
    op.drop_table("data_import_jobs")

