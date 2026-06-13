# Performance Targets

<!-- source-of-truth-standard: contract overrides markdown -->

Step 17 defines the first measurable performance envelope for Eden ERP.

## API Latency Budgets

- List endpoints: p95 under 500 ms, ideal under 250 ms.
- Detail endpoints: p95 under 700 ms.
- Precheck endpoints: p95 under 800 ms.
- Operation completion: p95 under 2.5 s; longer work should move to process/background flow.
- Action Guide deterministic path: p95 under 500 ms.
- Setup/readiness with cache: p95 under 1 s.
- Audit and Action Center endpoints: p95 under 700 ms.

## Frontend Budgets

- First list load should complete in under 1 s on a warm backend.
- Page changes should complete in under 500 ms.
- Filter and sort must be server-side for high-volume ERP lists.
- Tables with 10,000+ records must not be fully loaded for client-side filtering.
- SmartDataTable page size is capped at 100 and should default to 25 or 50 for ERP lists.
- Summary widgets should use optimized summary/projection endpoints instead of full list scans.

## Database Budgets

- `tenant_id` is a first-class index dimension for tenant-owned data.
- High-volume tables need `(tenant_id, created_at desc)` or `(tenant_id, updated_at desc)` indexes.
- Operation, outbox, process, task, approval, audit and action center source queries must be index-backed.
- Audit/outbox/process tables need partition or archive strategy before production-scale volume.

## Scale Target

- Hundreds of companies per installation.
- Thousands of concurrent users across tenants.
- High audit/outbox/process event volume.
- Multi-company tenants with strict company and branch scope.

## Regression Gates

- `npm run load:test:scenarios` lists supported platform load scenarios.
- `npm run load:test:platform-smoke` is intended for local/staging only.
- Python request timing middleware logs slow and very slow endpoints.
- Projection definitions carry `performance_budget_ms`, `default_page_size` and `max_page_size`.
