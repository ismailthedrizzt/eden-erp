# ruff: noqa: E501

"""accounting reconciliation deepening

Revision ID: 20260529_2300
Revises: 20260529_2200
Create Date: 2026-05-29
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260529_2300"
down_revision: str | None = "20260529_2200"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def uuid_pk() -> sa.Column:
    return sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))


def uuid_column(name: str, *, nullable: bool = True) -> sa.Column:
    return sa.Column(name, postgresql.UUID(as_uuid=True), nullable=nullable)


def jsonb_column(name: str, default: str) -> sa.Column:
    return sa.Column(name, postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text(default))


def timestamp_column(name: str, *, nullable: bool = False) -> sa.Column:
    return sa.Column(name, sa.DateTime(timezone=True), nullable=nullable, server_default=None if nullable else sa.text("now()"))


def money_column(name: str, *, nullable: bool = False, default: str | None = "0") -> sa.Column:
    return sa.Column(name, sa.Numeric(18, 2), nullable=nullable, server_default=None if default is None else sa.text(default))


def upgrade() -> None:
    op.create_table(
        "accounting_bank_accounts",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id", nullable=False),
        sa.Column("bank_name", sa.Text(), nullable=False),
        sa.Column("bank_code", sa.Text(), nullable=True),
        sa.Column("branch_name", sa.Text(), nullable=True),
        sa.Column("branch_code", sa.Text(), nullable=True),
        sa.Column("account_name", sa.Text(), nullable=False),
        sa.Column("account_no", sa.Text(), nullable=True),
        sa.Column("iban", sa.Text(), nullable=True),
        sa.Column("currency", sa.Text(), nullable=False, server_default="TRY"),
        sa.Column("account_type", sa.Text(), nullable=False, server_default="checking"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        money_column("opening_balance"),
        money_column("current_balance"),
        timestamp_column("last_import_at", nullable=True),
        sa.Column("integration_status", sa.Text(), nullable=False, server_default="manual"),
        sa.Column("notes", sa.Text(), nullable=True),
        jsonb_column("metadata_json", "'{}'::jsonb"),
        uuid_column("created_by"),
        uuid_column("updated_by"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_table(
        "accounting_bank_transactions",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id", nullable=False),
        uuid_column("bank_account_id", nullable=False),
        sa.Column("transaction_date", sa.Date(), nullable=False),
        sa.Column("value_date", sa.Date(), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("counterparty_name", sa.Text(), nullable=True),
        sa.Column("counterparty_iban", sa.Text(), nullable=True),
        money_column("amount", default=None),
        sa.Column("direction", sa.Text(), nullable=False),
        sa.Column("currency", sa.Text(), nullable=False, server_default="TRY"),
        money_column("local_amount", default=None),
        money_column("balance_after", nullable=True, default=None),
        sa.Column("bank_reference_no", sa.Text(), nullable=True),
        sa.Column("raw_reference", sa.Text(), nullable=True),
        sa.Column("transaction_code", sa.Text(), nullable=True),
        sa.Column("imported_from", sa.Text(), nullable=False, server_default="manual"),
        uuid_column("import_job_id"),
        sa.Column("reconciliation_status", sa.Text(), nullable=False, server_default="unmatched"),
        uuid_column("matched_cari_transaction_id"),
        uuid_column("matched_invoice_id"),
        sa.Column("confidence_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        jsonb_column("metadata_json", "'{}'::jsonb"),
        uuid_column("created_by"),
        uuid_column("updated_by"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_table(
        "accounting_card_transactions",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id", nullable=False),
        uuid_column("card_account_id", nullable=False),
        sa.Column("card_holder_entity_type", sa.Text(), nullable=True),
        sa.Column("card_holder_entity_id", sa.Text(), nullable=True),
        sa.Column("transaction_date", sa.Date(), nullable=False),
        sa.Column("posting_date", sa.Date(), nullable=True),
        sa.Column("merchant_name", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        money_column("amount", default=None),
        sa.Column("currency", sa.Text(), nullable=False, server_default="TRY"),
        sa.Column("installment_count", sa.Integer(), nullable=True),
        sa.Column("installment_no", sa.Integer(), nullable=True),
        sa.Column("category", sa.Text(), nullable=True),
        sa.Column("document_status", sa.Text(), nullable=False, server_default="document_needed"),
        sa.Column("reconciliation_status", sa.Text(), nullable=False, server_default="unmatched"),
        uuid_column("matched_cari_transaction_id"),
        uuid_column("matched_invoice_id"),
        uuid_column("import_job_id"),
        sa.Column("notes", sa.Text(), nullable=True),
        jsonb_column("metadata_json", "'{}'::jsonb"),
        uuid_column("created_by"),
        uuid_column("updated_by"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_table(
        "accounting_e_documents",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id", nullable=False),
        sa.Column("document_kind", sa.Text(), nullable=False, server_default="e_invoice"),
        sa.Column("direction", sa.Text(), nullable=False, server_default="incoming"),
        sa.Column("invoice_uuid", sa.Text(), nullable=True),
        sa.Column("invoice_no", sa.Text(), nullable=False),
        sa.Column("issue_date", sa.Date(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("sender_tax_number", sa.Text(), nullable=True),
        sa.Column("sender_name", sa.Text(), nullable=True),
        sa.Column("receiver_tax_number", sa.Text(), nullable=True),
        sa.Column("receiver_name", sa.Text(), nullable=True),
        money_column("total_amount", default=None),
        money_column("tax_amount"),
        money_column("payable_amount", default=None),
        sa.Column("currency", sa.Text(), nullable=False, server_default="TRY"),
        sa.Column("status", sa.Text(), nullable=False, server_default="received"),
        sa.Column("gib_status", sa.Text(), nullable=True),
        sa.Column("scenario_type", sa.Text(), nullable=True),
        sa.Column("invoice_type", sa.Text(), nullable=True),
        uuid_column("xml_document_id"),
        uuid_column("pdf_document_id"),
        uuid_column("related_cari_account_id"),
        uuid_column("matched_cari_transaction_id"),
        uuid_column("matched_bank_transaction_id"),
        sa.Column("reconciliation_status", sa.Text(), nullable=False, server_default="unmatched"),
        uuid_column("import_job_id"),
        jsonb_column("raw_data", "'{}'::jsonb"),
        sa.Column("notes", sa.Text(), nullable=True),
        jsonb_column("metadata_json", "'{}'::jsonb"),
        uuid_column("created_by"),
        uuid_column("updated_by"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_table(
        "accounting_matching_suggestions",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id", nullable=False),
        sa.Column("source_type", sa.Text(), nullable=False),
        sa.Column("source_id", sa.Text(), nullable=False),
        sa.Column("target_type", sa.Text(), nullable=False),
        sa.Column("target_id", sa.Text(), nullable=False),
        sa.Column("confidence_score", sa.Numeric(5, 2), nullable=False),
        jsonb_column("reasons", "'[]'::jsonb"),
        sa.Column("status", sa.Text(), nullable=False, server_default="open"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
    )
    op.create_table(
        "accounting_capital_reconciliation",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id", nullable=False),
        sa.Column("capital_transaction_id", sa.Text(), nullable=False),
        sa.Column("partner_id", sa.Text(), nullable=False),
        money_column("expected_amount", default=None),
        money_column("paid_amount"),
        money_column("outstanding_amount", default=None),
        sa.Column("currency", sa.Text(), nullable=False, server_default="TRY"),
        sa.Column("reconciliation_status", sa.Text(), nullable=False, server_default="unmatched"),
        uuid_column("related_cari_transaction_id"),
        uuid_column("related_bank_transaction_id"),
        sa.Column("notes", sa.Text(), nullable=True),
        jsonb_column("metadata_json", "'{}'::jsonb"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )

    op.alter_column("accounting_reconciliation_links", "transaction_id", existing_type=postgresql.UUID(as_uuid=True), nullable=True)
    op.alter_column("accounting_reconciliation_links", "target_module", existing_type=sa.Text(), nullable=True)
    op.alter_column("accounting_reconciliation_links", "target_entity_type", existing_type=sa.Text(), nullable=True)
    op.alter_column("accounting_reconciliation_links", "target_entity_id", existing_type=sa.Text(), nullable=True)
    op.add_column("accounting_reconciliation_links", uuid_column("company_id"))
    op.add_column("accounting_reconciliation_links", sa.Column("source_type", sa.Text(), nullable=True))
    op.add_column("accounting_reconciliation_links", sa.Column("source_id", sa.Text(), nullable=True))
    op.add_column("accounting_reconciliation_links", sa.Column("target_type", sa.Text(), nullable=True))
    op.add_column("accounting_reconciliation_links", sa.Column("target_id", sa.Text(), nullable=True))
    op.add_column("accounting_reconciliation_links", sa.Column("match_type", sa.Text(), nullable=True))
    op.add_column("accounting_reconciliation_links", sa.Column("confidence_score", sa.Numeric(5, 2), nullable=True))
    op.add_column("accounting_reconciliation_links", money_column("amount_matched", nullable=True, default=None))
    op.add_column("accounting_reconciliation_links", sa.Column("currency", sa.Text(), nullable=True))
    op.add_column("accounting_reconciliation_links", uuid_column("matched_by"))
    op.add_column("accounting_reconciliation_links", timestamp_column("matched_at", nullable=True))
    op.add_column("accounting_reconciliation_links", uuid_column("removed_by"))
    op.add_column("accounting_reconciliation_links", timestamp_column("removed_at", nullable=True))
    op.add_column("accounting_reconciliation_links", sa.Column("notes", sa.Text(), nullable=True))
    op.add_column("accounting_reconciliation_links", timestamp_column("updated_at"))

    op.create_index("ix_accounting_bank_accounts_tenant_company", "accounting_bank_accounts", ["tenant_id", "company_id"])
    op.create_index("ix_accounting_bank_accounts_iban", "accounting_bank_accounts", ["tenant_id", "company_id", "iban"])
    op.execute("create index ix_accounting_bank_transactions_company_date on accounting_bank_transactions (tenant_id, company_id, transaction_date desc)")
    op.execute("create index ix_accounting_bank_transactions_account_date on accounting_bank_transactions (tenant_id, bank_account_id, transaction_date desc)")
    op.create_index("ix_accounting_bank_transactions_reconciliation", "accounting_bank_transactions", ["tenant_id", "company_id", "reconciliation_status"])
    op.execute("create index ix_accounting_card_transactions_company_date on accounting_card_transactions (tenant_id, company_id, transaction_date desc)")
    op.create_index("ix_accounting_e_documents_invoice_no", "accounting_e_documents", ["tenant_id", "invoice_no"])
    op.create_index("ix_accounting_e_documents_invoice_uuid", "accounting_e_documents", ["tenant_id", "invoice_uuid"])
    op.create_index("ix_accounting_e_documents_sender_tax", "accounting_e_documents", ["tenant_id", "sender_tax_number"])
    op.create_index("ix_accounting_e_documents_receiver_tax", "accounting_e_documents", ["tenant_id", "receiver_tax_number"])
    op.create_index("ix_accounting_e_documents_reconciliation", "accounting_e_documents", ["tenant_id", "company_id", "reconciliation_status"])
    op.create_index("ix_accounting_reconciliation_links_source", "accounting_reconciliation_links", ["tenant_id", "source_type", "source_id"])
    op.create_index("ix_accounting_reconciliation_links_target", "accounting_reconciliation_links", ["tenant_id", "target_type", "target_id"])
    op.create_index("ix_accounting_matching_suggestions_source", "accounting_matching_suggestions", ["tenant_id", "source_type", "source_id"])
    op.create_index("ix_accounting_matching_suggestions_confidence", "accounting_matching_suggestions", ["tenant_id", "company_id", "confidence_score"])
    op.create_index("ix_accounting_capital_reconciliation_company", "accounting_capital_reconciliation", ["tenant_id", "company_id", "reconciliation_status"])


def downgrade() -> None:
    op.drop_index("ix_accounting_capital_reconciliation_company", table_name="accounting_capital_reconciliation")
    op.drop_index("ix_accounting_matching_suggestions_confidence", table_name="accounting_matching_suggestions")
    op.drop_index("ix_accounting_matching_suggestions_source", table_name="accounting_matching_suggestions")
    op.drop_index("ix_accounting_reconciliation_links_target", table_name="accounting_reconciliation_links")
    op.drop_index("ix_accounting_reconciliation_links_source", table_name="accounting_reconciliation_links")
    op.drop_index("ix_accounting_e_documents_reconciliation", table_name="accounting_e_documents")
    op.drop_index("ix_accounting_e_documents_receiver_tax", table_name="accounting_e_documents")
    op.drop_index("ix_accounting_e_documents_sender_tax", table_name="accounting_e_documents")
    op.drop_index("ix_accounting_e_documents_invoice_uuid", table_name="accounting_e_documents")
    op.drop_index("ix_accounting_e_documents_invoice_no", table_name="accounting_e_documents")
    op.drop_index("ix_accounting_card_transactions_company_date", table_name="accounting_card_transactions")
    op.drop_index("ix_accounting_bank_transactions_reconciliation", table_name="accounting_bank_transactions")
    op.drop_index("ix_accounting_bank_transactions_account_date", table_name="accounting_bank_transactions")
    op.drop_index("ix_accounting_bank_transactions_company_date", table_name="accounting_bank_transactions")
    op.drop_index("ix_accounting_bank_accounts_iban", table_name="accounting_bank_accounts")
    op.drop_index("ix_accounting_bank_accounts_tenant_company", table_name="accounting_bank_accounts")
    for column in [
        "updated_at",
        "notes",
        "removed_at",
        "removed_by",
        "matched_at",
        "matched_by",
        "currency",
        "amount_matched",
        "confidence_score",
        "match_type",
        "target_id",
        "target_type",
        "source_id",
        "source_type",
        "company_id",
    ]:
        op.drop_column("accounting_reconciliation_links", column)
    op.alter_column("accounting_reconciliation_links", "target_entity_id", existing_type=sa.Text(), nullable=False)
    op.alter_column("accounting_reconciliation_links", "target_entity_type", existing_type=sa.Text(), nullable=False)
    op.alter_column("accounting_reconciliation_links", "target_module", existing_type=sa.Text(), nullable=False)
    op.alter_column("accounting_reconciliation_links", "transaction_id", existing_type=postgresql.UUID(as_uuid=True), nullable=False)
    op.drop_table("accounting_capital_reconciliation")
    op.drop_table("accounting_matching_suggestions")
    op.drop_table("accounting_e_documents")
    op.drop_table("accounting_card_transactions")
    op.drop_table("accounting_bank_transactions")
    op.drop_table("accounting_bank_accounts")
