# ruff: noqa: E501

"""product plan tenant licensing

Revision ID: 20260607_0100
Revises: 20260606_0300
Create Date: 2026-06-07
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260607_0100"
down_revision: str | None = "20260606_0300"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def uuid_pk() -> sa.Column:
    return sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))


def uuid_column(name: str, *, nullable: bool = True) -> sa.Column:
    return sa.Column(name, postgresql.UUID(as_uuid=True), nullable=nullable)


def jsonb_column(name: str, default: str = "'{}'::jsonb") -> sa.Column:
    return sa.Column(name, postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text(default))


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    ]


def upgrade() -> None:
    op.execute('create extension if not exists "pgcrypto"')
    op.create_table(
        "licensed_products",
        uuid_pk(),
        uuid_column("vendor_tenant_id"),
        sa.Column("product_key", sa.Text(), nullable=False),
        sa.Column("product_name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="active"),
        uuid_column("created_by"),
        *timestamps(),
        jsonb_column("metadata_json"),
        sa.CheckConstraint("status in ('draft','active','archived')", name="ck_licensed_products_status"),
        sa.UniqueConstraint("product_key", name="uq_licensed_products_key"),
    )
    op.create_table(
        "product_license_plans",
        uuid_pk(),
        uuid_column("product_id", nullable=False),
        sa.Column("plan_key", sa.Text(), nullable=False),
        sa.Column("plan_name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="active"),
        sa.Column("business_size_label", sa.Text(), nullable=True),
        sa.Column("default_billing_period", sa.Text(), nullable=False, server_default="monthly"),
        sa.Column("base_price", sa.Numeric(18, 2), nullable=True),
        sa.Column("currency", sa.Text(), nullable=False, server_default="TRY"),
        sa.Column("trial_days", sa.Integer(), nullable=False, server_default="14"),
        sa.Column("support_level", sa.Text(), nullable=False, server_default="standard"),
        sa.Column("visible_in_setup", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_development_plan", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="100"),
        *timestamps(),
        jsonb_column("metadata_json"),
        sa.ForeignKeyConstraint(["product_id"], ["licensed_products.id"], ondelete="cascade"),
        sa.CheckConstraint("status in ('draft','active','retired')", name="ck_product_license_plans_status"),
        sa.CheckConstraint("default_billing_period in ('monthly','yearly','custom')", name="ck_product_license_plans_billing"),
        sa.CheckConstraint("support_level in ('self_service','standard','priority','enterprise','internal')", name="ck_product_license_plans_support"),
        sa.UniqueConstraint("product_id", "plan_key", name="uq_product_license_plans_key"),
    )
    op.create_table(
        "plan_modules",
        uuid_pk(),
        uuid_column("product_plan_id", nullable=False),
        sa.Column("module_key", sa.Text(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("visibility", sa.Text(), nullable=False, server_default="visible"),
        sa.Column("included_level", sa.Text(), nullable=False, server_default="included"),
        jsonb_column("limits_json"),
        jsonb_column("metadata_json"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["product_plan_id"], ["product_license_plans.id"], ondelete="cascade"),
        sa.CheckConstraint("visibility in ('visible','hidden','coming_soon')", name="ck_plan_modules_visibility"),
        sa.CheckConstraint("included_level in ('included','optional_addon','internal')", name="ck_plan_modules_included_level"),
        sa.UniqueConstraint("product_plan_id", "module_key", name="uq_plan_modules_plan_key"),
    )
    op.create_table(
        "plan_features",
        uuid_pk(),
        uuid_column("product_plan_id", nullable=False),
        sa.Column("feature_key", sa.Text(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        jsonb_column("limits_json"),
        jsonb_column("metadata_json"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["product_plan_id"], ["product_license_plans.id"], ondelete="cascade"),
        sa.UniqueConstraint("product_plan_id", "feature_key", name="uq_plan_features_plan_key"),
    )
    op.create_table(
        "tenant_licenses",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("product_id", nullable=False),
        uuid_column("product_plan_id", nullable=False),
        sa.Column("license_key", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="trial"),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("renews_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("billing_period", sa.Text(), nullable=False, server_default="monthly"),
        sa.Column("price", sa.Numeric(18, 2), nullable=True),
        sa.Column("currency", sa.Text(), nullable=False, server_default="TRY"),
        sa.Column("payment_status", sa.Text(), nullable=False, server_default="pending"),
        sa.Column("max_users", sa.Integer(), nullable=True),
        sa.Column("max_companies", sa.Integer(), nullable=True),
        sa.Column("max_branches", sa.Integer(), nullable=True),
        sa.Column("max_storage_mb", sa.Integer(), nullable=True),
        uuid_column("created_by"),
        uuid_column("updated_by"),
        *timestamps(),
        jsonb_column("metadata_json"),
        sa.ForeignKeyConstraint(["product_id"], ["licensed_products.id"], ondelete="restrict"),
        sa.ForeignKeyConstraint(["product_plan_id"], ["product_license_plans.id"], ondelete="restrict"),
        sa.CheckConstraint("status in ('trial','active','past_due','suspended','cancelled','expired','development','internal','archived')", name="ck_tenant_licenses_status"),
        sa.CheckConstraint("billing_period in ('monthly','yearly','custom')", name="ck_tenant_licenses_billing"),
        sa.CheckConstraint("payment_status in ('not_required','pending','paid','overdue','failed','waived')", name="ck_tenant_licenses_payment_status"),
        sa.UniqueConstraint("license_key", name="uq_tenant_licenses_key"),
    )
    op.create_table(
        "tenant_license_modules",
        uuid_pk(),
        uuid_column("tenant_license_id", nullable=False),
        sa.Column("module_key", sa.Text(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("source", sa.Text(), nullable=False, server_default="plan"),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        jsonb_column("metadata_json"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["tenant_license_id"], ["tenant_licenses.id"], ondelete="cascade"),
        sa.CheckConstraint("source in ('plan','addon','manual_override','development')", name="ck_tenant_license_modules_source"),
        sa.UniqueConstraint("tenant_license_id", "module_key", name="uq_tenant_license_modules_key"),
    )
    op.create_table(
        "tenant_license_features",
        uuid_pk(),
        uuid_column("tenant_license_id", nullable=False),
        sa.Column("feature_key", sa.Text(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("source", sa.Text(), nullable=False, server_default="plan"),
        jsonb_column("limits_json"),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        jsonb_column("metadata_json"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["tenant_license_id"], ["tenant_licenses.id"], ondelete="cascade"),
        sa.CheckConstraint("source in ('plan','addon','manual_override','development')", name="ck_tenant_license_features_source"),
        sa.UniqueConstraint("tenant_license_id", "feature_key", name="uq_tenant_license_features_key"),
    )
    op.create_table(
        "tenant_license_payments",
        uuid_pk(),
        uuid_column("tenant_license_id", nullable=False),
        uuid_column("tenant_id", nullable=False),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("currency", sa.Text(), nullable=False, server_default="TRY"),
        sa.Column("payment_status", sa.Text(), nullable=False, server_default="paid"),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("payment_reference", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        jsonb_column("metadata_json"),
        sa.ForeignKeyConstraint(["tenant_license_id"], ["tenant_licenses.id"], ondelete="cascade"),
    )
    op.create_table(
        "tenant_usage_snapshots",
        uuid_pk(),
        uuid_column("tenant_id", nullable=False),
        uuid_column("tenant_license_id", nullable=False),
        sa.Column("snapshot_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("active_users", sa.Integer(), nullable=True),
        sa.Column("companies_count", sa.Integer(), nullable=True),
        sa.Column("branches_count", sa.Integer(), nullable=True),
        sa.Column("storage_used_mb", sa.Integer(), nullable=True),
        jsonb_column("metadata_json"),
        sa.ForeignKeyConstraint(["tenant_license_id"], ["tenant_licenses.id"], ondelete="cascade"),
    )

    for table_name in [
        "licensed_products",
        "product_license_plans",
        "plan_modules",
        "plan_features",
        "tenant_licenses",
        "tenant_license_modules",
        "tenant_license_features",
        "tenant_license_payments",
        "tenant_usage_snapshots",
    ]:
        op.create_index(f"ix_{table_name}_created", table_name, ["created_at"] if table_name != "tenant_usage_snapshots" else ["snapshot_at"])
    op.create_index("ix_tenant_licenses_tenant_status", "tenant_licenses", ["tenant_id", "status"])
    op.create_index("ix_tenant_licenses_plan", "tenant_licenses", ["product_plan_id"])
    op.create_index("ix_plan_modules_module", "plan_modules", ["module_key"])
    op.create_index("ix_plan_features_feature", "plan_features", ["feature_key"])

    _seed_eden_product_and_plans()
    _seed_existing_workspace_default_licenses()


def downgrade() -> None:
    op.drop_table("tenant_usage_snapshots")
    op.drop_table("tenant_license_payments")
    op.drop_table("tenant_license_features")
    op.drop_table("tenant_license_modules")
    op.drop_table("tenant_licenses")
    op.drop_table("plan_features")
    op.drop_table("plan_modules")
    op.drop_table("product_license_plans")
    op.drop_table("licensed_products")


def _seed_eden_product_and_plans() -> None:
    op.execute(
        """
        insert into public.licensed_products (product_key, product_name, description, status, metadata_json)
        values ('eden_erp', 'EDEN ERP', 'Tenant based Eden ERP product definition.', 'active', '{"source":"migration_seed"}'::jsonb)
        on conflict (product_key) do update
        set product_name = excluded.product_name,
            status = 'active',
            updated_at = now();
        """
    )
    op.execute(
        """
        insert into public.product_license_plans (
          product_id, plan_key, plan_name, description, status, business_size_label,
          default_billing_period, base_price, currency, trial_days, support_level,
          visible_in_setup, is_development_plan, sort_order, metadata_json
        )
        select lp.id, v.plan_key, v.plan_name, v.description, 'active', v.business_size_label,
          v.default_billing_period, v.base_price, 'TRY', v.trial_days, v.support_level,
          v.visible_in_setup, v.is_development_plan, v.sort_order, '{"source":"migration_seed"}'::jsonb
        from public.licensed_products lp
        cross join (values
          ('development', 'Development', 'Internal development, test and preview tenant plan.', 'Development / internal tenant', 'custom', 0::numeric, 0, 'internal', false, true, 10),
          ('micro', 'Mikro Isletme', 'Simple company, cari account and document tracking.', '1-3 users / single company', 'monthly', 0::numeric, 14, 'self_service', true, false, 20),
          ('small', 'Kucuk Isletme', 'Company, partner, representative, branch, employee and basic operations.', '4-10 users / basic operations', 'monthly', 0::numeric, 14, 'standard', true, false, 30),
          ('medium', 'Orta Isletme', 'Multi-company structure, HR, accounting, documents, tasks and audit.', '11-50 users / multi-company operations', 'monthly', 0::numeric, 14, 'standard', true, false, 40),
          ('large', 'Buyuk Isletme', 'CRM, after-sales, products/services, reporting and advanced documents.', '51-300 users / advanced workflows', 'monthly', 0::numeric, 14, 'priority', true, false, 50),
          ('enterprise', 'Enterprise', 'Portal, integration hub, automation, AI and custom modules.', 'Enterprise / custom scope', 'custom', 0::numeric, 14, 'enterprise', true, false, 60)
        ) as v(plan_key, plan_name, description, business_size_label, default_billing_period, base_price, trial_days, support_level, visible_in_setup, is_development_plan, sort_order)
        where lp.product_key = 'eden_erp'
        on conflict (product_id, plan_key) do update
        set plan_name = excluded.plan_name,
            description = excluded.description,
            status = 'active',
            business_size_label = excluded.business_size_label,
            default_billing_period = excluded.default_billing_period,
            support_level = excluded.support_level,
            visible_in_setup = excluded.visible_in_setup,
            is_development_plan = excluded.is_development_plan,
            sort_order = excluded.sort_order,
            updated_at = now();
        """
    )
    op.execute(
        """
        insert into public.plan_modules (product_plan_id, module_key, enabled, visibility, included_level, metadata_json)
        select p.id, v.module_key, true, 'visible', v.included_level, '{"source":"migration_seed"}'::jsonb
        from public.product_license_plans p
        join public.licensed_products lp on lp.id = p.product_id
        join (values
          ('micro','companies','included'), ('micro','accounting','included'), ('micro','documents','included'), ('micro','adminConsole','included'), ('micro','settings','included'), ('micro','security','included'), ('micro','search','included'),
          ('small','companies','included'), ('small','partners','included'), ('small','representatives','included'), ('small','branches','included'), ('small','accounting','included'), ('small','hr','included'), ('small','documents','included'), ('small','audit','included'), ('small','actionCenter','included'), ('small','adminConsole','included'), ('small','settings','included'), ('small','security','included'), ('small','notifications','included'), ('small','search','included'),
          ('medium','companies','included'), ('medium','branches','included'), ('medium','partners','included'), ('medium','representatives','included'), ('medium','organization','included'), ('medium','facilities','included'), ('medium','accounting','included'), ('medium','hr','included'), ('medium','documents','included'), ('medium','audit','included'), ('medium','actionCenter','included'), ('medium','adminConsole','included'), ('medium','settings','included'), ('medium','security','included'), ('medium','notifications','included'), ('medium','search','included'), ('medium','project_management','included'), ('medium','contracts','included'),
          ('large','companies','included'), ('large','branches','included'), ('large','partners','included'), ('large','representatives','included'), ('large','organization','included'), ('large','facilities','included'), ('large','accounting','included'), ('large','hr','included'), ('large','documents','included'), ('large','audit','included'), ('large','actionCenter','included'), ('large','adminConsole','included'), ('large','settings','included'), ('large','security','included'), ('large','notifications','included'), ('large','search','included'), ('large','project_management','included'), ('large','contracts','included'), ('large','crm','included'), ('large','after_sales','included'), ('large','product_services','included'), ('large','reporting','included'), ('large','dataQuality','included'), ('large','importExport','included'),
          ('enterprise','companies','included'), ('enterprise','branches','included'), ('enterprise','partners','included'), ('enterprise','representatives','included'), ('enterprise','organization','included'), ('enterprise','facilities','included'), ('enterprise','accounting','included'), ('enterprise','hr','included'), ('enterprise','documents','included'), ('enterprise','audit','included'), ('enterprise','actionCenter','included'), ('enterprise','adminConsole','included'), ('enterprise','settings','included'), ('enterprise','security','included'), ('enterprise','notifications','included'), ('enterprise','search','included'), ('enterprise','project_management','included'), ('enterprise','contracts','included'), ('enterprise','crm','included'), ('enterprise','after_sales','included'), ('enterprise','product_services','included'), ('enterprise','reporting','included'), ('enterprise','dataQuality','included'), ('enterprise','importExport','included'), ('enterprise','customerPortal','included'), ('enterprise','integrations','included'), ('enterprise','automation','included'), ('enterprise','aiCopilot','included'), ('enterprise','process','included'), ('enterprise','outbox','included'),
          ('development','companies','internal'), ('development','branches','internal'), ('development','partners','internal'), ('development','representatives','internal'), ('development','organization','internal'), ('development','facilities','internal'), ('development','accounting','internal'), ('development','hr','internal'), ('development','documents','internal'), ('development','audit','internal'), ('development','actionCenter','internal'), ('development','adminConsole','internal'), ('development','settings','internal'), ('development','security','internal'), ('development','notifications','internal'), ('development','search','internal'), ('development','project_management','internal'), ('development','contracts','internal'), ('development','crm','internal'), ('development','after_sales','internal'), ('development','product_services','internal'), ('development','reporting','internal'), ('development','dataQuality','internal'), ('development','importExport','internal'), ('development','customerPortal','internal'), ('development','integrations','internal'), ('development','automation','internal'), ('development','aiCopilot','internal'), ('development','process','internal'), ('development','outbox','internal'), ('development','development','internal'), ('development','design_lab','internal'), ('development','diagnostics','internal'), ('development','theme_lab','internal'), ('development','feature_preview','internal'), ('development','portal_test','internal'), ('development','integration_test','internal'), ('development','automation_test','internal'), ('development','ai_test','internal')
        ) as v(plan_key, module_key, included_level) on v.plan_key = p.plan_key
        where lp.product_key = 'eden_erp'
        on conflict (product_plan_id, module_key) do update
        set enabled = true,
            included_level = excluded.included_level,
            metadata_json = excluded.metadata_json;
        """
    )
    op.execute(
        """
        insert into public.plan_features (product_plan_id, feature_key, enabled, metadata_json)
        select p.id, v.feature_key, true, '{"source":"migration_seed"}'::jsonb
        from public.product_license_plans p
        join public.licensed_products lp on lp.id = p.product_id
        join (values
          ('micro','documents.basic'), ('micro','accounting.basic'), ('micro','reporting.simple'),
          ('small','audit.view'), ('small','actionCenter.basic'), ('small','documents.basic'),
          ('medium','documents.requirements'), ('medium','audit.view'), ('medium','tasks.basic'), ('medium','contracts.basic'),
          ('large','crm.enabled'), ('large','afterSales.enabled'), ('large','reporting.advanced'), ('large','dataImport.enabled'),
          ('enterprise','portal.enabled'), ('enterprise','integrations.enabled'), ('enterprise','automation.enabled'), ('enterprise','aiCopilot.enabled'),
          ('development','development.designLab'), ('development','development.diagnostics'), ('development','development.featurePreview'), ('development','licensing.manage')
        ) as v(plan_key, feature_key) on v.plan_key = p.plan_key
        where lp.product_key = 'eden_erp'
        on conflict (product_plan_id, feature_key) do update
        set enabled = true,
            metadata_json = excluded.metadata_json;
        """
    )


def _seed_existing_workspace_default_licenses() -> None:
    op.execute(
        """
        do $$
        begin
          if to_regclass('public.workspace_settings') is not null then
            insert into public.tenant_licenses (
              tenant_id, product_id, product_plan_id, license_key, status, starts_at,
              billing_period, currency, payment_status, max_users, max_companies,
              max_branches, max_storage_mb, metadata_json
            )
            select ws.tenant_id, lp.id, p.id,
              concat(ws.tenant_id::text, ':eden_erp:medium'),
              'active',
              now(),
              'monthly',
              'TRY',
              'not_required',
              50,
              5,
              10,
              10240,
              jsonb_build_object('source', 'migration_workspace_fallback', 'migration_default_plan', 'medium')
            from public.workspace_settings ws
            join public.licensed_products lp on lp.product_key = 'eden_erp'
            join public.product_license_plans p on p.product_id = lp.id and p.plan_key = 'medium'
            where not exists (
              select 1
              from public.tenant_licenses tl
              where tl.tenant_id = ws.tenant_id
                and tl.product_id = lp.id
                and tl.status in ('trial','active','past_due','development','internal','suspended')
            );
          end if;
        end $$;
        """
    )
