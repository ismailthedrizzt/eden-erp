alter table if exists public.employees
  add column if not exists is_deleted boolean not null default false;

update public.employees
set is_deleted = true
where coalesce(is_active, true) = false;

drop index if exists public.idx_employees_active;
drop index if exists public.idx_employees_company_deleted_status;

alter table if exists public.employees
  drop column if exists is_active,
  drop column if exists deleted_at,
  drop column if exists deleted_by;

create index if not exists idx_employees_company_deleted_status
on public.employees (company_id, is_deleted, calisma_durumu);

alter table if exists public.sirketler
  add column if not exists is_deleted boolean not null default false;

update public.sirketler
set is_deleted = true
where coalesce(is_active, true) = false
   or company_status = 'terkin_edilmis';

drop index if exists public.idx_sirketler_is_active;
drop index if exists public.idx_sirketler_deleted_status;
drop index if exists public.idx_sirketler_company_status;

alter table if exists public.sirketler
  drop column if exists is_active,
  drop column if exists company_status,
  drop column if exists deleted_at,
  drop column if exists deleted_by;

create index if not exists idx_sirketler_deleted_status
on public.sirketler (is_deleted);
