# ruff: noqa: E501

"""company representative audit columns

Revision ID: 20260608_0300
Revises: 20260608_0200
Create Date: 2026-06-08
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "20260608_0300"
down_revision: str | None = "20260608_0200"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        alter table public.company_representatives
            add column if not exists created_by uuid,
            add column if not exists updated_by uuid;
        """
    )


def downgrade() -> None:
    raise RuntimeError(
        "company_representatives audit columns are production data columns and are not safely downgradable."
    )
