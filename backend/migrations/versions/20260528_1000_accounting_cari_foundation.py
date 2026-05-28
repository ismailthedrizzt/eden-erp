"""accounting cari foundation

Revision ID: 20260528_1000
Revises:
Create Date: 2026-05-28
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260528_1000"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def uuid_pk() -> sa.Column:
    return sa.Column(
        "id",
        postgresql.UUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("gen_random_uuid()"),
    )


def jsonb_column(name: str, default: str) -> sa.Column:
    return sa.Column(
        name,
        postgresql.JSONB(astext_type=sa.Text()),
        nullable=False,
        server_default=sa.text(default),
    )


def timestamp_column(name: str) -> sa.Column:
    return sa.Column(
        name,
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text("now()"),
    )


def upgrade() -> None:
    op.execute('create extension if not exists "pgcrypto"')
    op.create_table(
        "accounting_cari_accounts",
        uuid_pk(),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_code", sa.Text(), nullable=False),
        sa.Column("account_name", sa.Text(), nullable=False),
        sa.Column("account_type", sa.Text(), nullable=False),
        sa.Column("cari_role", sa.Text(), nullable=False),
        sa.Column("linked_entity_type", sa.Text(), nullable=True),
        sa.Column("linked_entity_id", sa.Text(), nullable=True),
        sa.Column("tax_number", sa.Text(), nullable=True),
        sa.Column("tax_office", sa.Text(), nullable=True),
        sa.Column("identity_number", sa.Text(), nullable=True),
        sa.Column("country", sa.Text(), nullable=True),
        sa.Column("city", sa.Text(), nullable=True),
        sa.Column("district", sa.Text(), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("phone", sa.Text(), nullable=True),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("iban", sa.Text(), nullable=True),
        jsonb_column("bank_account_references", "'[]'::jsonb"),
        sa.Column("currency", sa.Text(), nullable=False, server_default="TRY"),
        sa.Column("opening_balance", sa.Numeric(18, 2), nullable=False, server_default="0"),
        sa.Column("current_balance", sa.Numeric(18, 2), nullable=False, server_default="0"),
        sa.Column("risk_limit", sa.Numeric(18, 2), nullable=True),
        sa.Column("payment_terms", sa.Text(), nullable=True),
        sa.Column("record_status", sa.Text(), nullable=False, server_default="active"),
        sa.Column("notes", sa.Text(), nullable=True),
        jsonb_column("metadata_json", "'{}'::jsonb"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_table(
        "accounting_cari_transactions",
        uuid_pk(),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("transaction_date", sa.Date(), nullable=False),
        sa.Column("document_date", sa.Date(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("transaction_type", sa.Text(), nullable=False),
        sa.Column("direction", sa.Text(), nullable=False),
        sa.Column("amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("currency", sa.Text(), nullable=False, server_default="TRY"),
        sa.Column("exchange_rate", sa.Numeric(18, 6), nullable=False, server_default="1"),
        sa.Column("local_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("document_status", sa.Text(), nullable=False, server_default="no_document"),
        sa.Column("document_no", sa.Text(), nullable=True),
        sa.Column("document_type", sa.Text(), nullable=True),
        sa.Column("real_counterparty_name", sa.Text(), nullable=True),
        sa.Column("category", sa.Text(), nullable=True),
        sa.Column("payment_method", sa.Text(), nullable=True),
        sa.Column("paid_by_entity_type", sa.Text(), nullable=True),
        sa.Column("paid_by_entity_id", sa.Text(), nullable=True),
        sa.Column("paid_to_entity_type", sa.Text(), nullable=True),
        sa.Column("paid_to_entity_id", sa.Text(), nullable=True),
        sa.Column("related_module", sa.Text(), nullable=True),
        sa.Column("related_entity_type", sa.Text(), nullable=True),
        sa.Column("related_entity_id", sa.Text(), nullable=True),
        sa.Column(
            "reconciliation_status",
            sa.Text(),
            nullable=False,
            server_default="unmatched",
        ),
        sa.Column("matched_bank_transaction_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("matched_invoice_id", postgresql.UUID(as_uuid=True), nullable=True),
        jsonb_column("attachment_files", "'[]'::jsonb"),
        sa.Column("status", sa.Text(), nullable=False, server_default="draft"),
        jsonb_column("metadata_json", "'{}'::jsonb"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_table(
        "accounting_transaction_attachments",
        uuid_pk(),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("transaction_id", postgresql.UUID(as_uuid=True), nullable=False),
        jsonb_column("file_json", "'{}'::jsonb"),
        timestamp_column("created_at"),
    )
    op.create_table(
        "accounting_reconciliation_links",
        uuid_pk(),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("transaction_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_module", sa.Text(), nullable=False),
        sa.Column("target_entity_type", sa.Text(), nullable=False),
        sa.Column("target_entity_id", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="matched"),
        jsonb_column("metadata_json", "'{}'::jsonb"),
        timestamp_column("created_at"),
    )
    op.create_index(
        "ix_accounting_cari_accounts_tenant_company",
        "accounting_cari_accounts",
        ["tenant_id", "company_id"],
    )
    op.create_index(
        "ix_accounting_cari_accounts_name",
        "accounting_cari_accounts",
        ["tenant_id", "company_id", "account_name"],
    )
    op.create_index(
        "ix_accounting_cari_accounts_role",
        "accounting_cari_accounts",
        ["tenant_id", "company_id", "cari_role"],
    )
    op.create_index(
        "ix_accounting_cari_accounts_code",
        "accounting_cari_accounts",
        ["tenant_id", "company_id", "account_code"],
        unique=True,
        postgresql_where=sa.text("coalesce(is_deleted, false) = false"),
    )
    op.execute(
        "create index ix_accounting_cari_transactions_company_date "
        "on accounting_cari_transactions (tenant_id, company_id, transaction_date desc)"
    )
    op.execute(
        "create index ix_accounting_cari_transactions_account_date "
        "on accounting_cari_transactions (tenant_id, account_id, transaction_date desc)"
    )
    op.create_index(
        "ix_accounting_cari_transactions_related",
        "accounting_cari_transactions",
        ["tenant_id", "related_module", "related_entity_type", "related_entity_id"],
    )
    op.create_index(
        "ix_accounting_cari_transactions_reconciliation",
        "accounting_cari_transactions",
        ["tenant_id", "reconciliation_status"],
    )
    op.create_index(
        "ix_accounting_cari_transactions_document",
        "accounting_cari_transactions",
        ["tenant_id", "document_status"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_accounting_cari_transactions_document",
        table_name="accounting_cari_transactions",
    )
    op.drop_index(
        "ix_accounting_cari_transactions_reconciliation",
        table_name="accounting_cari_transactions",
    )
    op.drop_index(
        "ix_accounting_cari_transactions_related",
        table_name="accounting_cari_transactions",
    )
    op.drop_index(
        "ix_accounting_cari_transactions_account_date",
        table_name="accounting_cari_transactions",
    )
    op.drop_index(
        "ix_accounting_cari_transactions_company_date",
        table_name="accounting_cari_transactions",
    )
    op.drop_index("ix_accounting_cari_accounts_code", table_name="accounting_cari_accounts")
    op.drop_index("ix_accounting_cari_accounts_role", table_name="accounting_cari_accounts")
    op.drop_index("ix_accounting_cari_accounts_name", table_name="accounting_cari_accounts")
    op.drop_index(
        "ix_accounting_cari_accounts_tenant_company",
        table_name="accounting_cari_accounts",
    )
    op.drop_table("accounting_reconciliation_links")
    op.drop_table("accounting_transaction_attachments")
    op.drop_table("accounting_cari_transactions")
    op.drop_table("accounting_cari_accounts")
