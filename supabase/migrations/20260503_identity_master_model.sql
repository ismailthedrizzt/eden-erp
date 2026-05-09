create extension if not exists "pgcrypto";

create table if not exists persons (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  full_name text not null,
  nationality text not null default 'TR',
  national_id text,
  passport_no text,
  birth_date date,
  birth_place text,
  gender text,
  phone text,
  email text,
  address text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid,
  version integer not null default 1,
  workflow_status text not null default 'none' check (workflow_status in ('none', 'pending', 'approved', 'rejected', 'cancelled')),
  pending_request_id uuid,
  approved_version integer,
  draft_version integer
);

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  short_name text,
  country text not null default 'TR',
  tax_number text,
  registration_number text,
  tax_office text,
  organization_type text,
  phone text,
  email text,
  address text,
  city text,
  district text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid,
  version integer not null default 1,
  workflow_status text not null default 'none' check (workflow_status in ('none', 'pending', 'approved', 'rejected', 'cancelled')),
  pending_request_id uuid,
  approved_version integer,
  draft_version integer
);

create unique index if not exists ux_persons_national_identity
  on persons (lower(nationality), national_id)
  where national_id is not null and btrim(national_id) <> '' and coalesce(is_deleted, false) = false;

create unique index if not exists ux_persons_passport_identity
  on persons (lower(nationality), passport_no)
  where passport_no is not null and btrim(passport_no) <> '' and coalesce(is_deleted, false) = false;

create index if not exists idx_persons_weak_duplicate
  on persons (lower(full_name), birth_date, lower(nationality))
  where coalesce(is_deleted, false) = false;

create unique index if not exists ux_organizations_tax_identity
  on organizations (lower(country), tax_number)
  where tax_number is not null and btrim(tax_number) <> '' and coalesce(is_deleted, false) = false;

create unique index if not exists ux_organizations_registration_identity
  on organizations (lower(country), registration_number)
  where (tax_number is null or btrim(tax_number) = '')
    and registration_number is not null
    and btrim(registration_number) <> ''
    and coalesce(is_deleted, false) = false;

create index if not exists idx_organizations_weak_duplicate
  on organizations (lower(legal_name), lower(country))
  where coalesce(is_deleted, false) = false;

create table if not exists identity_duplicate_warnings (
  id uuid primary key default gen_random_uuid(),
  identity_kind text not null check (identity_kind in ('person', 'organization')),
  candidate_id uuid,
  matched_id uuid,
  match_type text not null check (match_type in ('exact', 'weak')),
  match_fields text[] not null default array[]::text[],
  payload_json jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  resolved_by uuid,
  resolution text check (resolution in ('use_existing', 'create_new', 'merge', 'dismiss')),
  created_at timestamptz not null default now(),
  created_by uuid
);

create table if not exists identity_merge_requests (
  id uuid primary key default gen_random_uuid(),
  identity_kind text not null check (identity_kind in ('person', 'organization')),
  source_id uuid not null,
  target_id uuid not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled', 'completed')),
  reason text,
  requested_by uuid,
  approved_by uuid,
  completed_by uuid,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table if exists sirketler
  add column if not exists organization_id uuid references organizations(id),
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz;

alter table if exists employees
  add column if not exists person_id uuid references persons(id),
  add column if not exists employee_no text,
  add column if not exists department_id uuid,
  add column if not exists employment_status text,
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid,
  add column if not exists deleted_by uuid,
  add column if not exists version integer not null default 1,
  add column if not exists workflow_status text not null default 'none' check (workflow_status in ('none', 'pending', 'approved', 'rejected', 'cancelled'));

alter table if exists sirket_ortaklar
  add column if not exists company_id uuid,
  add column if not exists person_id uuid references persons(id),
  add column if not exists organization_id uuid references organizations(id),
  add column if not exists version integer not null default 1,
  add column if not exists workflow_status text not null default 'none' check (workflow_status in ('none', 'pending', 'approved', 'rejected', 'cancelled'));

alter table if exists sirket_temsilciler
  add column if not exists company_id uuid,
  add column if not exists representative_kind text,
  add column if not exists person_id uuid references persons(id),
  add column if not exists organization_id uuid references organizations(id),
  add column if not exists version integer not null default 1,
  add column if not exists workflow_status text not null default 'none' check (workflow_status in ('none', 'pending', 'approved', 'rejected', 'cancelled'));

alter table if exists stakeholders
  add column if not exists stakeholder_kind text,
  add column if not exists version integer not null default 1,
  add column if not exists workflow_status text not null default 'none' check (workflow_status in ('none', 'pending', 'approved', 'rejected', 'cancelled'));

insert into organizations (legal_name, short_name, country, tax_number, registration_number, tax_office, organization_type, phone, email, address, city, district, metadata_json)
select
  s.ticari_unvan,
  s.kisa_unvan,
  coalesce(nullif(s.ulke, ''), 'TR'),
  nullif(s.vkn_tckn, ''),
  nullif(coalesce(s.ticaret_sicil_no, s.mersis_no), ''),
  nullif(s.vergi_dairesi, ''),
  nullif(s.sirket_turu, ''),
  nullif(s.telefon, ''),
  nullif(s.email, ''),
  nullif(s.adres, ''),
  nullif(s.il, ''),
  nullif(s.ilce, ''),
  jsonb_build_object('source_table', 'sirketler', 'source_id', s.id)
from sirketler s
where s.ticari_unvan is not null
  and not exists (
    select 1 from organizations o
    where coalesce(o.is_deleted, false) = false
      and (
        (s.vkn_tckn is not null and btrim(s.vkn_tckn) <> '' and lower(o.country) = lower(coalesce(nullif(s.ulke, ''), 'TR')) and o.tax_number = s.vkn_tckn)
        or (lower(o.legal_name) = lower(s.ticari_unvan) and lower(o.country) = lower(coalesce(nullif(s.ulke, ''), 'TR')))
      )
  );

update sirketler s
set organization_id = o.id
from organizations o
where s.organization_id is null
  and coalesce(o.is_deleted, false) = false
  and (
    (s.vkn_tckn is not null and btrim(s.vkn_tckn) <> '' and lower(o.country) = lower(coalesce(nullif(s.ulke, ''), 'TR')) and o.tax_number = s.vkn_tckn)
    or (lower(o.legal_name) = lower(s.ticari_unvan) and lower(o.country) = lower(coalesce(nullif(s.ulke, ''), 'TR')))
  );

insert into persons (first_name, last_name, full_name, nationality, national_id, passport_no, birth_date, birth_place, gender, phone, email, address, metadata_json)
select
  nullif(e.ad, ''),
  nullif(e.soyad, ''),
  btrim(concat_ws(' ', e.ad, e.soyad)),
  coalesce(nullif(e.uyruk, ''), 'TR'),
  nullif(e.tc_kimlik, ''),
  nullif(e.pasaport_no, ''),
  e.dogum_tarihi,
  nullif(e.dogum_yeri, ''),
  nullif(e.cinsiyet, ''),
  coalesce(nullif(e.cep_telefonu, ''), nullif(e.is_telefonu, '')),
  nullif(e.email, ''),
  nullif(e.adres, ''),
  jsonb_build_object('source_table', 'employees', 'source_id', e.id)
from employees e
where btrim(concat_ws(' ', e.ad, e.soyad)) <> ''
  and not exists (
    select 1 from persons p
    where coalesce(p.is_deleted, false) = false
      and (
        (e.tc_kimlik is not null and btrim(e.tc_kimlik) <> '' and lower(p.nationality) = lower(coalesce(nullif(e.uyruk, ''), 'TR')) and p.national_id = e.tc_kimlik)
        or (e.pasaport_no is not null and btrim(e.pasaport_no) <> '' and lower(p.nationality) = lower(coalesce(nullif(e.uyruk, ''), 'TR')) and p.passport_no = e.pasaport_no)
      )
  );

update employees e
set
  person_id = p.id,
  employment_status = coalesce(e.employment_status, e.calisma_durumu),
  start_date = coalesce(e.start_date, e.sgk_giris),
  end_date = coalesce(e.end_date, null),
  department_id = coalesce(e.department_id, e.birim_id)
from persons p
where e.person_id is null
  and coalesce(p.is_deleted, false) = false
  and (
    (e.tc_kimlik is not null and btrim(e.tc_kimlik) <> '' and lower(p.nationality) = lower(coalesce(nullif(e.uyruk, ''), 'TR')) and p.national_id = e.tc_kimlik)
    or (e.pasaport_no is not null and btrim(e.pasaport_no) <> '' and lower(p.nationality) = lower(coalesce(nullif(e.uyruk, ''), 'TR')) and p.passport_no = e.pasaport_no)
    or (lower(p.full_name) = lower(btrim(concat_ws(' ', e.ad, e.soyad))) and p.birth_date = e.dogum_tarihi and lower(p.nationality) = lower(coalesce(nullif(e.uyruk, ''), 'TR')))
  );

update sirket_ortaklar set company_id = sirket_id where company_id is null and sirket_id is not null;
update sirket_temsilciler set company_id = sirket_id where company_id is null and sirket_id is not null;
update sirket_temsilciler set representative_kind = case when person_kind = 'tuzel_kisi' then 'organization' else 'person' end where representative_kind is null;
update stakeholders set stakeholder_kind = case when stakeholder_type = 'tuzel_kisi' then 'organization' else 'person' end where stakeholder_kind is null;

insert into permissions (permission_key, module_code, resource, action)
values
  ('identity.view', 'companies', 'identity', 'view'),
  ('identity.insert', 'companies', 'identity', 'insert'),
  ('identity.edit', 'companies', 'identity', 'edit'),
  ('identity.approve', 'workflow', 'identity', 'approve'),
  ('identity.passivate', 'companies', 'identity', 'passivate')
on conflict (permission_key) do nothing;

create index if not exists idx_companies_organization on sirketler(organization_id);
create index if not exists idx_employees_person on employees(person_id);
create index if not exists idx_partners_identity on sirket_ortaklar(company_id, person_id, organization_id);
create index if not exists idx_representatives_identity on sirket_temsilciler(company_id, person_id, organization_id);
create index if not exists idx_stakeholders_identity on stakeholders(company_id, person_id, organization_id);
