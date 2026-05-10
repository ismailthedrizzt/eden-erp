create extension if not exists "pgcrypto";

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.permissions'::regclass
      and conname = 'permissions_action_check'
  ) then
    alter table public.permissions drop constraint permissions_action_check;
  end if;
end $$;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.sirketler(id) on delete set null,
  document_type text not null check (document_type in (
    'Vergi Levhası',
    'İmza Sirküleri',
    'Ticaret Sicil Gazetesi',
    'Faaliyet Belgesi',
    'Vekaletname',
    'Yönetim Kurulu Kararı',
    'Ortaklar Kurulu Kararı',
    'Sözleşme',
    'Ruhsat',
    'Kimlik',
    'Pasaport',
    'Diğer'
  )),
  document_title text not null,
  document_no text,
  issue_date date,
  expiry_date date,
  issuing_authority text,
  status text not null default 'active' check (status in ('draft', 'active', 'expired', 'revoked', 'archived')),
  confidentiality_level text not null default 'internal' check (confidentiality_level in ('public', 'internal', 'confidential', 'sensitive')),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid,
  version integer not null default 1
);

create table if not exists public.document_files (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete restrict,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null default 0 check (file_size >= 0),
  file_hash text,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid,
  version_no integer not null default 1 check (version_no > 0),
  is_current_version boolean not null default true,
  unique (document_id, version_no)
);

create unique index if not exists uq_document_files_current_version
  on public.document_files(document_id)
  where is_current_version;

create table if not exists public.document_links (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete restrict,
  linked_module text not null,
  linked_record_id uuid not null,
  link_type text not null,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  entity_kind text not null check (entity_kind in ('person', 'organization', 'company', 'vehicle')),
  person_id uuid references public.persons(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  company_id uuid references public.sirketler(id) on delete set null,
  linked_module text,
  linked_record_id uuid,
  media_type text not null check (media_type in ('profile_photo', 'logo', 'vehicle_photo', 'gallery')),
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid,
  is_deleted boolean not null default false,
  version integer not null default 1
);

create unique index if not exists uq_media_assets_primary_person
  on public.media_assets(person_id, media_type)
  where is_primary and is_deleted = false and person_id is not null;

create unique index if not exists uq_media_assets_primary_organization
  on public.media_assets(organization_id, media_type)
  where is_primary and is_deleted = false and organization_id is not null;

create unique index if not exists uq_media_assets_primary_company
  on public.media_assets(company_id, media_type)
  where is_primary and is_deleted = false and company_id is not null;

create index if not exists idx_documents_company_type on public.documents(company_id, document_type) where is_deleted = false;
create index if not exists idx_documents_status on public.documents(status) where is_deleted = false;
create index if not exists idx_document_links_record on public.document_links(linked_module, linked_record_id, link_type) where is_deleted = false;
create index if not exists idx_document_links_document on public.document_links(document_id) where is_deleted = false;
create index if not exists idx_media_assets_master_person on public.media_assets(person_id, media_type) where is_deleted = false;
create index if not exists idx_media_assets_master_organization on public.media_assets(organization_id, media_type) where is_deleted = false;
create index if not exists idx_media_assets_module_record on public.media_assets(linked_module, linked_record_id, media_type) where is_deleted = false;

create or replace function public.document_registry_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  new.version = coalesce(old.version, 0) + 1;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at
before update on public.documents
for each row execute function public.document_registry_touch_updated_at();

create or replace function public.document_files_enforce_current_version()
returns trigger as $$
begin
  if new.is_current_version then
    update public.document_files
    set is_current_version = false
    where document_id = new.document_id
      and id <> new.id
      and is_current_version = true;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_document_files_current_version on public.document_files;
create trigger trg_document_files_current_version
before insert or update of is_current_version on public.document_files
for each row execute function public.document_files_enforce_current_version();

create or replace function public.document_media_registry_audit()
returns trigger as $$
declare
  actor uuid;
  action_name text;
begin
  actor := coalesce(
    case when tg_op in ('INSERT', 'UPDATE') then (to_jsonb(new)->>'created_by')::uuid else null end,
    case when tg_op in ('INSERT', 'UPDATE') then (to_jsonb(new)->>'updated_by')::uuid else null end,
    case when tg_op in ('UPDATE', 'DELETE') then (to_jsonb(old)->>'deleted_by')::uuid else null end
  );

  action_name := case
    when tg_table_name = 'documents' and tg_op = 'INSERT' then 'document_uploaded'
    when tg_table_name = 'document_files' and tg_op = 'INSERT' then 'document_version_changed'
    when tg_table_name = 'document_links' and tg_op = 'INSERT' then 'document_linked'
    when tg_table_name = 'document_links' and tg_op = 'UPDATE' and new.is_deleted and not old.is_deleted then 'document_unlinked'
    when tg_table_name = 'media_assets' and tg_op = 'INSERT' then 'media_uploaded'
    when tg_table_name = 'media_assets' and tg_op = 'UPDATE' then 'media_changed'
    else lower(tg_table_name || '_' || tg_op)
  end;

  insert into public.audit_logs (user_id, module_code, resource, record_id, action, before_json, after_json)
  values (
    actor,
    case when tg_table_name = 'media_assets' then 'media' else 'documents' end,
    tg_table_name,
    coalesce((case when tg_op = 'DELETE' then old.id else new.id end)::text, null),
    action_name,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$ language plpgsql;

drop trigger if exists trg_documents_audit on public.documents;
create trigger trg_documents_audit after insert or update on public.documents
for each row execute function public.document_media_registry_audit();

drop trigger if exists trg_document_files_audit on public.document_files;
create trigger trg_document_files_audit after insert on public.document_files
for each row execute function public.document_media_registry_audit();

drop trigger if exists trg_document_links_audit on public.document_links;
create trigger trg_document_links_audit after insert or update on public.document_links
for each row execute function public.document_media_registry_audit();

drop trigger if exists trg_media_assets_audit on public.media_assets;
create trigger trg_media_assets_audit after insert or update on public.media_assets
for each row execute function public.document_media_registry_audit();

insert into public.permissions (permission_key, module_code, resource, action, description)
values
  ('documents.view', 'documents', 'documents', 'view', 'View document registry metadata'),
  ('documents.insert', 'documents', 'documents', 'insert', 'Create documents and upload first file version'),
  ('documents.link', 'documents', 'document_links', 'link', 'Link existing documents to module records'),
  ('documents.unlink', 'documents', 'document_links', 'unlink', 'Remove document references without deleting files'),
  ('documents.view_sensitive', 'documents', 'documents', 'view_sensitive', 'View sensitive documents such as identity, passport and signature circulars'),
  ('documents.download', 'documents', 'document_files', 'download', 'Generate signed download URLs for document files'),
  ('documents.version', 'documents', 'document_files', 'version', 'Upload a new document file version'),
  ('media.view', 'media', 'media_assets', 'view', 'View media registry assets'),
  ('media.insert', 'media', 'media_assets', 'insert', 'Upload new media assets'),
  ('media.link', 'media', 'media_assets', 'link', 'Reuse existing media assets across modules')
on conflict (permission_key) do nothing;

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('eden-documents', 'eden-documents', false, 52428800),
  ('eden-media', 'eden-media', false, 20971520)
on conflict (id) do update set public = excluded.public;

alter table public.documents enable row level security;
alter table public.document_files enable row level security;
alter table public.document_links enable row level security;
alter table public.media_assets enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'authenticated_read_documents') then
    create policy "authenticated_read_documents" on public.documents for select to authenticated using (is_deleted = false);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'document_files' and policyname = 'authenticated_read_document_files') then
    create policy "authenticated_read_document_files" on public.document_files for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'document_links' and policyname = 'authenticated_read_document_links') then
    create policy "authenticated_read_document_links" on public.document_links for select to authenticated using (is_deleted = false);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'media_assets' and policyname = 'authenticated_read_media_assets') then
    create policy "authenticated_read_media_assets" on public.media_assets for select to authenticated using (is_deleted = false);
  end if;
end $$;
