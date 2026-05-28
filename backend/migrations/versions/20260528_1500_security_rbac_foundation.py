# ruff: noqa: E501

"""security rbac foundation

Revision ID: 20260528_1500
Revises: 20260528_1400
Create Date: 2026-05-28
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260528_1500"
down_revision: str | None = "20260528_1400"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def uuid_pk() -> sa.Column:
    return sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))


def uuid_column(name: str, *, nullable: bool = True) -> sa.Column:
    return sa.Column(name, postgresql.UUID(as_uuid=True), nullable=nullable)


def timestamp_column(name: str) -> sa.Column:
    return sa.Column(name, sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"))


def jsonb_column(name: str, default: str = "'{}'::jsonb") -> sa.Column:
    return sa.Column(name, postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text(default))


def upgrade() -> None:
    op.execute('create extension if not exists "pgcrypto"')
    op.create_table(
        "security_users_profile",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("auth_user_id", nullable=False),
        sa.Column("display_name", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="active"),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        jsonb_column("metadata_json"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_table(
        "security_roles",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        sa.Column("role_key", sa.Text(), nullable=False),
        sa.Column("role_name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("system_role", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("risk_level", sa.Text(), nullable=False, server_default="medium"),
        sa.Column("status", sa.Text(), nullable=False, server_default="active"),
        jsonb_column("metadata_json"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
    )
    op.create_table(
        "security_role_permissions",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("role_id", nullable=False),
        sa.Column("permission_key", sa.Text(), nullable=False),
        sa.Column("granted", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        timestamp_column("created_at"),
    )
    op.create_table(
        "security_user_roles",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("user_id", nullable=False),
        uuid_column("role_id", nullable=False),
        uuid_column("company_id"),
        uuid_column("branch_id"),
        sa.Column("scope_mode", sa.Text(), nullable=True),
        timestamp_column("created_at"),
    )
    op.create_table(
        "security_user_company_scopes",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("user_id", nullable=False),
        uuid_column("company_id", nullable=False),
        sa.Column("can_view", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("can_edit", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("can_operate", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        timestamp_column("created_at"),
    )
    op.create_table(
        "security_user_branch_scopes",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("user_id", nullable=False),
        uuid_column("branch_id", nullable=False),
        sa.Column("can_view", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("can_edit", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("can_operate", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        timestamp_column("created_at"),
    )
    op.create_table(
        "security_policy_test_logs",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("tested_user_id", nullable=False),
        sa.Column("action_key", sa.Text(), nullable=True),
        sa.Column("resource_type", sa.Text(), nullable=True),
        sa.Column("resource_id", sa.Text(), nullable=True),
        sa.Column("result", sa.Text(), nullable=False),
        jsonb_column("reasons", "'[]'::jsonb"),
        uuid_column("tested_by"),
        timestamp_column("created_at"),
    )
    op.create_index("ix_security_users_profile_tenant_auth", "security_users_profile", ["tenant_id", "auth_user_id"])
    op.create_index("ix_security_users_profile_status", "security_users_profile", ["tenant_id", "status"])
    op.create_index("ix_security_roles_tenant_key", "security_roles", ["tenant_id", "role_key"], unique=True, postgresql_where=sa.text("status <> 'deleted'"))
    op.create_index("ix_security_role_permissions_role", "security_role_permissions", ["tenant_id", "role_id"])
    op.create_index("ix_security_role_permissions_permission", "security_role_permissions", ["tenant_id", "permission_key"])
    op.create_index("ix_security_user_roles_user", "security_user_roles", ["tenant_id", "user_id"])
    op.create_index("ix_security_user_roles_role", "security_user_roles", ["tenant_id", "role_id"])
    op.create_index("ix_security_company_scopes_user", "security_user_company_scopes", ["tenant_id", "user_id"])
    op.create_index("ix_security_company_scopes_company", "security_user_company_scopes", ["tenant_id", "company_id"])
    op.create_index("ix_security_branch_scopes_user", "security_user_branch_scopes", ["tenant_id", "user_id"])
    op.create_index("ix_security_branch_scopes_branch", "security_user_branch_scopes", ["tenant_id", "branch_id"])
    op.create_index("ix_security_policy_test_logs_tenant_created", "security_policy_test_logs", ["tenant_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_security_policy_test_logs_tenant_created", table_name="security_policy_test_logs")
    op.drop_index("ix_security_branch_scopes_branch", table_name="security_user_branch_scopes")
    op.drop_index("ix_security_branch_scopes_user", table_name="security_user_branch_scopes")
    op.drop_index("ix_security_company_scopes_company", table_name="security_user_company_scopes")
    op.drop_index("ix_security_company_scopes_user", table_name="security_user_company_scopes")
    op.drop_index("ix_security_user_roles_role", table_name="security_user_roles")
    op.drop_index("ix_security_user_roles_user", table_name="security_user_roles")
    op.drop_index("ix_security_role_permissions_permission", table_name="security_role_permissions")
    op.drop_index("ix_security_role_permissions_role", table_name="security_role_permissions")
    op.drop_index("ix_security_roles_tenant_key", table_name="security_roles")
    op.drop_index("ix_security_users_profile_status", table_name="security_users_profile")
    op.drop_index("ix_security_users_profile_tenant_auth", table_name="security_users_profile")
    op.drop_table("security_policy_test_logs")
    op.drop_table("security_user_branch_scopes")
    op.drop_table("security_user_company_scopes")
    op.drop_table("security_user_roles")
    op.drop_table("security_role_permissions")
    op.drop_table("security_roles")
    op.drop_table("security_users_profile")
