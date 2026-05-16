create table if not exists public.account_card_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.sirketler(id) on delete set null,
  entity_kind text not null check (entity_kind in ('person', 'organization')),
  person_id uuid references public.persons(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  account_code text,
  default_currency text not null default 'TRY',
  payment_term_days integer not null default 0,
  collection_term_days integer not null default 0,
  risk_limit numeric(18,2) not null default 0,
  credit_limit numeric(18,2) not null default 0,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid,
  version integer not null default 1,
  constraint account_card_settings_entity_check check (
    (entity_kind = 'person' and person_id is not null and organization_id is null)
    or
    (entity_kind = 'organization' and organization_id is not null and person_id is null)
  )
);

create unique index if not exists ux_account_card_settings_person_active
on public.account_card_settings (company_id, person_id)
where entity_kind = 'person' and is_deleted = false;

create unique index if not exists ux_account_card_settings_org_active
on public.account_card_settings (company_id, organization_id)
where entity_kind = 'organization' and is_deleted = false;

create table if not exists public.account_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.sirketler(id) on delete set null,
  movement_type text not null,
  movement_date date not null,
  description text,
  performed_by_person_id uuid references public.persons(id) on delete set null,
  counterparty_kind text not null check (counterparty_kind in ('person', 'organization')),
  counterparty_person_id uuid references public.persons(id) on delete set null,
  counterparty_organization_id uuid references public.organizations(id) on delete set null,
  direction text not null check (direction in ('debit', 'credit')),
  amount numeric(18,2) not null check (amount >= 0),
  currency text not null default 'TRY',
  exchange_rate numeric(18,6) not null default 1,
  local_amount numeric(18,2) generated always as (amount * exchange_rate) stored,
  payment_method text not null,
  payment_source_type text,
  payment_source_id uuid,
  document_status text not null default 'none',
  document_reference_id uuid,
  invoice_match_status text not null default 'none',
  bank_match_status text not null default 'none',
  reconciliation_status text not null default 'none',
  row_health_status text not null default 'missing_document',
  status text not null default 'Taslak',
  workflow_status text not null default 'none',
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid,
  version integer not null default 1,
  constraint account_movements_counterparty_check check (
    (counterparty_kind = 'person' and counterparty_person_id is not null and counterparty_organization_id is null)
    or
    (counterparty_kind = 'organization' and counterparty_organization_id is not null and counterparty_person_id is null)
  )
);

create index if not exists idx_account_movements_company_date
on public.account_movements (company_id, movement_date desc)
where is_deleted = false;

create index if not exists idx_account_movements_counterparty_person
on public.account_movements (counterparty_person_id)
where is_deleted = false;

create index if not exists idx_account_movements_counterparty_org
on public.account_movements (counterparty_organization_id)
where is_deleted = false;

create or replace view public.v_account_cards as
with movement_balances as (
  select
    company_id,
    counterparty_kind as entity_kind,
    counterparty_person_id as person_id,
    counterparty_organization_id as organization_id,
    currency,
    max(movement_date) as last_movement_date,
    sum(case when status in ('Onaylandı', 'Kesinleşti') then case when direction = 'debit' then local_amount else -local_amount end else 0 end) as official_balance,
    sum(case when status in ('Taslak', 'Onay Bekliyor') then case when direction = 'debit' then local_amount else -local_amount end else 0 end) as pending_balance
  from public.account_movements
  where is_deleted = false
  group by company_id, counterparty_kind, counterparty_person_id, counterparty_organization_id, currency
),
settings_or_movements as (
  select company_id, entity_kind, person_id, organization_id, default_currency as currency
  from public.account_card_settings
  where is_deleted = false
  union
  select company_id, entity_kind, person_id, organization_id, currency
  from movement_balances
  union
  select company_id, 'person'::text, person_id, null::uuid, 'TRY'::text
  from public.employees
  where person_id is not null and coalesce(is_deleted, false) = false
  union
  select id, 'organization'::text, null::uuid, organization_id, 'TRY'::text
  from public.sirketler
  where organization_id is not null and coalesce(is_deleted, false) = false
  union
  select coalesce(company_id, sirket_id), 'person'::text, person_id, null::uuid, 'TRY'::text
  from public.sirket_ortaklar
  where person_id is not null and coalesce(is_deleted, false) = false
  union
  select coalesce(company_id, sirket_id), 'organization'::text, null::uuid, organization_id, 'TRY'::text
  from public.sirket_ortaklar
  where organization_id is not null and coalesce(is_deleted, false) = false
  union
  select coalesce(company_id, sirket_id), 'person'::text, person_id, null::uuid, 'TRY'::text
  from public.sirket_temsilciler
  where person_id is not null and coalesce(is_deleted, false) = false
  union
  select coalesce(company_id, sirket_id), 'organization'::text, null::uuid, organization_id, 'TRY'::text
  from public.sirket_temsilciler
  where organization_id is not null and coalesce(is_deleted, false) = false
  union
  select company_id, 'person'::text, person_id, null::uuid, 'TRY'::text
  from public.stakeholders
  where person_id is not null and coalesce(is_deleted, false) = false
  union
  select company_id, 'organization'::text, null::uuid, organization_id, 'TRY'::text
  from public.stakeholders
  where organization_id is not null and coalesce(is_deleted, false) = false
)
select
  base.company_id,
  base.entity_kind,
  base.person_id,
  base.organization_id,
  coalesce(p.full_name, o.legal_name) as display_name,
  p.national_id as identity_no,
  o.tax_number as tax_no,
  array_remove(array[
    case when base.person_id is not null and exists (select 1 from public.employees e where e.person_id = base.person_id and coalesce(e.is_deleted, false) = false) then 'Çalışan' end,
    case when base.organization_id is not null and exists (select 1 from public.sirketler c where c.organization_id = base.organization_id and coalesce(c.is_deleted, false) = false) then 'Şirket' end,
    case when exists (select 1 from public.sirket_ortaklar sp where (sp.person_id = base.person_id or sp.organization_id = base.organization_id) and coalesce(sp.is_deleted, false) = false) then 'Ortak' end,
    case when exists (select 1 from public.sirket_temsilciler sr where (sr.person_id = base.person_id or sr.organization_id = base.organization_id) and coalesce(sr.is_deleted, false) = false) then 'Temsilci' end,
    case when exists (select 1 from public.stakeholders st where (st.person_id = base.person_id or st.organization_id = base.organization_id) and coalesce(st.is_deleted, false) = false) then 'Paydaş' end
  ], null) as roles,
  acs.account_code,
  coalesce(mb.official_balance, 0) as official_balance,
  coalesce(mb.pending_balance, 0) as pending_balance,
  coalesce(mb.official_balance, 0) + coalesce(mb.pending_balance, 0) as projected_balance,
  coalesce(acs.default_currency, base.currency, 'TRY') as currency,
  mb.last_movement_date,
  case
    when coalesce(acs.risk_limit, 0) > 0 and abs(coalesce(mb.official_balance, 0) + coalesce(mb.pending_balance, 0)) > acs.risk_limit then 'limit_exceeded'
    else 'normal'
  end as risk_status,
  coalesce(acs.status, 'passive') as status
from settings_or_movements base
left join public.account_card_settings acs
  on acs.company_id is not distinct from base.company_id
  and acs.entity_kind = base.entity_kind
  and acs.person_id is not distinct from base.person_id
  and acs.organization_id is not distinct from base.organization_id
  and acs.is_deleted = false
left join movement_balances mb
  on mb.company_id is not distinct from base.company_id
  and mb.entity_kind = base.entity_kind
  and mb.person_id is not distinct from base.person_id
  and mb.organization_id is not distinct from base.organization_id
  and mb.currency = base.currency
left join public.persons p on base.person_id = p.id
left join public.organizations o on base.organization_id = o.id;

insert into public.submodule_licenses (module_key, submodule_key, submodule_name, is_active, environment) values
  ('muhasebe', 'cari-kartlar', 'Cari Kartlar', true, 'all'),
  ('muhasebe', 'on-muhasebe-hareketleri', 'Ön Muhasebe Hareketleri', true, 'all')
on conflict (module_key, submodule_key) do update
set submodule_name = excluded.submodule_name,
    is_active = excluded.is_active,
    updated_at = now();
