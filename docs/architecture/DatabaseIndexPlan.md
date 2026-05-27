# Database Index Plan

This plan documents the first performance index set for high-volume Eden ERP tables.

## Rollout Rules

- Prefer `CREATE INDEX IF NOT EXISTS`.
- Use table-gated migrations so partially migrated staging databases do not fail.
- Avoid new unique indexes until staging data is checked for duplicates.
- For very large production tables, run a reviewed `CONCURRENTLY` variant outside transaction-wrapped migration runners.
- Validate hot queries with `backend/scripts/explain_queries.py` before and after index rollout.

## Core Records

- `companies`: `(tenant_id, is_deleted, record_status)`, `(tenant_id, updated_at desc)`, `(tenant_id, tax_number)`, company status/search indexes later.
- `company_partners`: `(tenant_id, company_id, record_status)`, `(tenant_id, company_id, updated_at desc)`, person/organization lookup indexes later.
- `company_representatives`: `(tenant_id, company_id, record_status)`, `(tenant_id, updated_at desc)`, person/organization lookup indexes later.
- `company_branches`: `(tenant_id, company_id, record_status)`, `(tenant_id, company_id, updated_at desc)`, branch name/search indexes later.

## Transactions And Current State

- `ownership_transactions`: `(tenant_id, company_id, effective_date desc)`, `(tenant_id, partner_id, effective_date desc)`, operation/reversal indexes later.
- `representative_authority_transactions`: `(tenant_id, company_id, representative_id)`, `(tenant_id, branch_id)`, scope and authority status indexes later.
- `operation_requests`: `(tenant_id, status, created_at desc)`, `(tenant_id, client_request_id)`, operation type/company indexes later.

## Platform Volume Tables

- `outbox_events`: `(status, created_at)`, `(tenant_id, status, created_at)`, `(locked_at)`.
- `process_instances`: `(tenant_id, status, created_at desc)`, company/entity indexes later.
- `process_tasks`: `(tenant_id, status, due_at)`, assigned user indexes later.
- `process_approvals`: `(tenant_id, status, requested_at)`, approver indexes later.
- `audit_logs`: `(tenant_id, created_at desc)`, `(tenant_id, company_id, created_at desc)`, `(entity_type, entity_id, created_at desc)`.

## Organization And Facility

- `organization_units`: `(tenant_id, company_id, parent_unit_id)`.
- `facilities`: `(tenant_id, company_id, record_status)`.

## Migration Artifact

Initial safe migration:

```txt
supabase/migrations/20260528_performance_indexes.sql
```

It is intentionally conservative. Search, trigram and materialized projection indexes remain follow-up work after real EXPLAIN runs.
