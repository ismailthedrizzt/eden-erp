create table if not exists public.nace_codes (
  id uuid primary key default gen_random_uuid(),
  nace_code text not null unique,
  description text not null,
  hazard_class text not null check (hazard_class in ('Az Tehlikeli', 'Tehlikeli', 'Çok Tehlikeli')),
  source_name text not null,
  source_url text,
  source_reference text,
  valid_from date,
  valid_to date,
  is_active boolean not null default true,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);

create table if not exists public.nace_reference_update_logs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null default 'weekly_nace_reference_update',
  source_name text,
  source_url text,
  status text not null,
  message text,
  imported_count integer not null default 0,
  updated_count integer not null default 0,
  deactivated_count integer not null default 0,
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid
);

create table if not exists public.company_nace_codes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.sirketler(id) on delete cascade,
  nace_code_id uuid not null references public.nace_codes(id) on delete restrict,
  is_primary boolean not null default false,
  status text not null default 'active',
  start_date date,
  end_date date,
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

create index if not exists idx_nace_codes_search
on public.nace_codes (nace_code, is_active);

create index if not exists idx_company_nace_company_status
on public.company_nace_codes (company_id, status)
where is_deleted = false;

create unique index if not exists ux_company_nace_active_code
on public.company_nace_codes (company_id, nace_code_id)
where is_deleted = false and status = 'active';

create unique index if not exists ux_company_nace_one_primary
on public.company_nace_codes (company_id)
where is_deleted = false and status = 'active' and is_primary = true;

create or replace function public.enforce_company_nace_rules()
returns trigger
language plpgsql
as $$
declare
  active_count integer;
begin
  if new.is_deleted = false and new.status = 'active' then
    select count(*)
      into active_count
      from public.company_nace_codes
      where company_id = new.company_id
        and is_deleted = false
        and status = 'active'
        and id is distinct from new.id;

    if tg_op = 'INSERT' and active_count >= 5 then
      raise exception 'Bir şirket için en fazla 5 aktif NACE kodu tanımlanabilir.';
    end if;

    if tg_op = 'UPDATE' and (old.is_deleted = true or old.status <> 'active') and active_count >= 5 then
      raise exception 'Bir şirket için en fazla 5 aktif NACE kodu tanımlanabilir.';
    end if;
  end if;

  if new.is_primary = true and (new.is_deleted = true or new.status <> 'active') then
    raise exception 'Pasif NACE kodu birincil olamaz.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_company_nace_rules on public.company_nace_codes;
create trigger trg_company_nace_rules
before insert or update on public.company_nace_codes
for each row execute function public.enforce_company_nace_rules();

create or replace function public.company_nace_audit()
returns trigger
language plpgsql
as $$
declare
  action_name text;
  actor_id uuid;
begin
  if tg_op = 'INSERT' then
    action_name := 'company_nace_added';
    actor_id := coalesce(new.updated_by, new.created_by);
  elsif new.is_deleted = true and coalesce(old.is_deleted, false) = false then
    action_name := 'company_nace_passivated';
    actor_id := coalesce(new.updated_by, new.created_by, old.updated_by, old.created_by);
  elsif new.is_primary = true and coalesce(old.is_primary, false) = false then
    action_name := 'company_nace_set_primary';
    actor_id := coalesce(new.updated_by, new.created_by, old.updated_by, old.created_by);
  else
    action_name := 'company_nace_updated';
    actor_id := coalesce(new.updated_by, new.created_by, old.updated_by, old.created_by);
  end if;

  insert into public.audit_logs (user_id, module_code, resource, record_id, action, before_json, after_json)
  values (
    actor_id,
    'companies',
    'company_nace',
    new.id::text,
    action_name,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    to_jsonb(new)
  );

  return new;
end;
$$;

drop trigger if exists trg_company_nace_audit on public.company_nace_codes;
create trigger trg_company_nace_audit
after insert or update on public.company_nace_codes
for each row execute function public.company_nace_audit();

insert into public.permissions (permission_key, module_code, resource, action, description)
values
  ('company_public.view', 'companies', 'company_public', 'view', 'Şirket kamu bilgilerini görüntüleme'),
  ('company_public.edit', 'companies', 'company_public', 'edit', 'Şirket kamu bilgilerini düzenleme'),
  ('company_nace.view', 'companies', 'company_nace', 'view', 'Şirket NACE kodlarını görüntüleme'),
  ('company_nace.insert', 'companies', 'company_nace', 'insert', 'Şirket NACE kodu ekleme'),
  ('company_nace.edit', 'companies', 'company_nace', 'edit', 'Şirket NACE kodu düzenleme'),
  ('company_nace.passivate', 'companies', 'company_nace', 'passivate', 'Şirket NACE kodu pasifleştirme'),
  ('company_nace.set_primary', 'companies', 'company_nace', 'approve', 'Birincil NACE kodu belirleme'),
  ('nace_reference.view', 'companies', 'nace_reference', 'view', 'NACE referans listesini görüntüleme'),
  ('nace_reference.import', 'companies', 'nace_reference', 'insert', 'NACE referans listesini içe aktarma'),
  ('nace_reference.update', 'companies', 'nace_reference', 'edit', 'NACE referans listesini güncelleme'),
  ('nace_reference.admin', 'companies', 'nace_reference', 'approve', 'NACE referans listesi yönetimi')
on conflict (permission_key) do nothing;
