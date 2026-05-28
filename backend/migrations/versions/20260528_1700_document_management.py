# ruff: noqa: E501

"""document management foundation

Revision ID: 20260528_1700
Revises: 20260528_1600
Create Date: 2026-05-28
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260528_1700"
down_revision: str | None = "20260528_1600"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def uuid_pk() -> sa.Column:
    return sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))


def uuid_column(name: str, *, nullable: bool = True) -> sa.Column:
    return sa.Column(name, postgresql.UUID(as_uuid=True), nullable=nullable)


def timestamp_column(name: str, *, nullable: bool = False) -> sa.Column:
    return sa.Column(name, sa.DateTime(timezone=True), nullable=nullable, server_default=sa.text("now()") if not nullable else None)


def jsonb_column(name: str, default: str = "'{}'::jsonb", *, nullable: bool = False) -> sa.Column:
    return sa.Column(name, postgresql.JSONB(astext_type=sa.Text()), nullable=nullable, server_default=sa.text(default) if not nullable else None)


def upgrade() -> None:
    op.execute('create extension if not exists "pgcrypto"')
    op.create_table(
        "documents",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id"),
        uuid_column("branch_id"),
        sa.Column("owner_entity_type", sa.Text(), nullable=False),
        sa.Column("owner_entity_id", sa.Text(), nullable=False),
        sa.Column("document_type", sa.Text(), nullable=False),
        sa.Column("document_category", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("file_name", sa.Text(), nullable=False),
        sa.Column("file_extension", sa.Text(), nullable=True),
        sa.Column("mime_type", sa.Text(), nullable=False),
        sa.Column("file_size", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("storage_bucket", sa.Text(), nullable=False),
        sa.Column("storage_path", sa.Text(), nullable=False),
        sa.Column("storage_provider", sa.Text(), nullable=False, server_default="supabase"),
        sa.Column("checksum", sa.Text(), nullable=True),
        sa.Column("version_no", sa.Integer(), nullable=False, server_default="1"),
        uuid_column("parent_document_id"),
        sa.Column("status", sa.Text(), nullable=False, server_default="uploaded"),
        sa.Column("verification_status", sa.Text(), nullable=False, server_default="not_required"),
        sa.Column("required", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("issue_date", sa.Date(), nullable=True),
        sa.Column("expiry_date", sa.Date(), nullable=True),
        uuid_column("uploaded_by"),
        uuid_column("verified_by"),
        timestamp_column("verified_at", nullable=True),
        sa.Column("rejected_reason", sa.Text(), nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.Text()), nullable=False, server_default=sa.text("'{}'::text[]")),
        jsonb_column("metadata_json"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_table(
        "document_relations",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("document_id", nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=False),
        sa.Column("entity_id", sa.Text(), nullable=False),
        sa.Column("relation_type", sa.Text(), nullable=False),
        timestamp_column("created_at"),
    )
    op.create_table(
        "document_access_logs",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("document_id", nullable=False),
        sa.Column("action_type", sa.Text(), nullable=False),
        uuid_column("user_id"),
        sa.Column("request_id", sa.Text(), nullable=True),
        timestamp_column("created_at"),
    )
    op.create_table(
        "document_requirements",
        uuid_pk(),
        uuid_column("tenant_id"),
        sa.Column("module_key", sa.Text(), nullable=False),
        sa.Column("operation_key", sa.Text(), nullable=True),
        sa.Column("entity_type", sa.Text(), nullable=False),
        sa.Column("document_type", sa.Text(), nullable=False),
        sa.Column("required", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        jsonb_column("condition_json"),
        sa.Column("accepted_file_types", postgresql.ARRAY(sa.Text()), nullable=False, server_default=sa.text("'{}'::text[]")),
        sa.Column("max_file_size", sa.BigInteger(), nullable=True),
        sa.Column("expiry_required", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("verification_required", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.create_index("ix_documents_tenant_owner", "documents", ["tenant_id", "owner_entity_type", "owner_entity_id"])
    op.create_index("ix_documents_tenant_company", "documents", ["tenant_id", "company_id"])
    op.create_index("ix_documents_tenant_branch", "documents", ["tenant_id", "branch_id"])
    op.create_index("ix_documents_tenant_type", "documents", ["tenant_id", "document_type"])
    op.create_index("ix_documents_tenant_status", "documents", ["tenant_id", "status"])
    op.create_index("ix_documents_tenant_expiry", "documents", ["tenant_id", "expiry_date"])
    op.create_index("ix_documents_tenant_created", "documents", ["tenant_id", "created_at"])
    op.create_index("ix_document_relations_tenant_document", "document_relations", ["tenant_id", "document_id"])
    op.create_index("ix_document_relations_tenant_entity", "document_relations", ["tenant_id", "entity_type", "entity_id"])
    op.create_index("ix_document_access_logs_tenant_document", "document_access_logs", ["tenant_id", "document_id"])
    op.create_index("ix_document_requirements_tenant_module_operation", "document_requirements", ["tenant_id", "module_key", "operation_key"])


def downgrade() -> None:
    op.drop_index("ix_document_requirements_tenant_module_operation", table_name="document_requirements")
    op.drop_index("ix_document_access_logs_tenant_document", table_name="document_access_logs")
    op.drop_index("ix_document_relations_tenant_entity", table_name="document_relations")
    op.drop_index("ix_document_relations_tenant_document", table_name="document_relations")
    op.drop_index("ix_documents_tenant_created", table_name="documents")
    op.drop_index("ix_documents_tenant_expiry", table_name="documents")
    op.drop_index("ix_documents_tenant_status", table_name="documents")
    op.drop_index("ix_documents_tenant_type", table_name="documents")
    op.drop_index("ix_documents_tenant_branch", table_name="documents")
    op.drop_index("ix_documents_tenant_company", table_name="documents")
    op.drop_index("ix_documents_tenant_owner", table_name="documents")
    op.drop_table("document_requirements")
    op.drop_table("document_access_logs")
    op.drop_table("document_relations")
    op.drop_table("documents")
