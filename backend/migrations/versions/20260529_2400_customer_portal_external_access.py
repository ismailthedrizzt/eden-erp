"""customer portal external user access

Revision ID: 20260529_2400
Revises: 20260529_2390
Create Date: 2026-05-29
"""

# ruff: noqa: E501

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260529_2400"
down_revision: str | None = "20260529_2390"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def uuid_pk() -> sa.Column:
    return sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))


def uuid_column(name: str, *, nullable: bool = True) -> sa.Column:
    return sa.Column(name, postgresql.UUID(as_uuid=True), nullable=nullable)


def jsonb_column(name: str, default: str = "'{}'::jsonb") -> sa.Column:
    return sa.Column(name, postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text(default))


def timestamp_column(name: str, *, nullable: bool = False) -> sa.Column:
    return sa.Column(name, sa.DateTime(timezone=True), nullable=nullable, server_default=None if nullable else sa.text("now()"))


def upgrade() -> None:
    op.execute('create extension if not exists "pgcrypto"')
    op.create_table(
        "portal_external_users",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("auth_user_id", nullable=False),
        sa.Column("external_user_type", sa.Text(), nullable=False, server_default="customer"),
        uuid_column("stakeholder_id", nullable=False),
        uuid_column("customer_account_id"),
        uuid_column("master_person_id"),
        uuid_column("master_organization_id"),
        sa.Column("portal_role", sa.Text(), nullable=False, server_default="customer_user"),
        sa.Column("status", sa.Text(), nullable=False, server_default="invited"),
        uuid_column("invited_by"),
        timestamp_column("invited_at", nullable=True),
        timestamp_column("activated_at", nullable=True),
        timestamp_column("last_login_at", nullable=True),
        jsonb_column("access_scope_json"),
        jsonb_column("preferences_json"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
    )
    op.create_table(
        "portal_invitations",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("stakeholder_id", nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("portal_role", sa.Text(), nullable=False, server_default="customer_user"),
        sa.Column("status", sa.Text(), nullable=False, server_default="pending"),
        sa.Column("token_hash", sa.Text(), nullable=False),
        timestamp_column("expires_at"),
        uuid_column("invited_by"),
        timestamp_column("accepted_at", nullable=True),
        timestamp_column("created_at"),
    )
    op.create_table(
        "portal_shared_documents",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("document_id", nullable=False),
        uuid_column("stakeholder_id", nullable=False),
        sa.Column("shared_with_portal", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        uuid_column("shared_by"),
        timestamp_column("shared_at"),
        timestamp_column("expires_at", nullable=True),
        timestamp_column("created_at"),
    )
    op.create_table(
        "portal_activity_logs",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("portal_user_id", nullable=False),
        sa.Column("action_type", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=False),
        sa.Column("entity_id", sa.Text(), nullable=True),
        sa.Column("request_id", sa.Text(), nullable=True),
        timestamp_column("created_at"),
        jsonb_column("metadata_json"),
    )

    op.create_index("ix_portal_external_users_auth", "portal_external_users", ["tenant_id", "auth_user_id"], unique=True)
    op.create_index("ix_portal_external_users_stakeholder", "portal_external_users", ["tenant_id", "stakeholder_id"])
    op.create_index("ix_portal_external_users_account", "portal_external_users", ["tenant_id", "customer_account_id"])
    op.create_index("ix_portal_external_users_status", "portal_external_users", ["tenant_id", "status"])
    op.create_index("ix_portal_invitations_email", "portal_invitations", ["tenant_id", "email"])
    op.create_index("ix_portal_invitations_stakeholder", "portal_invitations", ["tenant_id", "stakeholder_id"])
    op.create_index("ix_portal_shared_documents_document", "portal_shared_documents", ["tenant_id", "document_id"])
    op.create_index("ix_portal_shared_documents_stakeholder", "portal_shared_documents", ["tenant_id", "stakeholder_id"])
    op.create_index("ix_portal_activity_user", "portal_activity_logs", ["tenant_id", "portal_user_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_portal_activity_user", table_name="portal_activity_logs")
    op.drop_index("ix_portal_shared_documents_stakeholder", table_name="portal_shared_documents")
    op.drop_index("ix_portal_shared_documents_document", table_name="portal_shared_documents")
    op.drop_index("ix_portal_invitations_stakeholder", table_name="portal_invitations")
    op.drop_index("ix_portal_invitations_email", table_name="portal_invitations")
    op.drop_index("ix_portal_external_users_status", table_name="portal_external_users")
    op.drop_index("ix_portal_external_users_account", table_name="portal_external_users")
    op.drop_index("ix_portal_external_users_stakeholder", table_name="portal_external_users")
    op.drop_index("ix_portal_external_users_auth", table_name="portal_external_users")
    op.drop_table("portal_activity_logs")
    op.drop_table("portal_shared_documents")
    op.drop_table("portal_invitations")
    op.drop_table("portal_external_users")
