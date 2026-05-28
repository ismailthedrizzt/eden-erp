"""crm stakeholder master data foundation

Revision ID: 20260528_1400
Revises: 20260528_1300
Create Date: 2026-05-28
"""

# ruff: noqa: E501

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260528_1400"
down_revision: str | None = "20260528_1300"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def uuid_pk() -> sa.Column:
    return sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))


def uuid_column(name: str, *, nullable: bool = True) -> sa.Column:
    return sa.Column(name, postgresql.UUID(as_uuid=True), nullable=nullable)


def jsonb_column(name: str, default: str) -> sa.Column:
    return sa.Column(name, postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text(default))


def timestamp_column(name: str) -> sa.Column:
    return sa.Column(name, sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"))


def audit_columns() -> list[sa.Column]:
    return [
        jsonb_column("metadata_json", "'{}'::jsonb"),
        uuid_column("created_by"),
        uuid_column("updated_by"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    ]


def upgrade() -> None:
    op.execute('create extension if not exists "pgcrypto"')
    op.create_table(
        "master_persons",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        sa.Column("nationality", sa.Text(), nullable=True),
        sa.Column("identity_number", sa.Text(), nullable=True),
        sa.Column("passport_no", sa.Text(), nullable=True),
        sa.Column("first_name", sa.Text(), nullable=False),
        sa.Column("last_name", sa.Text(), nullable=False),
        sa.Column("full_name", sa.Text(), nullable=False),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("gender", sa.Text(), nullable=True),
        sa.Column("phone", sa.Text(), nullable=True),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("city", sa.Text(), nullable=True),
        sa.Column("district", sa.Text(), nullable=True),
        sa.Column("country", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        *audit_columns(),
    )
    op.create_table(
        "master_organizations",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        sa.Column("country", sa.Text(), nullable=True),
        sa.Column("tax_number", sa.Text(), nullable=True),
        sa.Column("trade_name", sa.Text(), nullable=False),
        sa.Column("short_name", sa.Text(), nullable=True),
        sa.Column("tax_office", sa.Text(), nullable=True),
        sa.Column("mersis_number", sa.Text(), nullable=True),
        sa.Column("registry_number", sa.Text(), nullable=True),
        sa.Column("phone", sa.Text(), nullable=True),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("website", sa.Text(), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("city", sa.Text(), nullable=True),
        sa.Column("district", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        *audit_columns(),
    )
    op.create_table(
        "crm_stakeholders",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id", nullable=False),
        sa.Column("master_entity_type", sa.Text(), nullable=False),
        uuid_column("master_entity_id", nullable=False),
        sa.Column("display_name", sa.Text(), nullable=False),
        sa.Column("stakeholder_type", sa.Text(), nullable=False),
        sa.Column("relationship_status", sa.Text(), nullable=False, server_default="draft"),
        sa.Column("customer_status", sa.Text(), nullable=True),
        sa.Column("supplier_status", sa.Text(), nullable=True),
        uuid_column("related_cari_account_id"),
        uuid_column("primary_contact_person_id"),
        uuid_column("assigned_owner_user_id"),
        sa.Column("source", sa.Text(), nullable=True),
        sa.Column("sector", sa.Text(), nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.Text()), nullable=False, server_default=sa.text("'{}'::text[]")),
        sa.Column("lead_status", sa.Text(), nullable=True),
        sa.Column("lead_source", sa.Text(), nullable=True),
        sa.Column("potential_value", sa.Numeric(), nullable=True),
        sa.Column("expected_close_date", sa.Date(), nullable=True),
        sa.Column("next_followup_date", sa.Date(), nullable=True),
        sa.Column("lost_reason", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        *audit_columns(),
    )
    op.create_table(
        "crm_interactions",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("stakeholder_id", nullable=False),
        sa.Column("interaction_type", sa.Text(), nullable=False),
        sa.Column("subject", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("interaction_date", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("next_followup_date", sa.Date(), nullable=True),
        uuid_column("related_task_id"),
        jsonb_column("attachments", "'[]'::jsonb"),
        uuid_column("created_by"),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_index("ix_master_persons_identity", "master_persons", ["tenant_id", "identity_number"])
    op.create_index("ix_master_persons_passport", "master_persons", ["tenant_id", "passport_no"])
    op.create_index("ix_master_persons_full_name", "master_persons", ["tenant_id", "full_name"])
    op.create_index("ix_master_organizations_tax", "master_organizations", ["tenant_id", "tax_number"])
    op.create_index("ix_master_organizations_trade_name", "master_organizations", ["tenant_id", "trade_name"])
    op.create_index("ix_crm_stakeholders_company_type", "crm_stakeholders", ["tenant_id", "company_id", "stakeholder_type"])
    op.create_index("ix_crm_stakeholders_company_status", "crm_stakeholders", ["tenant_id", "company_id", "relationship_status"])
    op.create_index("ix_crm_stakeholders_cari", "crm_stakeholders", ["tenant_id", "related_cari_account_id"])
    op.create_index("ix_crm_stakeholders_owner", "crm_stakeholders", ["tenant_id", "assigned_owner_user_id"])
    op.create_index("ix_crm_stakeholders_followup", "crm_stakeholders", ["tenant_id", "next_followup_date"])
    op.create_index("ix_crm_interactions_stakeholder_date", "crm_interactions", ["tenant_id", "stakeholder_id", "interaction_date"])
    op.create_index("uq_master_persons_identity_active", "master_persons", ["tenant_id", "nationality", "identity_number"], unique=True, postgresql_where=sa.text("identity_number is not null and coalesce(is_deleted, false) = false"))
    op.create_index("uq_master_persons_passport_active", "master_persons", ["tenant_id", "nationality", "passport_no"], unique=True, postgresql_where=sa.text("passport_no is not null and coalesce(is_deleted, false) = false"))
    op.create_index("uq_master_organizations_tax_active", "master_organizations", ["tenant_id", "country", "tax_number"], unique=True, postgresql_where=sa.text("tax_number is not null and coalesce(is_deleted, false) = false"))
    op.create_index("uq_crm_stakeholder_role_active", "crm_stakeholders", ["tenant_id", "company_id", "master_entity_type", "master_entity_id", "stakeholder_type"], unique=True, postgresql_where=sa.text("relationship_status in ('draft','active') and coalesce(is_deleted, false) = false"))


def downgrade() -> None:
    op.drop_index("uq_crm_stakeholder_role_active", table_name="crm_stakeholders")
    op.drop_index("uq_master_organizations_tax_active", table_name="master_organizations")
    op.drop_index("uq_master_persons_passport_active", table_name="master_persons")
    op.drop_index("uq_master_persons_identity_active", table_name="master_persons")
    op.drop_index("ix_crm_interactions_stakeholder_date", table_name="crm_interactions")
    op.drop_index("ix_crm_stakeholders_followup", table_name="crm_stakeholders")
    op.drop_index("ix_crm_stakeholders_owner", table_name="crm_stakeholders")
    op.drop_index("ix_crm_stakeholders_cari", table_name="crm_stakeholders")
    op.drop_index("ix_crm_stakeholders_company_status", table_name="crm_stakeholders")
    op.drop_index("ix_crm_stakeholders_company_type", table_name="crm_stakeholders")
    op.drop_index("ix_master_organizations_trade_name", table_name="master_organizations")
    op.drop_index("ix_master_organizations_tax", table_name="master_organizations")
    op.drop_index("ix_master_persons_full_name", table_name="master_persons")
    op.drop_index("ix_master_persons_passport", table_name="master_persons")
    op.drop_index("ix_master_persons_identity", table_name="master_persons")
    op.drop_table("crm_interactions")
    op.drop_table("crm_stakeholders")
    op.drop_table("master_organizations")
    op.drop_table("master_persons")
