alter table if exists public.sirket_ortaklar
  add column if not exists record_status text not null default 'draft';

update public.sirket_ortaklar
set record_status = case
  when coalesce(is_deleted, false) = true or status = 'Pasif' then 'passive'
  when status = 'Aktif' then 'active'
  else 'draft'
end
where record_status is null
  or record_status not in ('draft', 'active', 'passive');

alter table if exists public.sirket_ortaklar
  drop constraint if exists sirket_ortaklar_status_check,
  drop constraint if exists sirket_ortaklar_record_status_check;

alter table if exists public.sirket_ortaklar
  add constraint sirket_ortaklar_status_check
    check (status in ('Taslak', 'Aktif', 'Pasif', 'Devredildi', 'Askida', 'Askıda', 'Tarihsel')),
  add constraint sirket_ortaklar_record_status_check
    check (record_status in ('draft', 'active', 'passive'));

create index if not exists idx_sirket_ortaklar_record_status
  on public.sirket_ortaklar(record_status, is_deleted, created_at desc);

create table if not exists public.partner_ownership_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.sirket_ortaklar(id) on delete cascade,
  company_id uuid references public.sirketler(id),
  event_type text not null,
  event_date date default current_date,
  old_record_status text,
  new_record_status text,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid
);

alter table if exists public.partner_ownership_lifecycle_events
  drop constraint if exists partner_ownership_lifecycle_events_event_type_check;

alter table if exists public.partner_ownership_lifecycle_events
  add constraint partner_ownership_lifecycle_events_event_type_check
    check (event_type in (
      'created_as_draft',
      'ownership_defined',
      'share_transfer_started',
      'share_transfer_completed',
      'capital_change_started',
      'capital_change_completed',
      'status_changed'
    ));

create index if not exists idx_partner_ownership_lifecycle_events_partner
  on public.partner_ownership_lifecycle_events(partner_id, created_at desc);
