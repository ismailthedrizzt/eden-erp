alter table if exists public.employees
  add column if not exists is_deleted boolean not null default false,
  add column if not exists calisma_tipi text,
  add column if not exists is_akdi_bicimi text;

update public.employees
set is_deleted = true
where coalesce(is_active, true) = false;

create index if not exists idx_employees_active_name_fast
on public.employees (is_deleted, soyad, ad, id);

create index if not exists idx_employees_sirket_deleted_status
on public.employees (sirket_id, is_deleted, calisma_durumu);

