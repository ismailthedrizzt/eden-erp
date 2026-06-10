"""finalize linear persistence migration head

Revision ID: 20260610_0120
Revises: 20260610_0100
Create Date: 2026-06-10
"""

from __future__ import annotations

from collections.abc import Sequence

revision: str = "20260610_0120"
down_revision: str | None = "20260610_0100"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    raise RuntimeError("Persistence migration head is not safely downgradable.")
