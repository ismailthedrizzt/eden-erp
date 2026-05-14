create table if not exists public.entity_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  entity_kind text not null check (entity_kind in ('person', 'organization')),
  person_id uuid references public.persons(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  beneficiary_name text not null,
  is_same_as_master_name boolean not null default true,
  beneficiary_name_note text,
  iban text,
  account_number text,
  account_country text,
  account_currency text,
  bank_name text,
  bank_country text,
  bank_code text,
  branch_name text,
  branch_code text,
  swift_bic text,
  bank_address text,
  local_clearing_code_type text,
  local_clearing_code text,
  has_intermediary_bank boolean not null default false,
  intermediary_bank_name text,
  intermediary_swift_bic text,
  intermediary_bank_address text,
  intermediary_account_number text,
  preferred_currency text,
  payment_purpose text,
  swift_charge_type text check (swift_charge_type is null or swift_charge_type in ('SHA', 'OUR', 'BEN')),
  payment_note text,
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'manually_verified', 'document_verified', 'bank_integration_verified', 'invalid')),
  document_reference_id text,
  is_default boolean not null default false,
  status text not null default 'active' check (status in ('active', 'passive', 'invalid')),
  history jsonb not null default '[]'::jsonb,
  autofill_sources jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid,
  version integer not null default 1,
  constraint entity_bank_accounts_owner_check check (
    (entity_kind = 'person' and person_id is not null and organization_id is null)
    or
    (entity_kind = 'organization' and organization_id is not null and person_id is null)
  ),
  constraint entity_bank_accounts_identity_check check (
    nullif(trim(coalesce(iban, '')), '') is not null
    or nullif(trim(coalesce(account_number, '')), '') is not null
  )
);

create index if not exists idx_entity_bank_accounts_person
on public.entity_bank_accounts (person_id)
where is_deleted = false;

create index if not exists idx_entity_bank_accounts_organization
on public.entity_bank_accounts (organization_id)
where is_deleted = false;

create unique index if not exists uq_entity_bank_accounts_default_person
on public.entity_bank_accounts (person_id)
where entity_kind = 'person' and is_default = true and status = 'active' and is_deleted = false;

create unique index if not exists uq_entity_bank_accounts_default_organization
on public.entity_bank_accounts (organization_id)
where entity_kind = 'organization' and is_default = true and status = 'active' and is_deleted = false;

insert into public.permissions (permission_key, module_code, resource, action, description)
values
  ('entity_bank_accounts.view', 'identity', 'entity_bank_accounts', 'view', 'Master kişi/kurum banka bilgilerini görüntüleme'),
  ('entity_bank_accounts.insert', 'identity', 'entity_bank_accounts', 'insert', 'Master kişi/kurum banka bilgisi ekleme'),
  ('entity_bank_accounts.edit', 'identity', 'entity_bank_accounts', 'edit', 'Master kişi/kurum banka bilgisi düzenleme'),
  ('entity_bank_accounts.passivate', 'identity', 'entity_bank_accounts', 'passivate', 'Master kişi/kurum banka bilgisi pasifleştirme'),
  ('entity_bank_accounts.set_default', 'identity', 'entity_bank_accounts', 'edit', 'Varsayılan banka bilgisini belirleme'),
  ('entity_bank_accounts.view_sensitive', 'identity', 'entity_bank_accounts', 'view', 'Hassas banka bilgilerini görüntüleme'),
  ('entity_bank_accounts.verify', 'identity', 'entity_bank_accounts', 'approve', 'Banka bilgisi doğrulama')
on conflict (permission_key) do nothing;
