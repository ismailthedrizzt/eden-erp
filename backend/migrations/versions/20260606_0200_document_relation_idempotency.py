# ruff: noqa: E501

"""document relation idempotency

Revision ID: 20260606_0200
Revises: 20260606_0100
Create Date: 2026-06-06
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "20260606_0200"
down_revision: str | None = "20260606_0100"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        delete from public.document_relations r
        using public.document_relations keep
        where r.tenant_id = keep.tenant_id
          and r.document_id = keep.document_id
          and r.entity_type = keep.entity_type
          and r.entity_id = keep.entity_id
          and r.relation_type = keep.relation_type
          and coalesce(r.operation_id, '') = coalesce(keep.operation_id, '')
          and coalesce(r.document_slot_key, '') = coalesce(keep.document_slot_key, '')
          and keep.created_at <= r.created_at
          and keep.ctid < r.ctid
        """
    )
    op.execute(
        """
        create unique index if not exists uq_document_relations_context_idempotent
        on public.document_relations (
          tenant_id,
          document_id,
          entity_type,
          entity_id,
          relation_type,
          coalesce(operation_id, ''),
          coalesce(document_slot_key, '')
        )
        """
    )


def downgrade() -> None:
    op.execute("drop index if exists public.uq_document_relations_context_idempotent")
