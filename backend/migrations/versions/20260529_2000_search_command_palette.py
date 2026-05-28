# ruff: noqa: E501

"""search command palette foundation

Revision ID: 20260529_2000
Revises: 20260529_1900
Create Date: 2026-05-29
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260529_2000"
down_revision: str | None = "20260529_1900"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def uuid_pk() -> sa.Column:
    return sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))


def uuid_column(name: str, *, nullable: bool = True) -> sa.Column:
    return sa.Column(name, postgresql.UUID(as_uuid=True), nullable=nullable)


def timestamp_column(name: str) -> sa.Column:
    return sa.Column(name, sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"))


def upgrade() -> None:
    op.execute('create extension if not exists "pgcrypto"')
    op.create_table(
        "user_recent_items",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("user_id", nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=False),
        sa.Column("entity_id", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("target_page", sa.Text(), nullable=False),
        sa.Column("module_key", sa.Text(), nullable=False),
        sa.Column("last_opened_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("open_count", sa.Integer(), nullable=False, server_default="1"),
        timestamp_column("created_at"),
    )
    op.create_index("ix_user_recent_items_user_last_opened", "user_recent_items", ["tenant_id", "user_id", "last_opened_at"])
    op.create_index("ix_user_recent_items_entity", "user_recent_items", ["tenant_id", "entity_type", "entity_id"])
    op.create_index("uq_user_recent_items_user_entity", "user_recent_items", ["tenant_id", "user_id", "entity_type", "entity_id"], unique=True)


def downgrade() -> None:
    op.drop_index("uq_user_recent_items_user_entity", table_name="user_recent_items")
    op.drop_index("ix_user_recent_items_entity", table_name="user_recent_items")
    op.drop_index("ix_user_recent_items_user_last_opened", table_name="user_recent_items")
    op.drop_table("user_recent_items")
