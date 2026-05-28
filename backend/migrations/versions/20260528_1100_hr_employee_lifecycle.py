"""hr employee lifecycle foundation

Revision ID: 20260528_1100
Revises: 20260528_1000
Create Date: 2026-05-28
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260528_1100"
down_revision: str | None = "20260528_1000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def uuid_pk() -> sa.Column:
    return sa.Column(
        "id",
        postgresql.UUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("gen_random_uuid()"),
    )


def uuid_column(name: str, *, nullable: bool = True) -> sa.Column:
    return sa.Column(name, postgresql.UUID(as_uuid=True), nullable=nullable)


def jsonb_column(name: str, default: str) -> sa.Column:
    return sa.Column(
        name,
        postgresql.JSONB(astext_type=sa.Text()),
        nullable=False,
        server_default=sa.text(default),
    )


def timestamp_column(name: str) -> sa.Column:
    return sa.Column(
        name,
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text("now()"),
    )


def upgrade() -> None:
    op.execute('create extension if not exists "pgcrypto"')
    op.create_table(
        "hr_employees",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id", nullable=False),
        sa.Column("person_id", sa.Text(), nullable=True),
        sa.Column("employee_no", sa.Text(), nullable=False),
        sa.Column("first_name", sa.Text(), nullable=False),
        sa.Column("last_name", sa.Text(), nullable=False),
        sa.Column("full_name", sa.Text(), nullable=False),
        sa.Column("identity_number", sa.Text(), nullable=True),
        sa.Column("passport_no", sa.Text(), nullable=True),
        sa.Column("nationality", sa.Text(), nullable=True),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("gender", sa.Text(), nullable=True),
        sa.Column("marital_status", sa.Text(), nullable=True),
        sa.Column("education_level", sa.Text(), nullable=True),
        sa.Column("phone", sa.Text(), nullable=True),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("city", sa.Text(), nullable=True),
        sa.Column("district", sa.Text(), nullable=True),
        sa.Column("country", sa.Text(), nullable=True),
        jsonb_column("emergency_contact", "'{}'::jsonb"),
        sa.Column("photo_url", sa.Text(), nullable=True),
        sa.Column("record_status", sa.Text(), nullable=False, server_default="draft"),
        sa.Column("employment_status", sa.Text(), nullable=False, server_default="draft"),
        sa.Column("notes", sa.Text(), nullable=True),
        jsonb_column("metadata_json", "'{}'::jsonb"),
        uuid_column("created_by"),
        uuid_column("updated_by"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_table(
        "hr_employment_records",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("employee_id", nullable=False),
        uuid_column("company_id", nullable=False),
        uuid_column("branch_id"),
        uuid_column("organization_unit_id"),
        uuid_column("position_id"),
        sa.Column("job_title", sa.Text(), nullable=True),
        sa.Column("employment_type", sa.Text(), nullable=False),
        sa.Column("employment_status", sa.Text(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("trial_period_end_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("termination_reason", sa.Text(), nullable=True),
        sa.Column("sgk_status", sa.Text(), nullable=False, server_default="pending"),
        sa.Column("sgk_workplace_registry_no", sa.Text(), nullable=True),
        sa.Column("work_location_type", sa.Text(), nullable=True),
        uuid_column("manager_employee_id"),
        sa.Column("salary_type", sa.Text(), nullable=True),
        sa.Column("currency", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        uuid_column("created_by"),
        uuid_column("updated_by"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_table(
        "hr_employment_transactions",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("employee_id", nullable=False),
        uuid_column("company_id", nullable=False),
        sa.Column("transaction_type", sa.Text(), nullable=False),
        sa.Column("transaction_date", sa.Date(), nullable=False),
        sa.Column("effective_date", sa.Date(), nullable=False),
        jsonb_column("old_values", "'{}'::jsonb"),
        jsonb_column("new_values", "'{}'::jsonb"),
        sa.Column("reason", sa.Text(), nullable=True),
        jsonb_column("document_files", "'[]'::jsonb"),
        uuid_column("operation_id"),
        uuid_column("process_instance_id"),
        uuid_column("created_by"),
        timestamp_column("created_at"),
    )
    op.create_table(
        "hr_employee_documents",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("employee_id", nullable=False),
        uuid_column("company_id", nullable=False),
        sa.Column("document_type", sa.Text(), nullable=False),
        jsonb_column("file_ref", "'{}'::jsonb"),
        sa.Column("issue_date", sa.Date(), nullable=True),
        sa.Column("expiry_date", sa.Date(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("required", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("notes", sa.Text(), nullable=True),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
    )
    op.create_index(
        "ix_hr_employees_tenant_company_record_status",
        "hr_employees",
        ["tenant_id", "company_id", "record_status"],
    )
    op.create_index(
        "ix_hr_employees_tenant_company_employment_status",
        "hr_employees",
        ["tenant_id", "company_id", "employment_status"],
    )
    op.create_index(
        "ix_hr_employment_records_branch",
        "hr_employment_records",
        ["tenant_id", "branch_id"],
    )
    op.create_index(
        "ix_hr_employment_records_unit",
        "hr_employment_records",
        ["tenant_id", "organization_unit_id"],
    )
    op.create_index(
        "ix_hr_employment_records_position",
        "hr_employment_records",
        ["tenant_id", "position_id"],
    )
    op.create_index(
        "ix_hr_employees_employee_no",
        "hr_employees",
        ["tenant_id", "employee_no"],
        unique=True,
        postgresql_where=sa.text("coalesce(is_deleted, false) = false"),
    )
    op.create_index("ix_hr_employees_identity", "hr_employees", ["tenant_id", "identity_number"])
    op.execute(
        "create index ix_hr_employment_transactions_employee_date "
        "on hr_employment_transactions (tenant_id, employee_id, transaction_date desc)"
    )
    op.create_index(
        "ix_hr_employee_documents_type",
        "hr_employee_documents",
        ["tenant_id", "employee_id", "document_type"],
    )


def downgrade() -> None:
    op.drop_index("ix_hr_employee_documents_type", table_name="hr_employee_documents")
    op.drop_index(
        "ix_hr_employment_transactions_employee_date",
        table_name="hr_employment_transactions",
    )
    op.drop_index("ix_hr_employees_identity", table_name="hr_employees")
    op.drop_index("ix_hr_employees_employee_no", table_name="hr_employees")
    op.drop_index("ix_hr_employment_records_position", table_name="hr_employment_records")
    op.drop_index("ix_hr_employment_records_unit", table_name="hr_employment_records")
    op.drop_index("ix_hr_employment_records_branch", table_name="hr_employment_records")
    op.drop_index(
        "ix_hr_employees_tenant_company_employment_status",
        table_name="hr_employees",
    )
    op.drop_index("ix_hr_employees_tenant_company_record_status", table_name="hr_employees")
    op.drop_table("hr_employee_documents")
    op.drop_table("hr_employment_transactions")
    op.drop_table("hr_employment_records")
    op.drop_table("hr_employees")
