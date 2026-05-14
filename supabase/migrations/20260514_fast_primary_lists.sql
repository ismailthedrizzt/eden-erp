create index if not exists idx_sirketler_active_name_fast
on public.sirketler (is_deleted, kisa_unvan, id);

create index if not exists idx_employees_active_name_fast
on public.employees (is_deleted, soyad, ad, id);

create index if not exists idx_sirket_ortaklar_company_active_fast
on public.sirket_ortaklar (company_id, is_deleted, created_at desc);

create index if not exists idx_sirket_ortaklar_sirket_active_fast
on public.sirket_ortaklar (sirket_id, is_deleted, created_at desc);

create index if not exists idx_sirket_temsilciler_company_active_fast
on public.sirket_temsilciler (company_id, is_deleted, created_at desc);

create index if not exists idx_sirket_temsilciler_sirket_active_fast
on public.sirket_temsilciler (sirket_id, is_deleted, created_at desc);

create index if not exists idx_stakeholders_company_active_fast
on public.stakeholders (company_id, is_deleted, created_at desc);

create index if not exists idx_birimler_active_tree_fast
on public.birimler (is_deleted, sirket_id, ust_birim_id, ad, id);

create index if not exists idx_norm_kadrolar_active_unit_fast
on public.norm_kadrolar (is_deleted, birim_id, unvan, id);

create index if not exists idx_ownership_transactions_company_fast
on public.ownership_transactions (company_id, created_at desc, id);

create index if not exists idx_company_vehicles_active_fast
on public.company_vehicles (is_deleted, company_id, created_at desc, id);
