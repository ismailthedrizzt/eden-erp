# ruff: noqa: E501

"""Customer onboarding and first-run workspace setup.

Revision ID: 20260529_1900
Revises: 20260528_1800
Create Date: 2026-05-29 09:00:00.000000
"""

from __future__ import annotations

from alembic import op

revision = "20260529_1900"
down_revision = "20260528_1800"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        create table if not exists public.workspace_onboarding_state (
          id uuid primary key,
          tenant_id uuid not null,
          onboarding_version text not null default 'v1',
          status text not null default 'not_started',
          first_login_at timestamptz null,
          completed_at timestamptz null,
          skipped_at timestamptz null,
          current_step text null,
          completed_steps jsonb not null default '[]'::jsonb,
          dismissed_steps jsonb not null default '[]'::jsonb,
          recommended_steps jsonb not null default '[]'::jsonb,
          workspace_profile jsonb not null default '{}'::jsonb,
          selected_module_packages jsonb not null default '[]'::jsonb,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          constraint workspace_onboarding_status_check
            check (status in ('not_started','in_progress','completed','skipped')),
          unique (tenant_id, onboarding_version)
        );
        """
    )
    op.execute("create index if not exists idx_workspace_onboarding_tenant_status on public.workspace_onboarding_state (tenant_id, status, updated_at desc);")
    op.execute("create index if not exists idx_workspace_onboarding_current_step on public.workspace_onboarding_state (tenant_id, current_step);")


def downgrade() -> None:
    op.execute("drop table if exists public.workspace_onboarding_state;")
