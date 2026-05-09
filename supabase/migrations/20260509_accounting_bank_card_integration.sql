create table if not exists public.accounting_bank_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.sirketler(id) on delete set null,
  provider_code text not null,
  provider_display_name text not null,
  connection_name text,
  connection_type text not null default 'bank' check (connection_type in ('bank', 'card', 'bank_and_card')),
  credential_id text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'revoked', 'error')),
  last_sync_at timestamptz,
  last_sync_status text,
  sync_cursor text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid,
  version integer not null default 1
);

create index if not exists idx_accounting_bank_connections_company_status
on public.accounting_bank_connections (company_id, status)
where is_deleted = false;

create index if not exists idx_accounting_bank_connections_provider
on public.accounting_bank_connections (provider_code)
where is_deleted = false;

create table if not exists public.accounting_bank_transactions (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.accounting_bank_connections(id) on delete cascade,
  company_id uuid references public.sirketler(id) on delete set null,
  provider_code text not null,
  external_account_id text,
  account_iban text,
  account_currency text,
  external_transaction_id text not null,
  transaction_date date not null,
  value_date date,
  description text,
  counterparty_name text,
  counterparty_iban text,
  direction text not null check (direction in ('debit', 'credit')),
  amount numeric(18,2) not null,
  currency text not null default 'TRY',
  balance_after numeric(18,2),
  match_status text not null default 'waiting' check (match_status in ('waiting', 'matched', 'mismatch_amount', 'mismatch_date', 'mismatch_counterparty', 'not_found', 'manual_match', 'ignored')),
  linked_movement_id uuid references public.account_movements(id) on delete set null,
  raw_provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid,
  version integer not null default 1,
  constraint ux_accounting_bank_transactions_external unique (connection_id, external_transaction_id)
);

create index if not exists idx_accounting_bank_transactions_waiting
on public.accounting_bank_transactions (company_id, transaction_date desc)
where is_deleted = false and match_status = 'waiting';

create index if not exists idx_accounting_bank_transactions_connection_date
on public.accounting_bank_transactions (connection_id, transaction_date desc)
where is_deleted = false;

create table if not exists public.accounting_card_transactions (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.accounting_bank_connections(id) on delete cascade,
  company_id uuid references public.sirketler(id) on delete set null,
  provider_code text not null,
  external_card_id text,
  masked_card_number text,
  card_currency text,
  external_transaction_id text not null,
  transaction_date date not null,
  provision_date date,
  merchant_name text,
  merchant_category text,
  description text,
  direction text not null default 'debit' check (direction in ('debit', 'credit')),
  amount numeric(18,2) not null,
  currency text not null default 'TRY',
  installment_count integer,
  match_status text not null default 'waiting' check (match_status in ('waiting', 'matched', 'mismatch_amount', 'mismatch_date', 'mismatch_counterparty', 'not_found', 'manual_match', 'ignored')),
  linked_movement_id uuid references public.account_movements(id) on delete set null,
  raw_provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid,
  version integer not null default 1,
  constraint ux_accounting_card_transactions_external unique (connection_id, external_transaction_id)
);

create index if not exists idx_accounting_card_transactions_waiting
on public.accounting_card_transactions (company_id, transaction_date desc)
where is_deleted = false and match_status = 'waiting';

create index if not exists idx_accounting_card_transactions_connection_date
on public.accounting_card_transactions (connection_id, transaction_date desc)
where is_deleted = false;

insert into public.submodule_licenses (module_key, submodule_key, submodule_name, is_active, environment) values
  ('muhasebe', 'banka-kart-hareketleri', 'Banka ve Kart Hareketleri', true, 'all')
on conflict (module_key, submodule_key) do update
set submodule_name = excluded.submodule_name,
    is_active = excluded.is_active,
    updated_at = now();

insert into public.permissions (permission_key, module_code, resource, action, description)
values
  ('bank_connections.view', 'accounting', 'bank_connections', 'view', 'Banka bağlantılarını görüntüleme'),
  ('bank_connections.edit', 'accounting', 'bank_connections', 'edit', 'Banka bağlantısı senkronizasyonu ve yönetimi'),
  ('bank_transactions.view', 'accounting', 'bank_transactions', 'view', 'Banka ve kart hareketlerini görüntüleme'),
  ('bank_transactions.edit', 'accounting', 'bank_transactions', 'edit', 'Banka ve kart hareketi eşleştirme')
on conflict (permission_key) do nothing;
