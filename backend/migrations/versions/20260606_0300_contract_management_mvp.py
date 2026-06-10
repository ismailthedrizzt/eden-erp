# ruff: noqa: E501

"""contract management mvp

Revision ID: 20260606_0300
Revises: 20260606_0200
Create Date: 2026-06-06
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260606_0300"
down_revision: str | None = "20260606_0200"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def uuid_pk() -> sa.Column:
    return sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))


def uuid_column(name: str, *, nullable: bool = True) -> sa.Column:
    return sa.Column(name, postgresql.UUID(as_uuid=True), nullable=nullable)


def jsonb_column(name: str) -> sa.Column:
    return sa.Column(name, postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb"))


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    ]


def upgrade() -> None:
    op.execute('create extension if not exists "pgcrypto"')
    op.create_table(
        "contracts",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id"),
        sa.Column("contract_no", sa.Text(), nullable=False),
        sa.Column("contract_title", sa.Text(), nullable=False),
        sa.Column("contract_type", sa.Text(), nullable=False, server_default="other"),
        sa.Column("contract_category", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="draft"),
        sa.Column("primary_party_type", sa.Text(), nullable=True),
        sa.Column("primary_party_entity_type", sa.Text(), nullable=True),
        sa.Column("primary_party_entity_id", sa.Text(), nullable=True),
        sa.Column("counterparty_name", sa.Text(), nullable=True),
        sa.Column("counterparty_tax_number", sa.Text(), nullable=True),
        sa.Column("counterparty_contact_name", sa.Text(), nullable=True),
        sa.Column("counterparty_email", sa.Text(), nullable=True),
        sa.Column("counterparty_phone", sa.Text(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("signed_date", sa.Date(), nullable=True),
        sa.Column("effective_date", sa.Date(), nullable=True),
        sa.Column("renewal_date", sa.Date(), nullable=True),
        sa.Column("termination_date", sa.Date(), nullable=True),
        sa.Column("notice_period_days", sa.Integer(), nullable=True),
        sa.Column("auto_renewal", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("contract_value", sa.Numeric(18, 2), nullable=True),
        sa.Column("currency", sa.Text(), nullable=True),
        sa.Column("payment_terms", sa.Text(), nullable=True),
        sa.Column("billing_frequency", sa.Text(), nullable=True),
        sa.Column("renewal_status", sa.Text(), nullable=False, server_default="not_started"),
        sa.Column("termination_status", sa.Text(), nullable=False, server_default="not_started"),
        uuid_column("owner_user_id"),
        sa.Column("responsible_department", sa.Text(), nullable=True),
        uuid_column("related_company_id"),
        uuid_column("related_branch_id"),
        uuid_column("related_facility_id"),
        uuid_column("related_project_id"),
        uuid_column("related_customer_id"),
        uuid_column("related_supplier_id"),
        uuid_column("related_employee_id"),
        uuid_column("related_asset_id"),
        sa.Column("risk_level", sa.Text(), nullable=False, server_default="medium"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.Text()), nullable=False, server_default=sa.text("'{}'::text[]")),
        jsonb_column("metadata_json"),
        uuid_column("created_by"),
        uuid_column("updated_by"),
        *timestamps(),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.UniqueConstraint("tenant_id", "contract_no", name="uq_contracts_tenant_no"),
    )
    op.create_table(
        "contract_parties",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("contract_id", nullable=False),
        sa.Column("party_role", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=True),
        sa.Column("entity_id", sa.Text(), nullable=True),
        sa.Column("display_name", sa.Text(), nullable=False),
        sa.Column("tax_number", sa.Text(), nullable=True),
        sa.Column("contact_person", sa.Text(), nullable=True),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("phone", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "contract_relations",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("contract_id", nullable=False),
        sa.Column("module_key", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=False),
        sa.Column("entity_id", sa.Text(), nullable=False),
        sa.Column("relation_type", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        jsonb_column("metadata_json"),
        sa.UniqueConstraint("tenant_id", "contract_id", "module_key", "entity_type", "entity_id", "relation_type", name="uq_contract_relations_context"),
    )
    op.create_table(
        "contract_obligations",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("contract_id", nullable=False),
        sa.Column("obligation_type", sa.Text(), nullable=False, server_default="other"),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("recurrence_rule", sa.Text(), nullable=True),
        uuid_column("responsible_user_id"),
        sa.Column("status", sa.Text(), nullable=False, server_default="open"),
        uuid_column("related_task_id"),
        *timestamps(),
    )
    op.create_table(
        "contract_milestones",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("contract_id", nullable=False),
        sa.Column("milestone_name", sa.Text(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("amount", sa.Numeric(18, 2), nullable=True),
        sa.Column("currency", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="open"),
        uuid_column("related_project_task_id"),
        uuid_column("related_cari_transaction_id"),
        jsonb_column("metadata_json"),
    )
    op.create_table(
        "contract_events",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("contract_id", nullable=False),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("event_date", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("old_status", sa.Text(), nullable=True),
        sa.Column("new_status", sa.Text(), nullable=True),
        uuid_column("performed_by"),
        sa.Column("notes", sa.Text(), nullable=True),
        jsonb_column("metadata_json"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    for table_name in ["contracts", "contract_parties", "contract_relations", "contract_obligations", "contract_milestones", "contract_events"]:
        op.create_index(f"ix_{table_name}_tenant", table_name, ["tenant_id"])
    op.create_index("ix_contracts_status", "contracts", ["tenant_id", "status"])
    op.create_index("ix_contracts_type", "contracts", ["tenant_id", "contract_type"])
    op.create_index("ix_contracts_dates", "contracts", ["tenant_id", "end_date", "renewal_date"])


def downgrade() -> None:
    op.drop_table("contract_events")
    op.drop_table("contract_milestones")
    op.drop_table("contract_obligations")
    op.drop_table("contract_relations")
    op.drop_table("contract_parties")
    op.drop_table("contracts")
