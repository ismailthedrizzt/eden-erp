alter table public.employees
  add column if not exists diploma_belgesi jsonb;
