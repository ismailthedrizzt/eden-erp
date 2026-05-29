"""workflow automation rule engine

Revision ID: 20260529_2380
Revises: 20260529_2370
Create Date: 2026-05-29
"""

# ruff: noqa: E501

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260529_2380"
down_revision: str | None = "20260529_2370"
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
        "automation_rules",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        sa.Column("rule_key", sa.Text(), nullable=False),
        sa.Column("rule_name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("module_key", sa.Text(), nullable=False),
        sa.Column("trigger_type", sa.Text(), nullable=False),
        jsonb_column("trigger_config"),
        jsonb_column("condition_config"),
        jsonb_column("action_config"),
        sa.Column("status", sa.Text(), nullable=False, server_default="draft"),
        sa.Column("priority", sa.Text(), nullable=False, server_default="normal"),
        sa.Column("run_mode", sa.Text(), nullable=False, server_default="async_worker"),
        sa.Column("max_runs_per_day", sa.Integer(), nullable=True),
        sa.Column("cooldown_minutes", sa.Integer(), nullable=True),
        timestamp_column("last_run_at", nullable=True),
        timestamp_column("next_run_at", nullable=True),
        sa.Column("run_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failure_count", sa.Integer(), nullable=False, server_default="0"),
        uuid_column("created_by", nullable=False),
        uuid_column("updated_by"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_table(
        "automation_rule_runs",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("rule_id", nullable=False),
        sa.Column("trigger_type", sa.Text(), nullable=False),
        uuid_column("trigger_event_id"),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("matched_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("actions_created_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("skipped_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failure_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text(), nullable=True),
        timestamp_column("started_at"),
        timestamp_column("completed_at", nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        jsonb_column("metadata_json"),
    )
    op.create_table(
        "automation_rule_templates",
        uuid_pk(),
        uuid_column("tenant_id"),
        sa.Column("template_key", sa.Text(), nullable=False),
        sa.Column("template_name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("module_key", sa.Text(), nullable=False),
        jsonb_column("trigger_config"),
        jsonb_column("condition_config"),
        jsonb_column("action_config"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.create_table(
        "automation_action_results",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("run_id", nullable=False),
        uuid_column("rule_id", nullable=False),
        sa.Column("action_type", sa.Text(), nullable=False),
        sa.Column("target_entity_type", sa.Text(), nullable=True),
        sa.Column("target_entity_id", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        jsonb_column("result_json"),
        sa.Column("error_message", sa.Text(), nullable=True),
        timestamp_column("created_at"),
    )

    op.create_index("ix_automation_rules_status", "automation_rules", ["tenant_id", "status"])
    op.create_index("ix_automation_rules_module", "automation_rules", ["tenant_id", "module_key"])
    op.create_index("ix_automation_rules_trigger", "automation_rules", ["tenant_id", "trigger_type"])
    op.create_index("ix_automation_rules_next_run", "automation_rules", ["tenant_id", "next_run_at"])
    op.create_index("ix_automation_rules_key", "automation_rules", ["tenant_id", "rule_key"], unique=True)
    op.create_index("ix_automation_rule_runs_rule_started", "automation_rule_runs", ["tenant_id", "rule_id", "started_at"])
    op.create_index("ix_automation_rule_templates_key", "automation_rule_templates", ["tenant_id", "template_key"])
    op.create_index("ix_automation_action_results_run", "automation_action_results", ["tenant_id", "run_id"])


def downgrade() -> None:
    op.drop_index("ix_automation_action_results_run", table_name="automation_action_results")
    op.drop_index("ix_automation_rule_templates_key", table_name="automation_rule_templates")
    op.drop_index("ix_automation_rule_runs_rule_started", table_name="automation_rule_runs")
    op.drop_index("ix_automation_rules_key", table_name="automation_rules")
    op.drop_index("ix_automation_rules_next_run", table_name="automation_rules")
    op.drop_index("ix_automation_rules_trigger", table_name="automation_rules")
    op.drop_index("ix_automation_rules_module", table_name="automation_rules")
    op.drop_index("ix_automation_rules_status", table_name="automation_rules")
    op.drop_table("automation_action_results")
    op.drop_table("automation_rule_templates")
    op.drop_table("automation_rule_runs")
    op.drop_table("automation_rules")
