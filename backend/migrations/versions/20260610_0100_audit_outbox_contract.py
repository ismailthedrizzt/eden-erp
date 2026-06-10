# ruff: noqa: E501

"""audit and outbox persistence contract

Revision ID: 20260610_0100
Revises: 20260608_0300
Create Date: 2026-06-10
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "20260610_0100"
down_revision: str | None = "20260608_0300"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        alter table public.outbox_events
            alter column aggregate_id type text using aggregate_id::text,
            add column if not exists event_version text not null default '1.0',
            add column if not exists process_instance_id uuid,
            add column if not exists causation_id uuid,
            add column if not exists correlation_id text,
            add column if not exists metadata_json jsonb not null default '{}'::jsonb,
            add column if not exists retry_count integer not null default 0,
            add column if not exists max_retries integer not null default 5,
            add column if not exists locked_at timestamp with time zone,
            add column if not exists locked_by text,
            add column if not exists occurred_at timestamp with time zone not null default now(),
            add column if not exists updated_at timestamp with time zone not null default now();
        """
    )
    op.execute(
        """
        update public.outbox_events
        set event_version = coalesce(event_version, '1.0'),
            metadata_json = coalesce(metadata_json, '{}'::jsonb),
            retry_count = coalesce(retry_count, 0),
            max_retries = coalesce(max_retries, 5),
            occurred_at = coalesce(occurred_at, created_at, now()),
            updated_at = coalesce(updated_at, created_at, now());
        """
    )
    op.execute(
        """
        create index if not exists ix_outbox_events_pending_dispatch
            on public.outbox_events (status, occurred_at, created_at);
        """
    )
    op.execute(
        """
        create index if not exists ix_outbox_events_aggregate
            on public.outbox_events (aggregate_type, aggregate_id);
        """
    )
    op.execute(
        """
        create index if not exists ix_outbox_events_tenant_module
            on public.outbox_events (tenant_id, module_key, event_type);
        """
    )
    op.execute(
        """
        alter table public.audit_logs
            add column if not exists tenant_id uuid,
            add column if not exists company_id uuid,
            add column if not exists branch_id uuid,
            add column if not exists module_key text,
            add column if not exists entity_type text,
            add column if not exists entity_id text,
            add column if not exists action_type text,
            add column if not exists action_key text,
            add column if not exists operation_id uuid,
            add column if not exists process_instance_id uuid,
            add column if not exists task_id uuid,
            add column if not exists approval_id uuid,
            add column if not exists outbox_event_id uuid,
            add column if not exists old_values jsonb,
            add column if not exists new_values jsonb,
            add column if not exists changed_fields text[] not null default '{}',
            add column if not exists summary text,
            add column if not exists result_status text not null default 'success',
            add column if not exists severity text not null default 'info';
        """
    )
    op.execute(
        """
        update public.audit_logs
        set module_key = coalesce(module_key, module_code),
            entity_type = coalesce(entity_type, resource),
            entity_id = coalesce(entity_id, record_id),
            action_type = coalesce(action_type, action),
            action_key = coalesce(action_key, action),
            old_values = coalesce(old_values, before_json, '{}'::jsonb),
            new_values = coalesce(new_values, after_json, '{}'::jsonb),
            result_status = coalesce(result_status, 'success'),
            severity = coalesce(severity, 'info');
        """
    )
    op.execute(
        """
        create index if not exists ix_audit_logs_tenant_created
            on public.audit_logs (tenant_id, created_at desc);
        """
    )
    op.execute(
        """
        create index if not exists ix_audit_logs_record
            on public.audit_logs (entity_type, entity_id);
        """
    )
    op.execute(
        """
        create index if not exists ix_audit_logs_operation
            on public.audit_logs (operation_id);
        """
    )


def downgrade() -> None:
    raise RuntimeError(
        "audit/outbox persistence contract columns are production data columns and are not safely downgradable."
    )
