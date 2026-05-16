alter table if exists public.employees
  add column if not exists record_status text not null default 'draft';

alter table if exists public.employees
  drop constraint if exists employees_record_status_check;

alter table if exists public.employees
  add constraint employees_record_status_check
  check (record_status in ('draft', 'active', 'passive'));

update public.employees
set record_status = case
  when coalesce(is_deleted, false) then 'passive'
  when calisma_durumu = 'ayrilmis' then 'passive'
  when sgk_giris is not null then 'active'
  else 'draft'
end
where record_status is null
   or record_status not in ('draft', 'active', 'passive');

update public.employees
set employment_status = case
  when record_status = 'draft' then 'pending_entry'
  when record_status = 'active' then 'active'
  when record_status = 'passive' then 'terminated'
  else employment_status
end
where employment_status is null;

create table if not exists public.employee_work_relations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  company_id uuid,
  relationship_type text,
  sgk_responsibility text,
  payroll_included boolean default false,
  start_date date,
  end_date date,
  status text default 'draft',
  payment_type text,
  gross_net_type text,
  currency text,
  payment_period text,
  weekly_working_days numeric,
  daily_working_hours numeric,
  works_saturday boolean default false,
  works_sunday boolean default false,
  is_shift_based boolean default false,
  has_night_shift boolean default false,
  overtime_applicable boolean default false,
  works_on_public_holidays boolean default false,
  is_part_time boolean default false,
  is_remote boolean default false,
  workplace_type text,
  disability_status text,
  conviction_status text,
  contract_type text,
  contract_start_date date,
  contract_end_date date,
  service_type text,
  invoice_required boolean default false,
  account_card_id uuid,
  school_or_university text,
  internship_type text,
  internship_start_date date,
  internship_end_date date,
  school_sgk_notification_status text,
  school_sgk_document_id uuid,
  internship_protocol_document_id uuid,
  entry_date date,
  exit_date date,
  exit_reason text,
  created_at timestamptz not null default now(),
  created_by text,
  updated_at timestamptz not null default now(),
  updated_by text,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by text,
  version integer not null default 1,
  unique(employee_id)
);

create table if not exists public.employee_work_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  company_id uuid,
  event_type text not null,
  event_date date,
  relationship_type text,
  sgk_responsibility text,
  old_record_status text,
  new_record_status text,
  payload_json jsonb not null default '{}'::jsonb,
  document_reference_id uuid,
  created_at timestamptz not null default now(),
  created_by text
);

create index if not exists idx_employee_work_relations_employee
  on public.employee_work_relations(employee_id)
  where is_deleted = false;

create index if not exists idx_employee_work_lifecycle_events_employee
  on public.employee_work_lifecycle_events(employee_id, created_at desc);
