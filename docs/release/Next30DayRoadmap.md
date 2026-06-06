# Next 30-Day Roadmap

Deprecated historical roadmap, updated 2026-06-06: Items that mention Supabase/Vercel should be interpreted as local PostgreSQL/local DB and remote server operations unless explicitly marked legacy.

Date: 2026-05-29

Goal: move Eden ERP from controlled MVP/pilot readiness to first customer pilot confidence by reducing P1 risk, improving E2E proof and deepening the modules that pilot users will touch most.

## Week 1 — Release Stabilization

1. P1 bug/security cleanup
   - Remove or lock down any route-level temporary fallback that is no longer needed after Development FastAPI verification.
   - Run JWT, tenant membership and company/branch scope smoke with real Supabase sessions.
   - Verify admin/system endpoints are system.admin-only.

2. Core E2E baseline
   - Add `tests/e2e` pilot smoke suite.
   - Cover login, dashboard, admin console, company draft, company detail, Action Center, audit timeline and global search.
   - Add permission-denied and scope-hidden-result tests.

3. Development demo validation
   - Run `npm run demo:seed` on demo/Development tenant.
   - Run `npm run demo:validate` with `DATABASE_URL`.
   - Capture screenshots for dashboard/action center/audit/reporting.

## Week 2 — Migration Debt Burn-Down

1. TS fallback removal
   - Convert highest-risk temporary fallback route groups to proxy-only after Development smoke:
     - companies official changes
     - ownership workflow subroutes
     - representatives authority/card routes
     - process/action-center/audit routes

2. OpenAPI client adoption
   - Replace manual DTO bridges in active frontend services with generated OpenAPI types.
   - Add drift check to release checklist and CI.

3. Worker hardening
   - Deploy supervised outbox/reminder/email workers.
   - Add heartbeat, failed backlog warning and retry runbook.

## Week 3 — Pilot Feedback And Core Module Depth

1. Pilot feedback loop
   - Use `Eden ERP Pilot Feedback` project categories from the demo pack.
   - Triage daily into P0/P1/P2.
   - Fix P0 immediately and P1 inside the pilot window.

2. Accounting deepening
   - Harden cari account/transaction detail flows.
   - Add export permission smoke and sensitive masking checks.
   - Prepare bank/e-invoice future integration boundaries.

3. HR deepening
   - Harden employee lifecycle, required document states and SGK pending/manual completion.
   - Add employee document expiry and notification smoke.

## Week 4 — Experience And Governance

1. After-sales mobile field flow
   - Verify technician mobile navigation, service photo upload and service request assignment.
   - Add mobile smoke screenshots for key flows.

2. Reporting improvements
   - Verify dashboard cards against seeded data.
   - Add server-side pagination/query plan checks for high-volume report candidates.

3. Data quality merge hardening
   - Expand duplicate review and merge preview tests.
   - Keep official/transaction records merge-blocked.
   - Add import duplicate warning smoke.

## Exit Criteria

- No P0 blockers.
- Temporary fallback count trending down with explicit owner.
- Pilot smoke E2E suite passing.
- Demo tenant validates against Development DB.
- Workers supervised and visible from Admin Console.
- Security scope smoke completed for admin, manager, accountant, HR, ops, auditor and standard user.
