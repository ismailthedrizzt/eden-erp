"""crm lead opportunity deepening

Revision ID: 20260529_2360
Revises: 20260529_2355
Create Date: 2026-05-29
"""

# ruff: noqa: E501

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260529_2360"
down_revision: str | None = "20260529_2355"
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


def versioned_columns() -> list[sa.Column]:
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
        "crm_pipelines",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id"),
        sa.Column("pipeline_name", sa.Text(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
    )
    op.create_table(
        "crm_pipeline_stages",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("pipeline_id", nullable=False),
        sa.Column("stage_key", sa.Text(), nullable=False),
        sa.Column("stage_name", sa.Text(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("probability", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("stage_type", sa.Text(), nullable=False, server_default="open"),
        sa.Column("requires_next_action", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
    )
    op.create_table(
        "crm_leads",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id", nullable=False),
        uuid_column("stakeholder_id"),
        sa.Column("master_entity_type", sa.Text(), nullable=True),
        uuid_column("master_entity_id"),
        sa.Column("lead_name", sa.Text(), nullable=False),
        sa.Column("contact_name", sa.Text(), nullable=True),
        sa.Column("phone", sa.Text(), nullable=True),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("company_name", sa.Text(), nullable=True),
        sa.Column("sector", sa.Text(), nullable=True),
        sa.Column("source", sa.Text(), nullable=False, server_default="manual"),
        sa.Column("lead_status", sa.Text(), nullable=False, server_default="new"),
        sa.Column("qualification_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("interest_area", sa.Text(), nullable=True),
        sa.Column("product_interest", sa.Text(), nullable=True),
        sa.Column("estimated_value", sa.Numeric(), nullable=True),
        sa.Column("currency", sa.Text(), nullable=True),
        sa.Column("expected_close_date", sa.Date(), nullable=True),
        uuid_column("assigned_owner_user_id"),
        sa.Column("next_followup_date", sa.Date(), nullable=True),
        sa.Column("last_contacted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("lost_reason", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.Text()), nullable=False, server_default=sa.text("'{}'::text[]")),
        *versioned_columns(),
    )
    op.create_table(
        "crm_opportunities",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id", nullable=False),
        uuid_column("stakeholder_id"),
        uuid_column("lead_id"),
        sa.Column("opportunity_no", sa.Text(), nullable=False),
        sa.Column("opportunity_name", sa.Text(), nullable=False),
        sa.Column("customer_name", sa.Text(), nullable=False),
        uuid_column("pipeline_id", nullable=False),
        uuid_column("stage_id", nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="open"),
        sa.Column("estimated_value", sa.Numeric(), nullable=True),
        sa.Column("weighted_value", sa.Numeric(), nullable=True),
        sa.Column("probability", sa.Numeric(5, 2), nullable=True),
        sa.Column("currency", sa.Text(), nullable=True),
        sa.Column("expected_close_date", sa.Date(), nullable=True),
        sa.Column("actual_close_date", sa.Date(), nullable=True),
        uuid_column("assigned_owner_user_id"),
        sa.Column("source", sa.Text(), nullable=True),
        sa.Column("product_interest", sa.Text(), nullable=True),
        jsonb_column("related_product_ids", "'[]'::jsonb"),
        jsonb_column("related_service_ids", "'[]'::jsonb"),
        sa.Column("next_followup_date", sa.Date(), nullable=True),
        sa.Column("lost_reason", sa.Text(), nullable=True),
        sa.Column("won_reason", sa.Text(), nullable=True),
        sa.Column("competitor_name", sa.Text(), nullable=True),
        sa.Column("proposal_status", sa.Text(), nullable=False, server_default="not_started"),
        uuid_column("proposal_document_id"),
        sa.Column("proposal_amount", sa.Numeric(), nullable=True),
        sa.Column("proposal_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("proposal_valid_until", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.Text()), nullable=False, server_default=sa.text("'{}'::text[]")),
        *versioned_columns(),
    )
    op.create_table(
        "crm_followup_events",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("company_id", nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=False),
        uuid_column("entity_id", nullable=False),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("snoozed_until", sa.Date(), nullable=True),
        uuid_column("related_task_id"),
        uuid_column("related_interaction_id"),
        sa.Column("notes", sa.Text(), nullable=True),
        jsonb_column("metadata_json", "'{}'::jsonb"),
        uuid_column("created_by"),
        timestamp_column("created_at"),
    )

    op.add_column("crm_interactions", uuid_column("lead_id"))
    op.add_column("crm_interactions", uuid_column("opportunity_id"))
    op.add_column("crm_interactions", sa.Column("direction", sa.Text(), nullable=False, server_default="outbound"))
    op.add_column("crm_interactions", sa.Column("contact_person", sa.Text(), nullable=True))
    op.add_column("crm_interactions", uuid_column("related_document_id"))
    op.add_column("crm_interactions", sa.Column("outcome", sa.Text(), nullable=True))
    op.add_column("crm_interactions", sa.Column("sentiment", sa.Text(), nullable=True))

    op.create_index("ix_crm_pipelines_scope", "crm_pipelines", ["tenant_id", "company_id", "active"])
    op.create_index("ix_crm_pipelines_default", "crm_pipelines", ["tenant_id", "company_id", "is_default"])
    op.create_index("ix_crm_pipeline_stages_pipeline", "crm_pipeline_stages", ["tenant_id", "pipeline_id", "order_index"])
    op.create_index("ix_crm_leads_company_status", "crm_leads", ["tenant_id", "company_id", "lead_status"])
    op.create_index("ix_crm_leads_owner_followup", "crm_leads", ["tenant_id", "assigned_owner_user_id", "next_followup_date"])
    op.create_index("ix_crm_leads_email", "crm_leads", ["tenant_id", "email"])
    op.create_index("ix_crm_leads_phone", "crm_leads", ["tenant_id", "phone"])
    op.create_index("ix_crm_leads_company_name", "crm_leads", ["tenant_id", "company_name"])
    op.create_index("ix_crm_opportunities_company_status", "crm_opportunities", ["tenant_id", "company_id", "status"])
    op.create_index("ix_crm_opportunities_pipeline_stage", "crm_opportunities", ["tenant_id", "pipeline_id", "stage_id"])
    op.create_index("ix_crm_opportunities_expected_close", "crm_opportunities", ["tenant_id", "expected_close_date"])
    op.create_index("ix_crm_opportunities_owner_followup", "crm_opportunities", ["tenant_id", "assigned_owner_user_id", "next_followup_date"])
    op.create_index("ix_crm_opportunities_stakeholder", "crm_opportunities", ["tenant_id", "stakeholder_id"])
    op.create_index("ix_crm_opportunities_lead", "crm_opportunities", ["tenant_id", "lead_id"])
    op.create_index("ix_crm_opportunities_no", "crm_opportunities", ["tenant_id", "opportunity_no"], unique=True, postgresql_where=sa.text("coalesce(is_deleted, false) = false"))
    op.create_index("ix_crm_interactions_lead_date", "crm_interactions", ["tenant_id", "lead_id", "interaction_date"])
    op.create_index("ix_crm_interactions_opportunity_date", "crm_interactions", ["tenant_id", "opportunity_id", "interaction_date"])
    op.execute("create index ix_crm_interactions_date on crm_interactions (tenant_id, interaction_date desc)")
    op.create_index("ix_crm_followup_events_entity", "crm_followup_events", ["tenant_id", "entity_type", "entity_id", "created_at"])
    op.create_index("ix_crm_followup_events_due", "crm_followup_events", ["tenant_id", "company_id", "due_date"])


def downgrade() -> None:
    op.drop_index("ix_crm_followup_events_due", table_name="crm_followup_events")
    op.drop_index("ix_crm_followup_events_entity", table_name="crm_followup_events")
    op.drop_index("ix_crm_interactions_date", table_name="crm_interactions")
    op.drop_index("ix_crm_interactions_opportunity_date", table_name="crm_interactions")
    op.drop_index("ix_crm_interactions_lead_date", table_name="crm_interactions")
    op.drop_index("ix_crm_opportunities_no", table_name="crm_opportunities")
    op.drop_index("ix_crm_opportunities_lead", table_name="crm_opportunities")
    op.drop_index("ix_crm_opportunities_stakeholder", table_name="crm_opportunities")
    op.drop_index("ix_crm_opportunities_owner_followup", table_name="crm_opportunities")
    op.drop_index("ix_crm_opportunities_expected_close", table_name="crm_opportunities")
    op.drop_index("ix_crm_opportunities_pipeline_stage", table_name="crm_opportunities")
    op.drop_index("ix_crm_opportunities_company_status", table_name="crm_opportunities")
    op.drop_index("ix_crm_leads_company_name", table_name="crm_leads")
    op.drop_index("ix_crm_leads_phone", table_name="crm_leads")
    op.drop_index("ix_crm_leads_email", table_name="crm_leads")
    op.drop_index("ix_crm_leads_owner_followup", table_name="crm_leads")
    op.drop_index("ix_crm_leads_company_status", table_name="crm_leads")
    op.drop_index("ix_crm_pipeline_stages_pipeline", table_name="crm_pipeline_stages")
    op.drop_index("ix_crm_pipelines_default", table_name="crm_pipelines")
    op.drop_index("ix_crm_pipelines_scope", table_name="crm_pipelines")
    op.drop_column("crm_interactions", "sentiment")
    op.drop_column("crm_interactions", "outcome")
    op.drop_column("crm_interactions", "related_document_id")
    op.drop_column("crm_interactions", "contact_person")
    op.drop_column("crm_interactions", "direction")
    op.drop_column("crm_interactions", "opportunity_id")
    op.drop_column("crm_interactions", "lead_id")
    op.drop_table("crm_followup_events")
    op.drop_table("crm_opportunities")
    op.drop_table("crm_leads")
    op.drop_table("crm_pipeline_stages")
    op.drop_table("crm_pipelines")
