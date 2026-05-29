# ruff: noqa: E501

"""admin console system settings

Revision ID: 20260529_2200
Revises: 20260529_2100
Create Date: 2026-05-29
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260529_2200"
down_revision: str | None = "20260529_2100"
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
        "workspace_settings",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        sa.Column("workspace_name", sa.Text(), nullable=False),
        sa.Column("country", sa.Text(), nullable=False, server_default="TR"),
        sa.Column("default_language", sa.Text(), nullable=False, server_default="tr"),
        sa.Column("default_currency", sa.Text(), nullable=False, server_default="TRY"),
        sa.Column("timezone", sa.Text(), nullable=False, server_default="Europe/Istanbul"),
        sa.Column("date_format", sa.Text(), nullable=False, server_default="dd.MM.yyyy"),
        sa.Column("number_format", sa.Text(), nullable=False, server_default="tr-TR"),
        uuid_column("logo_document_id"),
        sa.Column("onboarding_version", sa.Text(), nullable=False, server_default="1"),
        jsonb_column("metadata_json", "'{}'::jsonb"),
        uuid_column("updated_by"),
        timestamp_column("updated_at"),
        sa.UniqueConstraint("tenant_id", name="uq_workspace_settings_tenant"),
    )
    op.create_table(
        "admin_settings",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        sa.Column("settings_key", sa.Text(), nullable=False),
        jsonb_column("settings_json", "'{}'::jsonb"),
        uuid_column("updated_by"),
        timestamp_column("updated_at"),
        sa.UniqueConstraint("tenant_id", "settings_key", name="uq_admin_settings_tenant_key"),
    )
    op.create_table(
        "feature_flag_overrides",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        sa.Column("feature_key", sa.Text(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        uuid_column("updated_by"),
        timestamp_column("updated_at"),
        sa.UniqueConstraint("tenant_id", "feature_key", name="uq_feature_flag_overrides_tenant_key"),
    )
    op.create_table(
        "integration_status_cache",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        sa.Column("integration_key", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
        jsonb_column("details_json", "'{}'::jsonb"),
        timestamp_column("updated_at"),
        sa.UniqueConstraint("tenant_id", "integration_key", name="uq_integration_status_tenant_key"),
    )
    op.create_table(
        "worker_heartbeats",
        uuid_pk(),
        sa.Column("worker_id", sa.Text(), nullable=False),
        sa.Column("worker_type", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        jsonb_column("metadata_json", "'{}'::jsonb"),
    )
    op.create_index("ix_workspace_settings_tenant", "workspace_settings", ["tenant_id"])
    op.create_index("ix_admin_settings_tenant_key", "admin_settings", ["tenant_id", "settings_key"])
    op.create_index("ix_feature_flag_overrides_tenant_key", "feature_flag_overrides", ["tenant_id", "feature_key"])
    op.create_index("ix_integration_status_tenant_key", "integration_status_cache", ["tenant_id", "integration_key"])
    op.create_index("ix_worker_heartbeats_type_seen", "worker_heartbeats", ["worker_type", "last_seen_at"])


def downgrade() -> None:
    op.drop_index("ix_worker_heartbeats_type_seen", table_name="worker_heartbeats")
    op.drop_index("ix_integration_status_tenant_key", table_name="integration_status_cache")
    op.drop_index("ix_feature_flag_overrides_tenant_key", table_name="feature_flag_overrides")
    op.drop_index("ix_admin_settings_tenant_key", table_name="admin_settings")
    op.drop_index("ix_workspace_settings_tenant", table_name="workspace_settings")
    op.drop_table("worker_heartbeats")
    op.drop_table("integration_status_cache")
    op.drop_table("feature_flag_overrides")
    op.drop_table("admin_settings")
    op.drop_table("workspace_settings")

