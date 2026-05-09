alter table if exists public.employees
  add column if not exists employee_no text,
  add column if not exists employment_status text,
  add column if not exists start_date date,
  add column if not exists calisma_tipi text,
  add column if not exists version integer not null default 1;

create index if not exists idx_employees_employee_no
on public.employees (employee_no)
where employee_no is not null and btrim(employee_no) <> '';
