"""ai assistance contextual copilot

Revision ID: 20260529_2390
Revises: 20260529_2380
Create Date: 2026-05-29
"""

# ruff: noqa: E501

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260529_2390"
down_revision: str | None = "20260529_2380"
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
        "ai_copilot_history",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("user_id"),
        sa.Column("mode", sa.Text(), nullable=False),
        sa.Column("module_key", sa.Text(), nullable=True),
        sa.Column("current_page", sa.Text(), nullable=True),
        sa.Column("selected_entity_type", sa.Text(), nullable=True),
        sa.Column("selected_entity_id", sa.Text(), nullable=True),
        sa.Column("selected_record_label", sa.Text(), nullable=True),
        sa.Column("selected_record_status", sa.Text(), nullable=True),
        sa.Column("query_text", sa.Text(), nullable=True),
        jsonb_column("context_summary_json"),
        jsonb_column("response_json"),
        sa.Column("action_key", sa.Text(), nullable=True),
        sa.Column("provider", sa.Text(), nullable=False, server_default="local_rule"),
        sa.Column("safety_status", sa.Text(), nullable=False, server_default="allowed"),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        timestamp_column("created_at"),
    )
    op.create_table(
        "ai_copilot_feedback",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("user_id"),
        uuid_column("history_id"),
        sa.Column("rating", sa.Text(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        jsonb_column("metadata_json"),
        timestamp_column("created_at"),
    )
    op.create_table(
        "ai_document_intelligence_results",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("document_id"),
        sa.Column("entity_type", sa.Text(), nullable=True),
        sa.Column("entity_id", sa.Text(), nullable=True),
        sa.Column("document_type_suggestion", sa.Text(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        jsonb_column("findings_json", "'[]'::jsonb"),
        sa.Column("provider", sa.Text(), nullable=False, server_default="local_rule"),
        sa.Column("confidence", sa.Numeric(5, 2), nullable=True),
        sa.Column("requires_human_verification", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        uuid_column("created_by"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
    )

    op.create_index("ix_ai_copilot_history_user", "ai_copilot_history", ["tenant_id", "user_id", "created_at"])
    op.create_index("ix_ai_copilot_history_module", "ai_copilot_history", ["tenant_id", "module_key", "created_at"])
    op.create_index("ix_ai_copilot_history_entity", "ai_copilot_history", ["tenant_id", "selected_entity_type", "selected_entity_id"])
    op.create_index("ix_ai_copilot_history_action", "ai_copilot_history", ["tenant_id", "action_key", "created_at"])
    op.create_index("ix_ai_copilot_feedback_history", "ai_copilot_feedback", ["tenant_id", "history_id"])
    op.create_index("ix_ai_document_intelligence_document", "ai_document_intelligence_results", ["tenant_id", "document_id"])
    op.create_index("ix_ai_document_intelligence_entity", "ai_document_intelligence_results", ["tenant_id", "entity_type", "entity_id"])


def downgrade() -> None:
    op.drop_index("ix_ai_document_intelligence_entity", table_name="ai_document_intelligence_results")
    op.drop_index("ix_ai_document_intelligence_document", table_name="ai_document_intelligence_results")
    op.drop_index("ix_ai_copilot_feedback_history", table_name="ai_copilot_feedback")
    op.drop_index("ix_ai_copilot_history_action", table_name="ai_copilot_history")
    op.drop_index("ix_ai_copilot_history_entity", table_name="ai_copilot_history")
    op.drop_index("ix_ai_copilot_history_module", table_name="ai_copilot_history")
    op.drop_index("ix_ai_copilot_history_user", table_name="ai_copilot_history")
    op.drop_table("ai_document_intelligence_results")
    op.drop_table("ai_copilot_feedback")
    op.drop_table("ai_copilot_history")
