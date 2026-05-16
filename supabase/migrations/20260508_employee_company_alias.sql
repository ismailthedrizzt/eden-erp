alter table if exists public.employees
  add column if not exists company_id uuid references public.sirketler(id) on delete set null;

update public.employees
set company_id = sirket_id
where company_id is null
  and sirket_id is not null;

create index if not exists idx_employees_company_id
  on public.employees(company_id)
  where company_id is not null;
