"""after sales field service deepening

Revision ID: 20260529_2350
Revises: 20260529_2300
Create Date: 2026-05-29
"""

# ruff: noqa: E501

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260529_2350"
down_revision: str | None = "20260529_2300"
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


def versioned_columns() -> list[sa.Column]:
    return [
        jsonb_column("metadata_json", "'{}'::jsonb"),
        uuid_column("created_by"),
        uuid_column("updated_by"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    ]


def upgrade() -> None:
    op.execute('create extension if not exists "pgcrypto"')
    op.add_column("after_sales_service_requests", sa.Column("schedule_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("after_sales_service_requests", sa.Column("warranty_check_result", sa.Text(), nullable=True))
    op.add_column("after_sales_service_requests", sa.Column("estimated_duration_minutes", sa.Integer(), nullable=True))
    op.add_column("after_sales_service_requests", jsonb_column("required_skills", "'[]'::jsonb"))
    op.add_column("after_sales_service_requests", uuid_column("suggested_technician_user_id"))
    op.add_column("after_sales_service_requests", uuid_column("suggested_technician_employee_id"))
    op.add_column("after_sales_service_requests", jsonb_column("required_parts_preview", "'[]'::jsonb"))
    op.add_column("after_sales_service_requests", sa.Column("customer_availability", sa.Text(), nullable=True))

    op.create_table(
        "after_sales_maintenance_plans",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id"),
        uuid_column("product_id"),
        uuid_column("installed_asset_id"),
        sa.Column("plan_name", sa.Text(), nullable=False),
        sa.Column("maintenance_type", sa.Text(), nullable=False, server_default="periodic"),
        sa.Column("interval_type", sa.Text(), nullable=False, server_default="days"),
        sa.Column("interval_value", sa.Integer(), nullable=False, server_default="30"),
        uuid_column("checklist_template_id"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("next_run_date", sa.Date(), nullable=True),
        sa.Column("last_run_date", sa.Date(), nullable=True),
        uuid_column("assigned_team_id"),
        sa.Column("default_priority", sa.Text(), nullable=False, server_default="medium"),
        sa.Column("notes", sa.Text(), nullable=True),
        *versioned_columns(),
    )
    op.create_table(
        "after_sales_maintenance_due_items",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id", nullable=False),
        uuid_column("maintenance_plan_id", nullable=False),
        uuid_column("installed_asset_id", nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="scheduled"),
        uuid_column("generated_service_request_id"),
        uuid_column("generated_service_record_id"),
        uuid_column("assigned_user_id"),
        sa.Column("notes", sa.Text(), nullable=True),
        *versioned_columns(),
    )
    op.create_table(
        "after_sales_field_assignments",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id", nullable=False),
        uuid_column("service_request_id", nullable=False),
        uuid_column("service_record_id"),
        uuid_column("installed_asset_id"),
        uuid_column("technician_user_id"),
        uuid_column("technician_employee_id"),
        uuid_column("assigned_by"),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("scheduled_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scheduled_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="assigned"),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        *versioned_columns(),
    )
    op.create_table(
        "after_sales_checklist_templates",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id"),
        uuid_column("product_id"),
        sa.Column("service_type", sa.Text(), nullable=False),
        sa.Column("checklist_name", sa.Text(), nullable=False),
        jsonb_column("items", "'[]'::jsonb"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        *versioned_columns(),
    )
    op.create_table(
        "after_sales_service_checklist_results",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("service_record_id", nullable=False),
        uuid_column("checklist_template_id", nullable=False),
        jsonb_column("results", "'{}'::jsonb"),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        jsonb_column("missing_required_items", "'[]'::jsonb"),
        uuid_column("updated_by"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
    )

    op.create_index("ix_after_sales_maintenance_plans_scope", "after_sales_maintenance_plans", ["tenant_id", "company_id", "active"])
    op.create_index("ix_after_sales_maintenance_plans_asset", "after_sales_maintenance_plans", ["tenant_id", "installed_asset_id"])
    op.create_index("ix_after_sales_maintenance_plans_product", "after_sales_maintenance_plans", ["tenant_id", "product_id"])
    op.create_index("ix_after_sales_maintenance_due_status", "after_sales_maintenance_due_items", ["tenant_id", "company_id", "status"])
    op.create_index("ix_after_sales_maintenance_due_date", "after_sales_maintenance_due_items", ["tenant_id", "due_date"])
    op.create_index("ix_after_sales_maintenance_due_asset", "after_sales_maintenance_due_items", ["tenant_id", "installed_asset_id"])
    op.create_index("ix_after_sales_maintenance_due_unique_open", "after_sales_maintenance_due_items", ["tenant_id", "maintenance_plan_id", "installed_asset_id", "due_date"], unique=True, postgresql_where=sa.text("coalesce(is_deleted, false) = false"))
    op.create_index("ix_after_sales_assignments_status", "after_sales_field_assignments", ["tenant_id", "company_id", "status"])
    op.create_index("ix_after_sales_assignments_user", "after_sales_field_assignments", ["tenant_id", "technician_user_id", "status"])
    op.create_index("ix_after_sales_assignments_employee", "after_sales_field_assignments", ["tenant_id", "technician_employee_id", "status"])
    op.create_index("ix_after_sales_assignments_schedule", "after_sales_field_assignments", ["tenant_id", "scheduled_start"])
    op.create_index("ix_after_sales_checklists_product", "after_sales_checklist_templates", ["tenant_id", "product_id", "active"])
    op.create_index("ix_after_sales_checklists_type", "after_sales_checklist_templates", ["tenant_id", "service_type", "active"])
    op.create_index("ix_after_sales_checklist_results_record", "after_sales_service_checklist_results", ["tenant_id", "service_record_id"], unique=True)
    op.create_index("ix_after_sales_requests_schedule", "after_sales_service_requests", ["tenant_id", "schedule_date"])


def downgrade() -> None:
    op.drop_index("ix_after_sales_requests_schedule", table_name="after_sales_service_requests")
    op.drop_index("ix_after_sales_checklist_results_record", table_name="after_sales_service_checklist_results")
    op.drop_index("ix_after_sales_checklists_type", table_name="after_sales_checklist_templates")
    op.drop_index("ix_after_sales_checklists_product", table_name="after_sales_checklist_templates")
    op.drop_index("ix_after_sales_assignments_schedule", table_name="after_sales_field_assignments")
    op.drop_index("ix_after_sales_assignments_employee", table_name="after_sales_field_assignments")
    op.drop_index("ix_after_sales_assignments_user", table_name="after_sales_field_assignments")
    op.drop_index("ix_after_sales_assignments_status", table_name="after_sales_field_assignments")
    op.drop_index("ix_after_sales_maintenance_due_unique_open", table_name="after_sales_maintenance_due_items")
    op.drop_index("ix_after_sales_maintenance_due_asset", table_name="after_sales_maintenance_due_items")
    op.drop_index("ix_after_sales_maintenance_due_date", table_name="after_sales_maintenance_due_items")
    op.drop_index("ix_after_sales_maintenance_due_status", table_name="after_sales_maintenance_due_items")
    op.drop_index("ix_after_sales_maintenance_plans_product", table_name="after_sales_maintenance_plans")
    op.drop_index("ix_after_sales_maintenance_plans_asset", table_name="after_sales_maintenance_plans")
    op.drop_index("ix_after_sales_maintenance_plans_scope", table_name="after_sales_maintenance_plans")
    op.drop_table("after_sales_service_checklist_results")
    op.drop_table("after_sales_checklist_templates")
    op.drop_table("after_sales_field_assignments")
    op.drop_table("after_sales_maintenance_due_items")
    op.drop_table("after_sales_maintenance_plans")
    op.drop_column("after_sales_service_requests", "customer_availability")
    op.drop_column("after_sales_service_requests", "required_parts_preview")
    op.drop_column("after_sales_service_requests", "suggested_technician_employee_id")
    op.drop_column("after_sales_service_requests", "suggested_technician_user_id")
    op.drop_column("after_sales_service_requests", "required_skills")
    op.drop_column("after_sales_service_requests", "estimated_duration_minutes")
    op.drop_column("after_sales_service_requests", "warranty_check_result")
    op.drop_column("after_sales_service_requests", "schedule_date")
