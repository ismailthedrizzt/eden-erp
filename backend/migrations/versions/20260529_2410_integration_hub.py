"""integration hub webhooks and external api mvp

Revision ID: 20260529_2410
Revises: 20260529_2400
Create Date: 2026-05-29
"""

# ruff: noqa: E501

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260529_2410"
down_revision: str | None = "20260529_2400"
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
        "integration_apps",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        sa.Column("app_key", sa.Text(), nullable=False),
        sa.Column("app_name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("app_type", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="draft"),
        uuid_column("owner_user_id"),
        jsonb_column("allowed_scopes"),
        jsonb_column("allowed_event_types", "'[]'::jsonb"),
        jsonb_column("allowed_inbound_events", "'[]'::jsonb"),
        sa.Column("rate_limit_per_minute", sa.Integer(), nullable=True),
        jsonb_column("ip_allowlist", "'[]'::jsonb"),
        jsonb_column("metadata_json"),
        uuid_column("created_by"),
        uuid_column("updated_by"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_table(
        "integration_credentials",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("integration_app_id", nullable=False),
        sa.Column("credential_type", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("secret_hash", sa.Text(), nullable=False),
        sa.Column("secret_preview", sa.Text(), nullable=False),
        timestamp_column("expires_at", nullable=True),
        timestamp_column("last_used_at", nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="active"),
        uuid_column("created_by"),
        timestamp_column("created_at"),
        uuid_column("revoked_by"),
        timestamp_column("revoked_at", nullable=True),
    )
    op.create_table(
        "integration_webhook_subscriptions",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("integration_app_id", nullable=False),
        sa.Column("subscription_name", sa.Text(), nullable=False),
        sa.Column("target_url", sa.Text(), nullable=False),
        jsonb_column("event_types", "'[]'::jsonb"),
        sa.Column("status", sa.Text(), nullable=False, server_default="active"),
        uuid_column("signing_secret_id"),
        jsonb_column("headers_json"),
        jsonb_column("retry_policy_json"),
        jsonb_column("filter_config_json"),
        timestamp_column("last_delivery_at", nullable=True),
        timestamp_column("last_success_at", nullable=True),
        timestamp_column("last_failure_at", nullable=True),
        sa.Column("failure_count", sa.Integer(), nullable=False, server_default="0"),
        uuid_column("created_by"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
    )
    op.create_table(
        "integration_webhook_deliveries",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("subscription_id", nullable=False),
        uuid_column("integration_app_id", nullable=False),
        uuid_column("outbox_event_id"),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("event_id", sa.Text(), nullable=False),
        sa.Column("target_url", sa.Text(), nullable=False),
        jsonb_column("payload_json"),
        jsonb_column("headers_json"),
        sa.Column("status", sa.Text(), nullable=False, server_default="pending"),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        timestamp_column("next_attempt_at", nullable=True),
        timestamp_column("last_attempt_at", nullable=True),
        sa.Column("response_status_code", sa.Integer(), nullable=True),
        sa.Column("response_body_excerpt", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        timestamp_column("created_at"),
        timestamp_column("delivered_at", nullable=True),
    )
    op.create_table(
        "integration_inbound_events",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("integration_app_id", nullable=False),
        sa.Column("inbound_event_type", sa.Text(), nullable=False),
        sa.Column("source_event_id", sa.Text(), nullable=True),
        timestamp_column("received_at"),
        sa.Column("signature_valid", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("status", sa.Text(), nullable=False, server_default="received"),
        jsonb_column("payload_json"),
        jsonb_column("normalized_payload_json"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("related_entity_type", sa.Text(), nullable=True),
        sa.Column("related_entity_id", sa.Text(), nullable=True),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
    )
    op.create_table(
        "integration_event_subscriptions",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("integration_app_id", nullable=False),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="active"),
        jsonb_column("filter_config_json"),
        uuid_column("created_by"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
    )

    op.create_index("ix_integration_apps_app_key", "integration_apps", ["tenant_id", "app_key"], unique=True)
    op.create_index("ix_integration_apps_status", "integration_apps", ["tenant_id", "status"])
    op.create_index("ix_integration_apps_type", "integration_apps", ["tenant_id", "app_type"])
    op.create_index("ix_integration_credentials_app", "integration_credentials", ["tenant_id", "integration_app_id"])
    op.create_index("ix_integration_credentials_status", "integration_credentials", ["tenant_id", "status"])
    op.create_index("ix_integration_subscriptions_app", "integration_webhook_subscriptions", ["tenant_id", "integration_app_id"])
    op.create_index("ix_integration_subscriptions_status", "integration_webhook_subscriptions", ["tenant_id", "status"])
    op.create_index("ix_integration_deliveries_status_next", "integration_webhook_deliveries", ["tenant_id", "status", "next_attempt_at"])
    op.create_index("ix_integration_deliveries_event", "integration_webhook_deliveries", ["tenant_id", "event_type"])
    op.create_index("ix_integration_deliveries_outbox", "integration_webhook_deliveries", ["tenant_id", "outbox_event_id"])
    op.create_index("ix_integration_deliveries_created", "integration_webhook_deliveries", ["tenant_id", "created_at"])
    op.create_index("ix_integration_inbound_source", "integration_inbound_events", ["tenant_id", "source_event_id"])
    op.create_index("ix_integration_inbound_status", "integration_inbound_events", ["tenant_id", "status"])
    op.create_index("ix_integration_inbound_created", "integration_inbound_events", ["tenant_id", "created_at"])
    op.create_index("ix_integration_event_subscriptions_event", "integration_event_subscriptions", ["tenant_id", "event_type"])


def downgrade() -> None:
    op.drop_index("ix_integration_event_subscriptions_event", table_name="integration_event_subscriptions")
    op.drop_index("ix_integration_inbound_created", table_name="integration_inbound_events")
    op.drop_index("ix_integration_inbound_status", table_name="integration_inbound_events")
    op.drop_index("ix_integration_inbound_source", table_name="integration_inbound_events")
    op.drop_index("ix_integration_deliveries_created", table_name="integration_webhook_deliveries")
    op.drop_index("ix_integration_deliveries_outbox", table_name="integration_webhook_deliveries")
    op.drop_index("ix_integration_deliveries_event", table_name="integration_webhook_deliveries")
    op.drop_index("ix_integration_deliveries_status_next", table_name="integration_webhook_deliveries")
    op.drop_index("ix_integration_subscriptions_status", table_name="integration_webhook_subscriptions")
    op.drop_index("ix_integration_subscriptions_app", table_name="integration_webhook_subscriptions")
    op.drop_index("ix_integration_credentials_status", table_name="integration_credentials")
    op.drop_index("ix_integration_credentials_app", table_name="integration_credentials")
    op.drop_index("ix_integration_apps_type", table_name="integration_apps")
    op.drop_index("ix_integration_apps_status", table_name="integration_apps")
    op.drop_index("ix_integration_apps_app_key", table_name="integration_apps")
    op.drop_table("integration_event_subscriptions")
    op.drop_table("integration_inbound_events")
    op.drop_table("integration_webhook_deliveries")
    op.drop_table("integration_webhook_subscriptions")
    op.drop_table("integration_credentials")
    op.drop_table("integration_apps")
