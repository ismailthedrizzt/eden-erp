# ruff: noqa: E501
# operation contract hardening

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = '20260610_0200'
down_revision: str | None = '20260610_0120'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        '\n        create table if not exists public.tenant_sequence_counters (\n          tenant_id uuid not null,\n          sequence_key text not null,\n          next_value bigint not null,\n          created_at timestamp with time zone not null default now(),\n          updated_at timestamp with time zone not null default now(),\n          primary key (tenant_id, sequence_key)\n        )\n        '
    )
    op.execute(
        '\n        delete from public.operation_requests r\n        using public.operation_requests keep\n        where r.tenant_id = keep.tenant_id\n          and r.operation_type = keep.operation_type\n          and r.entity_type = keep.entity_type\n          and r.entity_id = keep.entity_id\n          and r.client_request_id = keep.client_request_id\n          and r.requested_by is not distinct from keep.requested_by\n          and keep.created_at <= r.created_at\n          and keep.ctid < r.ctid\n        '
    )
    op.execute(
        '\n        create unique index if not exists uq_operation_requests_context_idempotency\n        on public.operation_requests (\n          tenant_id,\n          operation_type,\n          entity_type,\n          entity_id,\n          client_request_id,\n          requested_by\n        )\n        where client_request_id is not null\n        '
    )
    op.execute(
        '\n        create index if not exists ix_operation_requests_tenant_status\n        on public.operation_requests (tenant_id, operation_status, created_at desc)\n        '
    )


def downgrade() -> None:
    raise RuntimeError('Operation contract hardening migration is not safely downgradable.')
