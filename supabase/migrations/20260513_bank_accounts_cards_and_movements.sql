create table if not exists public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.sirketler(id) on delete set null,
  bank_name text not null,
  provider_code text not null default 'manual',
  integration_type text not null default 'manual',
  connection_status text not null default 'not_connected',
  credential_id text,
  environment text not null default 'sandbox',
  base_url text,
  last_test_at timestamptz,
  last_sync_at timestamptz,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid,
  version integer not null default 1
);

create index if not exists idx_bank_connections_company_status
on public.bank_connections (company_id, status)
where is_deleted = false;

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.sirketler(id) on delete set null,
  bank_connection_id uuid references public.bank_connections(id) on delete cascade,
  iban text,
  account_no text,
  account_name text not null,
  branch_name text,
  branch_code text,
  currency text not null default 'TRY',
  account_type text not null default 'vadesiz',
  opening_date date,
  is_default boolean not null default false,
  last_balance numeric(18,2),
  last_sync_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid,
  version integer not null default 1
);

create index if not exists idx_bank_accounts_connection_status
on public.bank_accounts (bank_connection_id, status)
where is_deleted = false;

create table if not exists public.bank_cards (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.sirketler(id) on delete set null,
  bank_connection_id uuid references public.bank_connections(id) on delete cascade,
  card_name text not null,
  card_type text not null default 'credit_card',
  last_four_digits text,
  currency text not null default 'TRY',
  limit_amount numeric(18,2),
  available_limit numeric(18,2),
  statement_day integer,
  payment_due_day integer,
  is_default boolean not null default false,
  last_sync_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid,
  version integer not null default 1,
  constraint bank_cards_last_four_digits_check check (last_four_digits is null or last_four_digits ~ '^[0-9]{4}$')
);

create index if not exists idx_bank_cards_connection_status
on public.bank_cards (bank_connection_id, status)
where is_deleted = false;

create table if not exists public.financial_institution_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.sirketler(id) on delete set null,
  bank_connection_id uuid references public.bank_connections(id) on delete set null,
  bank_account_id uuid references public.bank_accounts(id) on delete set null,
  bank_card_id uuid references public.bank_cards(id) on delete set null,
  source_type text not null check (source_type in ('bank_account', 'card', 'pos', 'manual')),
  movement_type text,
  movement_date date not null,
  value_date date,
  description text,
  counterparty_name text,
  counterparty_iban text,
  reference_no text,
  amount numeric(18,2) not null,
  currency text not null default 'TRY',
  direction text not null check (direction in ('debit', 'credit')),
  source text not null default 'manual',
  external_transaction_id text,
  raw_data jsonb not null default '{}'::jsonb,
  match_status text not null default 'waiting' check (match_status in ('waiting', 'matched', 'manual_match', 'suggested', 'mismatch_amount', 'mismatch_date', 'mismatch_counterparty', 'not_found', 'review_required', 'cancelled')),
  matched_pre_accounting_movement_id uuid,
  matched_at timestamptz,
  matched_by uuid,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid,
  version integer not null default 1
);

create unique index if not exists ux_financial_movements_external
on public.financial_institution_movements (bank_connection_id, external_transaction_id)
where external_transaction_id is not null;

create index if not exists idx_financial_movements_filters
on public.financial_institution_movements (company_id, bank_connection_id, bank_account_id, bank_card_id, movement_date desc)
where is_deleted = false;

create index if not exists idx_financial_movements_match
on public.financial_institution_movements (match_status, movement_date desc)
where is_deleted = false;

insert into public.submodule_licenses (module_key, submodule_key, submodule_name, is_active, environment) values
  ('muhasebe', 'banka-hesaplari-ve-kartlari', 'Banka Hesapları ve Kartları', true, 'all'),
  ('muhasebe', 'hesap-ve-kart-hareketleri', 'Hesap ve Kart Hareketleri', true, 'all')
on conflict (module_key, submodule_key) do update
set submodule_name = excluded.submodule_name,
    is_active = excluded.is_active,
    updated_at = now();

insert into public.permissions (permission_key, module_code, resource, action, description)
values
  ('bank_connections.view', 'accounting', 'bank_connections', 'view', 'Banka bağlantılarını görüntüleme'),
  ('bank_connections.insert', 'accounting', 'bank_connections', 'insert', 'Banka bağlantısı oluşturma'),
  ('bank_connections.edit', 'accounting', 'bank_connections', 'edit', 'Banka bağlantısı düzenleme'),
  ('bank_connections.passivate', 'accounting', 'bank_connections', 'passivate', 'Banka bağlantısı pasifleştirme'),
  ('bank_connections.sync', 'accounting', 'bank_connections', 'sync', 'Banka bağlantısı senkronizasyonu'),
  ('bank_connections.test', 'accounting', 'bank_connections', 'test', 'Banka bağlantısı testi'),
  ('bank_accounts.view', 'accounting', 'bank_accounts', 'view', 'Banka hesaplarını görüntüleme'),
  ('bank_accounts.insert', 'accounting', 'bank_accounts', 'insert', 'Banka hesabı oluşturma'),
  ('bank_accounts.edit', 'accounting', 'bank_accounts', 'edit', 'Banka hesabı düzenleme'),
  ('bank_accounts.passivate', 'accounting', 'bank_accounts', 'passivate', 'Banka hesabı pasifleştirme'),
  ('bank_cards.view', 'accounting', 'bank_cards', 'view', 'Banka kartlarını görüntüleme'),
  ('bank_cards.insert', 'accounting', 'bank_cards', 'insert', 'Banka kartı oluşturma'),
  ('bank_cards.edit', 'accounting', 'bank_cards', 'edit', 'Banka kartı düzenleme'),
  ('bank_cards.passivate', 'accounting', 'bank_cards', 'passivate', 'Banka kartı pasifleştirme'),
  ('bank_movements.view', 'accounting', 'bank_movements', 'view', 'Hesap ve kart hareketlerini görüntüleme'),
  ('bank_movements.insert_manual', 'accounting', 'bank_movements', 'insert', 'Manuel hesap/kart hareketi ekleme'),
  ('bank_movements.sync', 'accounting', 'bank_movements', 'sync', 'Hesap/kart hareketi senkronizasyonu'),
  ('bank_movements.match', 'accounting', 'bank_movements', 'match', 'Hareket eşleştirme'),
  ('bank_movements.unmatch', 'accounting', 'bank_movements', 'edit', 'Hareket eşleşmesini kaldırma'),
  ('bank_movements.passivate', 'accounting', 'bank_movements', 'passivate', 'Hareket pasifleştirme'),
  ('bank_movements.export', 'accounting', 'bank_movements', 'export', 'Hareket dışa aktarımı'),
  ('preaccounting.insert', 'accounting', 'preaccounting', 'insert', 'Ön muhasebe hareketi oluşturma'),
  ('preaccounting.match', 'accounting', 'preaccounting', 'edit', 'Ön muhasebe eşleştirme')
on conflict (permission_key) do nothing;
