# Performance Migration Plan

Step 17 prepares Eden ERP for measurable performance work without pretending the first pass is final tuning.

## Completed Preparation

- DB pool settings are configurable in FastAPI.
- Slow DB query timing logs `DB_SLOW_QUERY`.
- Slow API request timing logs `API_SLOW_REQUEST` and `API_VERY_SLOW_REQUEST`.
- `X-Response-Time-Ms` is returned when enabled.
- Projection definitions include performance budgets and max page size.
- SmartDataTable clamps page size to 100.
- Platform load-test scenarios are available in `scripts/load-test.js`.
- Safe index migration preparation exists in `supabase/migrations/20260528_performance_indexes.sql`.

## Staging Rollout

1. Apply the safe index migration to staging.
2. Run `python backend/scripts/explain_queries.py company-list --tenant-id <tenant>`.
3. Repeat for branch, partner, representative, outbox and audit queries.
4. Run `npm run load:test:platform-smoke` against staging with tenant/session headers.
5. Compare p95/p97.5 latency against `PerformanceTargets.md`.

## Production Rollout

- Review table size before applying indexes.
- Use `CONCURRENTLY` variants for very large tables.
- Roll out API and worker pool sizes separately.
- Keep worker count and DB pool size under the Supabase/PgBouncer connection budget.
- Enable dashboards before increasing background worker concurrency.

## Follow-Up Work

- Staging EXPLAIN captures for all projection endpoints.
- Search/trigram indexes for company/branch/partner/representative search.
- Audit partitioning or archival.
- Materialized projections for action center and high-volume current-state views.
- CI/staging load-test automation.
