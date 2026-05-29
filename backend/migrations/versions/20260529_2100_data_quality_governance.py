# ruff: noqa: E501

"""data quality duplicate merge governance

Revision ID: 20260529_2100
Revises: 20260529_2000
Create Date: 2026-05-29
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260529_2100"
down_revision: str | None = "20260529_2000"
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


def upgrade() -> None:
    op.execute('create extension if not exists "pgcrypto"')
    op.create_table(
        "data_quality_rules",
        uuid_pk(),
        uuid_column("tenant_id"),
        sa.Column("rule_key", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=False),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("severity", sa.Text(), nullable=False, server_default="warning"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        jsonb_column("config_json", "'{}'::jsonb"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
    )
    op.create_table(
        "data_quality_scores",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=False),
        sa.Column("entity_id", sa.Text(), nullable=False),
        sa.Column("score", sa.Numeric(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        jsonb_column("missing_fields", "'[]'::jsonb"),
        jsonb_column("duplicate_risk", "'{}'::jsonb"),
        jsonb_column("relation_warnings", "'[]'::jsonb"),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
    )
    op.create_table(
        "duplicate_candidate_groups",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=False),
        sa.Column("duplicate_group_key", sa.Text(), nullable=False),
        sa.Column("match_score", sa.Numeric(), nullable=False),
        sa.Column("match_reason", sa.Text(), nullable=False),
        sa.Column("severity", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="open"),
        sa.Column("suggested_master_id", sa.Text(), nullable=True),
        uuid_column("reviewed_by"),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolution_notes", sa.Text(), nullable=True),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
    )
    op.create_table(
        "duplicate_candidate_items",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("group_id", nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=False),
        sa.Column("entity_id", sa.Text(), nullable=False),
        sa.Column("display_name", sa.Text(), nullable=False),
        jsonb_column("match_fields", "'{}'::jsonb"),
        sa.Column("is_suggested_master", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        timestamp_column("created_at"),
    )
    op.create_table(
        "merge_operations",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=False),
        jsonb_column("source_entity_ids", "'[]'::jsonb"),
        sa.Column("target_entity_id", sa.Text(), nullable=False),
        jsonb_column("merge_strategy", "'{}'::jsonb"),
        sa.Column("status", sa.Text(), nullable=False, server_default="preview"),
        jsonb_column("impact_summary", "'{}'::jsonb"),
        jsonb_column("result_json", "'{}'::jsonb"),
        uuid_column("created_by"),
        uuid_column("confirmed_by"),
        timestamp_column("created_at"),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        "merge_operation_relations",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("merge_operation_id", nullable=False),
        sa.Column("relation_entity_type", sa.Text(), nullable=False),
        sa.Column("relation_entity_id", sa.Text(), nullable=True),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="preview"),
        sa.Column("notes", sa.Text(), nullable=True),
        timestamp_column("created_at"),
    )
    op.create_table(
        "data_quality_findings",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=False),
        sa.Column("entity_id", sa.Text(), nullable=False),
        sa.Column("rule_key", sa.Text(), nullable=False),
        sa.Column("severity", sa.Text(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="open"),
        jsonb_column("suggested_action", "'{}'::jsonb"),
        timestamp_column("created_at"),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_index("uq_data_quality_rules_tenant_rule", "data_quality_rules", ["tenant_id", "rule_key"], unique=True)
    op.create_index("uq_data_quality_scores_entity", "data_quality_scores", ["tenant_id", "entity_type", "entity_id"], unique=True)
    op.create_index("ix_data_quality_scores_status", "data_quality_scores", ["tenant_id", "status"])
    op.create_index("ix_data_quality_scores_checked", "data_quality_scores", ["tenant_id", "last_checked_at"])
    op.create_index("uq_duplicate_candidate_groups_group_key", "duplicate_candidate_groups", ["tenant_id", "duplicate_group_key"], unique=True)
    op.create_index("ix_duplicate_candidate_groups_status", "duplicate_candidate_groups", ["tenant_id", "status", "severity"])
    op.create_index("ix_duplicate_candidate_groups_entity", "duplicate_candidate_groups", ["tenant_id", "entity_type"])
    op.create_index("ix_duplicate_candidate_groups_score", "duplicate_candidate_groups", ["tenant_id", "match_score"])
    op.create_index("ix_duplicate_candidate_items_group", "duplicate_candidate_items", ["tenant_id", "group_id"])
    op.create_index("ix_duplicate_candidate_items_entity", "duplicate_candidate_items", ["tenant_id", "entity_type", "entity_id"])
    op.create_index("ix_merge_operations_status", "merge_operations", ["tenant_id", "status", "created_at"])
    op.create_index("ix_merge_operations_entity", "merge_operations", ["tenant_id", "entity_type", "target_entity_id"])
    op.create_index("ix_merge_operation_relations_operation", "merge_operation_relations", ["tenant_id", "merge_operation_id"])
    op.create_index("uq_data_quality_findings_entity_rule", "data_quality_findings", ["tenant_id", "entity_type", "entity_id", "rule_key"], unique=True)
    op.create_index("ix_data_quality_findings_status", "data_quality_findings", ["tenant_id", "status", "severity"])
    op.create_index("ix_data_quality_findings_rule", "data_quality_findings", ["tenant_id", "rule_key"])
    op.create_index("ix_data_quality_findings_created", "data_quality_findings", ["tenant_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_data_quality_findings_created", table_name="data_quality_findings")
    op.drop_index("ix_data_quality_findings_rule", table_name="data_quality_findings")
    op.drop_index("ix_data_quality_findings_status", table_name="data_quality_findings")
    op.drop_index("uq_data_quality_findings_entity_rule", table_name="data_quality_findings")
    op.drop_index("ix_merge_operation_relations_operation", table_name="merge_operation_relations")
    op.drop_index("ix_merge_operations_entity", table_name="merge_operations")
    op.drop_index("ix_merge_operations_status", table_name="merge_operations")
    op.drop_index("ix_duplicate_candidate_items_entity", table_name="duplicate_candidate_items")
    op.drop_index("ix_duplicate_candidate_items_group", table_name="duplicate_candidate_items")
    op.drop_index("ix_duplicate_candidate_groups_score", table_name="duplicate_candidate_groups")
    op.drop_index("ix_duplicate_candidate_groups_entity", table_name="duplicate_candidate_groups")
    op.drop_index("ix_duplicate_candidate_groups_status", table_name="duplicate_candidate_groups")
    op.drop_index("uq_duplicate_candidate_groups_group_key", table_name="duplicate_candidate_groups")
    op.drop_index("ix_data_quality_scores_checked", table_name="data_quality_scores")
    op.drop_index("ix_data_quality_scores_status", table_name="data_quality_scores")
    op.drop_index("uq_data_quality_scores_entity", table_name="data_quality_scores")
    op.drop_index("uq_data_quality_rules_tenant_rule", table_name="data_quality_rules")
    op.drop_table("data_quality_findings")
    op.drop_table("merge_operation_relations")
    op.drop_table("merge_operations")
    op.drop_table("duplicate_candidate_items")
    op.drop_table("duplicate_candidate_groups")
    op.drop_table("data_quality_scores")
    op.drop_table("data_quality_rules")
