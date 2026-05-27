-- Eden ERP Step 17 performance index preparation.
-- Indexes are non-unique and table-gated so this migration can run across
-- partially migrated staging databases. For very large production tables,
-- run a reviewed CONCURRENTLY variant outside transaction-wrapped runners.

create or replace function pg_temp.eden_create_index_if_table_exists(
  target_table text,
  ddl text
) returns void
language plpgsql
as $$
begin
  if to_regclass(target_table) is not null then
    execute ddl;
  end if;
end;
$$;

select pg_temp.eden_create_index_if_table_exists(
  'public.companies',
  'create index if not exists idx_companies_tenant_deleted_status on public.companies (tenant_id, is_deleted, record_status)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.companies',
  'create index if not exists idx_companies_tenant_updated_at on public.companies (tenant_id, updated_at desc)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.companies',
  'create index if not exists idx_companies_tenant_tax_number on public.companies (tenant_id, tax_number)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.company_partners',
  'create index if not exists idx_company_partners_tenant_company_status on public.company_partners (tenant_id, company_id, record_status)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.company_partners',
  'create index if not exists idx_company_partners_tenant_company_updated on public.company_partners (tenant_id, company_id, updated_at desc)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.ownership_transactions',
  'create index if not exists idx_ownership_transactions_tenant_company_effective on public.ownership_transactions (tenant_id, company_id, effective_date desc)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.ownership_transactions',
  'create index if not exists idx_ownership_transactions_tenant_partner_effective on public.ownership_transactions (tenant_id, partner_id, effective_date desc)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.company_representatives',
  'create index if not exists idx_company_representatives_tenant_company_status on public.company_representatives (tenant_id, company_id, record_status)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.company_representatives',
  'create index if not exists idx_company_representatives_tenant_updated on public.company_representatives (tenant_id, updated_at desc)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.representative_authority_transactions',
  'create index if not exists idx_representative_authority_tx_tenant_company_rep on public.representative_authority_transactions (tenant_id, company_id, representative_id)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.representative_authority_transactions',
  'create index if not exists idx_representative_authority_tx_tenant_branch on public.representative_authority_transactions (tenant_id, branch_id)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.company_branches',
  'create index if not exists idx_company_branches_tenant_company_status on public.company_branches (tenant_id, company_id, record_status)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.company_branches',
  'create index if not exists idx_company_branches_tenant_company_updated on public.company_branches (tenant_id, company_id, updated_at desc)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.organization_units',
  'create index if not exists idx_organization_units_tenant_company_parent on public.organization_units (tenant_id, company_id, parent_unit_id)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.facilities',
  'create index if not exists idx_facilities_tenant_company_status on public.facilities (tenant_id, company_id, record_status)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.operation_requests',
  'create index if not exists idx_operation_requests_tenant_status_created on public.operation_requests (tenant_id, status, created_at desc)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.operation_requests',
  'create index if not exists idx_operation_requests_tenant_client_request on public.operation_requests (tenant_id, client_request_id)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.outbox_events',
  'create index if not exists idx_outbox_events_status_created on public.outbox_events (status, created_at)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.outbox_events',
  'create index if not exists idx_outbox_events_tenant_status_created on public.outbox_events (tenant_id, status, created_at)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.outbox_events',
  'create index if not exists idx_outbox_events_locked_at on public.outbox_events (locked_at)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.process_instances',
  'create index if not exists idx_process_instances_tenant_status_created on public.process_instances (tenant_id, status, created_at desc)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.process_tasks',
  'create index if not exists idx_process_tasks_tenant_status_due on public.process_tasks (tenant_id, status, due_at)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.process_approvals',
  'create index if not exists idx_process_approvals_tenant_status_requested on public.process_approvals (tenant_id, status, requested_at)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.audit_logs',
  'create index if not exists idx_audit_logs_tenant_created on public.audit_logs (tenant_id, created_at desc)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.audit_logs',
  'create index if not exists idx_audit_logs_tenant_company_created on public.audit_logs (tenant_id, company_id, created_at desc)'
);
select pg_temp.eden_create_index_if_table_exists(
  'public.audit_logs',
  'create index if not exists idx_audit_logs_entity_created on public.audit_logs (entity_type, entity_id, created_at desc)'
);
