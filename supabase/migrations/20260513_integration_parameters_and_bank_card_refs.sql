alter table if exists public.bank_cards
  add column if not exists branch_name text,
  add column if not exists branch_code text,
  add column if not exists linked_bank_account_id uuid references public.bank_accounts(id) on delete set null;

create index if not exists idx_bank_cards_linked_account
on public.bank_cards (linked_bank_account_id)
where is_deleted = false;

create table if not exists public.integration_parameters (
  id uuid primary key default gen_random_uuid(),
  integration_name text not null,
  bank_name text,
  provider_code text,
  provider_name text,
  integration_type text not null default 'api',
  environment text not null default 'sandbox',
  base_url text,
  token_url text,
  connection_status text not null default 'not_connected',
  credential_status text not null default 'not_configured',
  last_test_at timestamptz,
  last_sync_at timestamptz,
  api_status text,
  requires_certificate boolean not null default false,
  ip_whitelist_note text,
  error_message text,
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

create index if not exists idx_integration_parameters_status
on public.integration_parameters (status, integration_type)
where is_deleted = false;

insert into public.submodule_licenses (module_key, submodule_key, submodule_name, is_active, environment) values
  ('sistem', 'entegrasyon-ayarlari', 'Entegrasyon Ayarları', true, 'all')
on conflict (module_key, submodule_key) do update
set submodule_name = excluded.submodule_name,
    is_active = excluded.is_active,
    updated_at = now();

insert into public.permissions (permission_key, module_code, resource, action, description)
values
  ('bank_accounts_cards.view', 'accounting', 'bank_accounts_cards', 'view', 'Banka hesap ve kartlarını görüntüleme'),
  ('bank_accounts_cards.insert', 'accounting', 'bank_accounts_cards', 'insert', 'Banka hesap veya kartı oluşturma'),
  ('bank_accounts_cards.edit', 'accounting', 'bank_accounts_cards', 'edit', 'Banka hesap veya kartı düzenleme'),
  ('bank_accounts_cards.passivate', 'accounting', 'bank_accounts_cards', 'passivate', 'Banka hesap veya kartı pasifleştirme'),
  ('bank_accounts_cards.set_default', 'accounting', 'bank_accounts_cards', 'edit', 'Varsayılan banka hesap veya kartı belirleme'),
  ('integration_parameters.view', 'settings', 'integration_parameters', 'view', 'Entegrasyon ayarlarını görüntüleme'),
  ('integration_parameters.edit', 'settings', 'integration_parameters', 'edit', 'Entegrasyon ayarlarını düzenleme'),
  ('bank_credentials.admin', 'settings', 'bank_credentials', 'admin', 'Banka credential yönetimi'),
  ('bank_credentials.insert', 'settings', 'bank_credentials', 'insert', 'Banka credential oluşturma'),
  ('bank_credentials.edit', 'settings', 'bank_credentials', 'edit', 'Banka credential düzenleme'),
  ('bank_credentials.rotate', 'settings', 'bank_credentials', 'edit', 'Banka credential rotasyonu'),
  ('bank_credentials.test', 'settings', 'bank_credentials', 'test', 'Banka credential testi')
on conflict (permission_key) do nothing;
