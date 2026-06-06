# ruff: noqa: E501

"""document file deduplication

Revision ID: 20260606_0100
Revises: 20260529_2410
Create Date: 2026-06-06
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260606_0100"
down_revision: str | None = "20260529_2410"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def uuid_pk() -> sa.Column:
    return sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))


def uuid_column(name: str, *, nullable: bool = True) -> sa.Column:
    return sa.Column(name, postgresql.UUID(as_uuid=True), nullable=nullable)


def upgrade() -> None:
    op.execute('create extension if not exists "pgcrypto"')
    op.create_table(
        "document_files",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        sa.Column("checksum", sa.Text(), nullable=True),
        sa.Column("original_file_name", sa.Text(), nullable=False),
        sa.Column("file_extension", sa.Text(), nullable=True),
        sa.Column("mime_type", sa.Text(), nullable=False),
        sa.Column("file_size", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("storage_bucket", sa.Text(), nullable=False),
        sa.Column("storage_path", sa.Text(), nullable=False),
        sa.Column("storage_provider", sa.Text(), nullable=False, server_default="local"),
        uuid_column("created_by"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column("documents", uuid_column("document_file_id"))
    op.add_column("document_relations", uuid_column("document_file_id"))
    op.add_column("document_relations", sa.Column("operation_type", sa.Text(), nullable=True))
    op.add_column("document_relations", sa.Column("operation_id", sa.Text(), nullable=True))
    op.add_column("document_relations", sa.Column("module_key", sa.Text(), nullable=True))
    op.add_column("document_relations", sa.Column("document_slot_key", sa.Text(), nullable=True))
    op.add_column("document_relations", uuid_column("created_by"))
    op.add_column("document_relations", sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")))
    op.execute(
        """
        insert into public.document_files (
          id, tenant_id, checksum, original_file_name, file_extension, mime_type,
          file_size, storage_bucket, storage_path, storage_provider, created_by,
          created_at, metadata_json, is_deleted
        )
        select
          gen_random_uuid(), d.tenant_id, d.checksum, min(d.file_name), min(d.file_extension),
          min(d.mime_type), max(d.file_size), min(d.storage_bucket), min(d.storage_path),
          coalesce(min(d.storage_provider), 'local'), nullif(min(d.uploaded_by::text), '')::uuid, min(d.created_at),
          jsonb_build_object('backfilled_from_documents', true), false
        from public.documents d
        where d.checksum is not null
          and coalesce(d.is_deleted, false) = false
        group by d.tenant_id, d.checksum
        """
    )
    op.execute(
        """
        update public.documents d
        set document_file_id = f.id
        from public.document_files f
        where f.tenant_id = d.tenant_id
          and f.checksum = d.checksum
          and d.checksum is not null
          and coalesce(f.is_deleted, false) = false
        """
    )
    op.execute(
        """
        update public.document_relations r
        set document_file_id = d.document_file_id
        from public.documents d
        where d.tenant_id = r.tenant_id
          and d.id = r.document_id
        """
    )
    op.create_index("ix_document_files_tenant_checksum", "document_files", ["tenant_id", "checksum"])
    op.create_index("ix_document_files_tenant_created", "document_files", ["tenant_id", "created_at"])
    op.create_index("ix_documents_tenant_document_file", "documents", ["tenant_id", "document_file_id"])
    op.create_index("ix_document_relations_tenant_file", "document_relations", ["tenant_id", "document_file_id"])
    op.create_index("ix_document_relations_tenant_operation", "document_relations", ["tenant_id", "operation_type", "operation_id"])
    op.create_index(
        "uq_document_files_tenant_checksum_active",
        "document_files",
        ["tenant_id", "checksum"],
        unique=True,
        postgresql_where=sa.text("checksum is not null and coalesce(is_deleted, false) = false"),
    )


def downgrade() -> None:
    op.drop_index("uq_document_files_tenant_checksum_active", table_name="document_files")
    op.drop_index("ix_document_relations_tenant_operation", table_name="document_relations")
    op.drop_index("ix_document_relations_tenant_file", table_name="document_relations")
    op.drop_index("ix_documents_tenant_document_file", table_name="documents")
    op.drop_index("ix_document_files_tenant_created", table_name="document_files")
    op.drop_index("ix_document_files_tenant_checksum", table_name="document_files")
    op.drop_column("document_relations", "metadata_json")
    op.drop_column("document_relations", "created_by")
    op.drop_column("document_relations", "document_slot_key")
    op.drop_column("document_relations", "module_key")
    op.drop_column("document_relations", "operation_id")
    op.drop_column("document_relations", "operation_type")
    op.drop_column("document_relations", "document_file_id")
    op.drop_column("documents", "document_file_id")
    op.drop_table("document_files")
