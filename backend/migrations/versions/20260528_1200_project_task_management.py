"""project task management foundation

Revision ID: 20260528_1200
Revises: 20260528_1100
Create Date: 2026-05-28
"""

# ruff: noqa: E501

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260528_1200"
down_revision: str | None = "20260528_1100"
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
        "project_projects",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id", nullable=False),
        uuid_column("branch_id"),
        uuid_column("organization_unit_id"),
        uuid_column("facility_id"),
        sa.Column("project_key", sa.Text(), nullable=False),
        sa.Column("project_name", sa.Text(), nullable=False),
        sa.Column("project_type", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("project_owner_id", sa.Text(), nullable=True),
        sa.Column("project_manager_id", sa.Text(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("target_end_date", sa.Date(), nullable=True),
        sa.Column("actual_end_date", sa.Date(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="draft"),
        sa.Column("priority", sa.Text(), nullable=False, server_default="medium"),
        sa.Column("progress_percent", sa.Numeric(), nullable=False, server_default="0"),
        sa.Column("budget_amount", sa.Numeric(), nullable=True),
        sa.Column("currency", sa.Text(), nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.Text()), nullable=False, server_default="{}"),
        jsonb_column("metadata_json", "'{}'::jsonb"),
        uuid_column("created_by"),
        uuid_column("updated_by"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_table(
        "project_tasks",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id", nullable=False),
        uuid_column("project_id"),
        uuid_column("branch_id"),
        uuid_column("organization_unit_id"),
        uuid_column("facility_id"),
        sa.Column("issue_key", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("issue_type", sa.Text(), nullable=False, server_default="task"),
        sa.Column("status", sa.Text(), nullable=False, server_default="todo"),
        sa.Column("priority", sa.Text(), nullable=False, server_default="medium"),
        uuid_column("assignee_user_id"),
        uuid_column("assignee_employee_id"),
        uuid_column("reporter_user_id"),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("estimated_hours", sa.Numeric(), nullable=True),
        sa.Column("spent_hours", sa.Numeric(), nullable=True),
        sa.Column("labels", postgresql.ARRAY(sa.Text()), nullable=False, server_default="{}"),
        sa.Column("related_module", sa.Text(), nullable=True),
        sa.Column("related_entity_type", sa.Text(), nullable=True),
        sa.Column("related_entity_id", sa.Text(), nullable=True),
        uuid_column("parent_task_id"),
        jsonb_column("metadata_json", "'{}'::jsonb"),
        uuid_column("created_by"),
        uuid_column("updated_by"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_table(
        "project_task_comments",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("task_id", nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        uuid_column("created_by", nullable=False),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_table(
        "project_task_attachments",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("task_id", nullable=False),
        jsonb_column("file_ref", "'{}'::jsonb"),
        sa.Column("file_name", sa.Text(), nullable=False),
        sa.Column("file_type", sa.Text(), nullable=True),
        uuid_column("uploaded_by", nullable=False),
        timestamp_column("created_at"),
    )
    op.create_table(
        "project_task_history",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("task_id", nullable=False),
        sa.Column("action_type", sa.Text(), nullable=False),
        jsonb_column("old_values", "'{}'::jsonb"),
        jsonb_column("new_values", "'{}'::jsonb"),
        uuid_column("created_by", nullable=False),
        timestamp_column("created_at"),
    )
    op.create_index("ix_project_projects_tenant_company_status", "project_projects", ["tenant_id", "company_id", "status"])
    op.create_index("ix_project_tasks_tenant_company_status", "project_tasks", ["tenant_id", "company_id", "status"])
    op.create_index("ix_project_tasks_tenant_project_status", "project_tasks", ["tenant_id", "project_id", "status"])
    op.create_index("ix_project_tasks_assignee_user", "project_tasks", ["tenant_id", "assignee_user_id", "status", "due_date"])
    op.create_index("ix_project_tasks_assignee_employee", "project_tasks", ["tenant_id", "assignee_employee_id", "status", "due_date"])
    op.create_index("ix_project_tasks_related_record", "project_tasks", ["tenant_id", "related_module", "related_entity_type", "related_entity_id"])
    op.create_index("ix_project_tasks_issue_key", "project_tasks", ["tenant_id", "issue_key"])
    op.create_index("ix_project_projects_project_key", "project_projects", ["tenant_id", "project_key"])
    op.execute("create index ix_project_tasks_created_at on project_tasks (tenant_id, created_at desc)")
    op.create_index("ix_project_tasks_due_date", "project_tasks", ["tenant_id", "due_date"])


def downgrade() -> None:
    op.drop_index("ix_project_tasks_due_date", table_name="project_tasks")
    op.drop_index("ix_project_tasks_created_at", table_name="project_tasks")
    op.drop_index("ix_project_projects_project_key", table_name="project_projects")
    op.drop_index("ix_project_tasks_issue_key", table_name="project_tasks")
    op.drop_index("ix_project_tasks_related_record", table_name="project_tasks")
    op.drop_index("ix_project_tasks_assignee_employee", table_name="project_tasks")
    op.drop_index("ix_project_tasks_assignee_user", table_name="project_tasks")
    op.drop_index("ix_project_tasks_tenant_project_status", table_name="project_tasks")
    op.drop_index("ix_project_tasks_tenant_company_status", table_name="project_tasks")
    op.drop_index("ix_project_projects_tenant_company_status", table_name="project_projects")
    op.drop_table("project_task_history")
    op.drop_table("project_task_attachments")
    op.drop_table("project_task_comments")
    op.drop_table("project_tasks")
    op.drop_table("project_projects")
