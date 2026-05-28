"""product service and after sales foundation

Revision ID: 20260528_1300
Revises: 20260528_1200
Create Date: 2026-05-28
"""

# ruff: noqa: E501

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260528_1300"
down_revision: str | None = "20260528_1200"
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
    op.create_table(
        "product_catalog",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id"),
        sa.Column("product_code", sa.Text(), nullable=False),
        sa.Column("product_name", sa.Text(), nullable=False),
        sa.Column("product_type", sa.Text(), nullable=False),
        sa.Column("category", sa.Text(), nullable=True),
        sa.Column("brand", sa.Text(), nullable=True),
        sa.Column("model", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("unit", sa.Text(), nullable=True),
        sa.Column("serial_required", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("warranty_months", sa.Integer(), nullable=True),
        sa.Column("maintenance_required", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("maintenance_period_days", sa.Integer(), nullable=True),
        sa.Column("serviceable", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sale_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("after_sales_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("default_currency", sa.Text(), nullable=True),
        sa.Column("default_price", sa.Numeric(), nullable=True),
        jsonb_column("technical_specs", "'{}'::jsonb"),
        jsonb_column("document_files", "'[]'::jsonb"),
        sa.Column("notes", sa.Text(), nullable=True),
        *versioned_columns(),
    )
    op.create_table(
        "after_sales_installed_assets",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("owning_company_id", nullable=False),
        uuid_column("customer_account_id"),
        uuid_column("customer_company_id"),
        sa.Column("customer_name", sa.Text(), nullable=False),
        uuid_column("product_id", nullable=False),
        sa.Column("product_code", sa.Text(), nullable=False),
        sa.Column("product_name", sa.Text(), nullable=False),
        sa.Column("serial_no", sa.Text(), nullable=True),
        sa.Column("asset_tag", sa.Text(), nullable=True),
        sa.Column("installation_date", sa.Date(), nullable=True),
        sa.Column("warranty_start_date", sa.Date(), nullable=True),
        sa.Column("warranty_end_date", sa.Date(), nullable=True),
        sa.Column("warranty_status", sa.Text(), nullable=False, server_default="unknown"),
        sa.Column("maintenance_required", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("next_maintenance_date", sa.Date(), nullable=True),
        sa.Column("last_service_date", sa.Date(), nullable=True),
        uuid_column("facility_id"),
        uuid_column("branch_id"),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("city", sa.Text(), nullable=True),
        sa.Column("district", sa.Text(), nullable=True),
        sa.Column("contact_person", sa.Text(), nullable=True),
        sa.Column("contact_phone", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="active"),
        sa.Column("notes", sa.Text(), nullable=True),
        jsonb_column("document_files", "'[]'::jsonb"),
        *versioned_columns(),
    )
    op.create_table(
        "after_sales_service_requests",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id", nullable=False),
        uuid_column("customer_account_id"),
        sa.Column("customer_name", sa.Text(), nullable=False),
        uuid_column("installed_asset_id"),
        uuid_column("product_id"),
        sa.Column("request_no", sa.Text(), nullable=False),
        sa.Column("request_type", sa.Text(), nullable=False),
        sa.Column("priority", sa.Text(), nullable=False, server_default="medium"),
        sa.Column("status", sa.Text(), nullable=False, server_default="new"),
        sa.Column("subject", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("reported_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("requested_date", sa.Date(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("contact_person", sa.Text(), nullable=True),
        sa.Column("contact_phone", sa.Text(), nullable=True),
        sa.Column("contact_email", sa.Text(), nullable=True),
        sa.Column("location", sa.Text(), nullable=True),
        uuid_column("assigned_user_id"),
        uuid_column("assigned_employee_id"),
        uuid_column("project_task_id"),
        sa.Column("source", sa.Text(), nullable=True),
        jsonb_column("document_files", "'[]'::jsonb"),
        sa.Column("notes", sa.Text(), nullable=True),
        *versioned_columns(),
    )
    op.create_table(
        "after_sales_service_records",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id", nullable=False),
        uuid_column("service_request_id"),
        uuid_column("installed_asset_id"),
        uuid_column("product_id"),
        sa.Column("service_no", sa.Text(), nullable=False),
        sa.Column("service_type", sa.Text(), nullable=False),
        sa.Column("service_date", sa.Date(), nullable=False),
        uuid_column("technician_user_id"),
        uuid_column("technician_employee_id"),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="planned"),
        sa.Column("fault_description", sa.Text(), nullable=True),
        sa.Column("work_performed", sa.Text(), nullable=True),
        jsonb_column("parts_used", "'[]'::jsonb"),
        sa.Column("result", sa.Text(), nullable=True),
        sa.Column("warranty_covered", sa.Boolean(), nullable=True),
        sa.Column("customer_signature_file", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("service_report_file", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        jsonb_column("photos", "'[]'::jsonb"),
        sa.Column("next_action", sa.Text(), nullable=True),
        sa.Column("next_service_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        *versioned_columns(),
    )
    op.create_index("ix_product_catalog_tenant_product_code", "product_catalog", ["tenant_id", "product_code"])
    op.create_index("ix_product_catalog_type_active", "product_catalog", ["tenant_id", "product_type", "active"])
    op.create_index("ix_product_catalog_after_sales", "product_catalog", ["tenant_id", "after_sales_enabled"])
    op.create_index("ix_after_sales_assets_customer_account", "after_sales_installed_assets", ["tenant_id", "customer_account_id"])
    op.create_index("ix_after_sales_assets_product", "after_sales_installed_assets", ["tenant_id", "product_id"])
    op.create_index("ix_after_sales_assets_serial", "after_sales_installed_assets", ["tenant_id", "serial_no"])
    op.create_index("ix_after_sales_assets_status", "after_sales_installed_assets", ["tenant_id", "status"])
    op.create_index("ix_after_sales_assets_maintenance", "after_sales_installed_assets", ["tenant_id", "next_maintenance_date"])
    op.create_index("ix_after_sales_requests_asset", "after_sales_service_requests", ["tenant_id", "installed_asset_id"])
    op.create_index("ix_after_sales_requests_product", "after_sales_service_requests", ["tenant_id", "product_id"])
    op.create_index("ix_after_sales_requests_status_due", "after_sales_service_requests", ["tenant_id", "status", "due_date"])
    op.create_index("ix_after_sales_requests_assignee_user", "after_sales_service_requests", ["tenant_id", "assigned_user_id", "status"])
    op.create_index("ix_after_sales_records_asset", "after_sales_service_records", ["tenant_id", "installed_asset_id"])
    op.create_index("ix_after_sales_records_request", "after_sales_service_records", ["tenant_id", "service_request_id"])
    op.create_index("ix_after_sales_records_technician", "after_sales_service_records", ["tenant_id", "technician_user_id", "status"])


def downgrade() -> None:
    op.drop_index("ix_after_sales_records_technician", table_name="after_sales_service_records")
    op.drop_index("ix_after_sales_records_request", table_name="after_sales_service_records")
    op.drop_index("ix_after_sales_records_asset", table_name="after_sales_service_records")
    op.drop_index("ix_after_sales_requests_assignee_user", table_name="after_sales_service_requests")
    op.drop_index("ix_after_sales_requests_status_due", table_name="after_sales_service_requests")
    op.drop_index("ix_after_sales_requests_product", table_name="after_sales_service_requests")
    op.drop_index("ix_after_sales_requests_asset", table_name="after_sales_service_requests")
    op.drop_index("ix_after_sales_assets_maintenance", table_name="after_sales_installed_assets")
    op.drop_index("ix_after_sales_assets_status", table_name="after_sales_installed_assets")
    op.drop_index("ix_after_sales_assets_serial", table_name="after_sales_installed_assets")
    op.drop_index("ix_after_sales_assets_product", table_name="after_sales_installed_assets")
    op.drop_index("ix_after_sales_assets_customer_account", table_name="after_sales_installed_assets")
    op.drop_index("ix_product_catalog_after_sales", table_name="product_catalog")
    op.drop_index("ix_product_catalog_type_active", table_name="product_catalog")
    op.drop_index("ix_product_catalog_tenant_product_code", table_name="product_catalog")
    op.drop_table("after_sales_service_records")
    op.drop_table("after_sales_service_requests")
    op.drop_table("after_sales_installed_assets")
    op.drop_table("product_catalog")
