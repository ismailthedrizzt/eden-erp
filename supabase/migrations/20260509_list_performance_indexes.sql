create index if not exists idx_persons_is_deleted
on public.persons (is_deleted);

create index if not exists idx_organizations_is_deleted
on public.organizations (is_deleted);

create index if not exists idx_employees_company_deleted_status
on public.employees (company_id, is_active, calisma_durumu);

create index if not exists idx_employees_updated_at
on public.employees (updated_at);

create index if not exists idx_sirketler_deleted_status
on public.sirketler (is_deleted, is_active);

create index if not exists idx_sirketler_updated_at
on public.sirketler (updated_at);

create index if not exists idx_sirket_ortaklar_company_deleted_status
on public.sirket_ortaklar (sirket_id, is_deleted, status);

create index if not exists idx_sirket_temsilciler_company_deleted_status
on public.sirket_temsilciler (sirket_id, is_deleted, status);

create index if not exists idx_stakeholders_company_deleted_status
on public.stakeholders (company_id, is_deleted, status);

create index if not exists idx_nakit_islemler_filters
on public.nakit_islemler (islem_tarafi, proje, tarih desc);
