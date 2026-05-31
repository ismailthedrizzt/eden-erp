-- Eden ERP production hardening index and outbox status preparation.
-- This migration is table/column gated so it can run across partially
-- migrated staging databases. For very large production tables, create a
-- reviewed CONCURRENTLY variant because most migration runners wrap SQL in
-- a transaction.

create or replace function pg_temp.eden_create_index_if_columns_exist(
  target_table text,
  required_columns text[],
  ddl text
) returns void
language plpgsql
as $$
declare
  target_schema text;
  target_name text;
  missing_count integer;
begin
  if to_regclass(target_table) is null then
    return;
  end if;

  target_schema := split_part(target_table, '.', 1);
  target_name := split_part(target_table, '.', 2);
  if target_name = '' then
    target_schema := 'public';
    target_name := target_table;
  end if;

  select count(*)
    into missing_count
  from unnest(required_columns) as required(column_name)
  where not exists (
    select 1
    from information_schema.columns existing
    where existing.table_schema = target_schema
      and existing.table_name = target_name
      and existing.column_name = required.column_name
  );

  if missing_count = 0 then
    execute ddl;
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.outbox_events') is not null then
    alter table public.outbox_events
      drop constraint if exists outbox_events_status_check;
    alter table public.outbox_events
      add constraint outbox_events_status_check
      check (status in ('pending', 'processing', 'completed', 'published', 'failed', 'dead_letter', 'skipped'));
  end if;
end;
$$;

select pg_temp.eden_create_index_if_columns_exist(
  'public.audit_logs',
  array['tenant_id', 'action_key', 'created_at'],
  'create index if not exists idx_audit_logs_tenant_action_created on public.audit_logs (tenant_id, action_key, created_at desc)'
);
select pg_temp.eden_create_index_if_columns_exist(
  'public.audit_logs',
  array['tenant_id', 'user_id', 'created_at'],
  'create index if not exists idx_audit_logs_tenant_user_created on public.audit_logs (tenant_id, user_id, created_at desc)'
);
select pg_temp.eden_create_index_if_columns_exist(
  'public.outbox_events',
  array['tenant_id', 'status', 'retry_count', 'locked_at', 'occurred_at', 'created_at'],
  'create index if not exists idx_outbox_events_tenant_dispatch_lock on public.outbox_events (tenant_id, status, retry_count, locked_at, occurred_at, created_at)'
);
select pg_temp.eden_create_index_if_columns_exist(
  'public.outbox_events',
  array['tenant_id', 'event_type', 'created_at'],
  'create index if not exists idx_outbox_events_tenant_type_created on public.outbox_events (tenant_id, event_type, created_at desc)'
);
select pg_temp.eden_create_index_if_columns_exist(
  'public.process_tasks',
  array['tenant_id', 'assignee_user_id', 'status', 'due_at'],
  'create index if not exists idx_process_tasks_tenant_assignee_status_due on public.process_tasks (tenant_id, assignee_user_id, status, due_at)'
);
select pg_temp.eden_create_index_if_columns_exist(
  'public.documents',
  array['tenant_id', 'company_id', 'status', 'created_at'],
  'create index if not exists idx_documents_tenant_company_status_created on public.documents (tenant_id, company_id, status, created_at desc)'
);
select pg_temp.eden_create_index_if_columns_exist(
  'public.document_access_logs',
  array['tenant_id', 'user_id', 'created_at'],
  'create index if not exists idx_document_access_logs_tenant_user_created on public.document_access_logs (tenant_id, user_id, created_at desc)'
);
select pg_temp.eden_create_index_if_columns_exist(
  'public.accounting_e_documents',
  array['tenant_id', 'company_id', 'reconciliation_status', 'document_date'],
  'create index if not exists idx_accounting_e_documents_tenant_company_recon_date on public.accounting_e_documents (tenant_id, company_id, reconciliation_status, document_date desc)'
);
select pg_temp.eden_create_index_if_columns_exist(
  'public.financial_institution_movements',
  array['tenant_id', 'company_id', 'reconciliation_status', 'transaction_date'],
  'create index if not exists idx_financial_movements_tenant_company_recon_date on public.financial_institution_movements (tenant_id, company_id, reconciliation_status, transaction_date desc)'
);
select pg_temp.eden_create_index_if_columns_exist(
  'public.crm_leads',
  array['tenant_id', 'company_id', 'lead_status', 'updated_at'],
  'create index if not exists idx_crm_leads_tenant_company_status_updated on public.crm_leads (tenant_id, company_id, lead_status, updated_at desc)'
);
select pg_temp.eden_create_index_if_columns_exist(
  'public.after_sales_service_requests',
  array['tenant_id', 'company_id', 'status', 'priority', 'created_at'],
  'create index if not exists idx_service_requests_tenant_company_status_priority_created on public.after_sales_service_requests (tenant_id, company_id, status, priority, created_at desc)'
);
select pg_temp.eden_create_index_if_columns_exist(
  'public.hr_attendance_records',
  array['tenant_id', 'company_id', 'employee_id', 'work_date'],
  'create index if not exists idx_hr_attendance_tenant_company_employee_date on public.hr_attendance_records (tenant_id, company_id, employee_id, work_date desc)'
);
select pg_temp.eden_create_index_if_columns_exist(
  'public.reporting_export_jobs',
  array['tenant_id', 'status', 'created_at'],
  'create index if not exists idx_reporting_export_jobs_tenant_status_created on public.reporting_export_jobs (tenant_id, status, created_at desc)'
);
select pg_temp.eden_create_index_if_columns_exist(
  'public.integration_webhook_deliveries',
  array['tenant_id', 'status', 'next_attempt_at', 'created_at'],
  'create index if not exists idx_integration_webhook_deliveries_tenant_status_next_created on public.integration_webhook_deliveries (tenant_id, status, next_attempt_at, created_at)'
);
select pg_temp.eden_create_index_if_columns_exist(
  'public.integration_inbound_events',
  array['tenant_id', 'integration_app_id', 'inbound_event_type', 'source_event_id'],
  'create index if not exists idx_integration_inbound_events_idempotency on public.integration_inbound_events (tenant_id, integration_app_id, inbound_event_type, source_event_id)'
);
