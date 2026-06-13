# Production Readiness Report

<!-- source-of-truth-standard: contract overrides markdown -->

Deprecated historical report, updated 2026-06-06: Some findings refer to the old Supabase/Vercel deployment model. Current production operations use remote server + local PostgreSQL/local DB runbooks under `docs/operations/`.

Date: 2026-05-31
Scope: ERP Hardening Final - Multi-Company / Multi-Tenant Scale / Production Operations

## 1. Executive Summary

Production readiness result: **PILOT_ONLY**.

Gerekce: Eden ERP mimarisi Next.js BFF, FastAPI canonical backend, PostgreSQL/Supabase, policy/scope, audit, outbox and worker ekseninde production'a yaklasmistir. Bu final adimda tenant/company isolation checklistleri, permission matrix, DB index/pooling plani, worker/outbox/audit runbooklari, backup/DR, release/rollback, monitoring, incident response, data retention, portal/integration/AI safety ve load test planlari eklendi. Kucuk platform hardening olarak worker DB pool override, outbox dead-letter status, outbox/webhook `SKIP LOCKED` queue selection ve production index migration hazirlandi.

Production'a acik genel kullanim icin restore rehearsal, load test execution, monitoring dashboard wiring, production secrets verification ve P0/P1 negative security smoke testlerinin Development/production-benzeri ortamda kanitlanmasi gerekir.

## 2. Architecture Status

- Next.js frontend/BFF proxy model is documented and existing FastAPI proxy coverage continues.
- FastAPI is canonical backend for new core domains.
- PostgreSQL/Supabase remains system of record.
- Module Registry and Admin Console are the platform operations surfaces.
- OpenAPI remains contract source of truth; drift check must pass before release.

Status: **Pilot ready with production gates**.

## 3. Security Status

- Backend validates JWT or trusted internal/proxy context.
- Production auth cannot be disabled by configuration.
- User-safe error handling hides stack traces and DB internals in production.
- Critical permission matrix now defines gate for mutation/admin/export/document paths.

Status: **P1 remaining**: full endpoint-by-endpoint negative permission test evidence is still required.

## 4. Tenant Isolation Status

- Tenant isolation checklist added: `docs/architecture/MultiTenantIsolationChecklist.md`.
- Current backend patterns use `RequestContext.tenant_id` and tenant predicates in reviewed services.
- Cache and BFF tenant trust rules are explicitly gated.

Status: **Pilot ready**.
Required before production: automated cross-tenant search/report/export/document tests.

## 5. Data Integrity Status

- Critical operations require wizard/precheck/policy enforcement.
- Outbox event writing and audit are defined as transaction-adjacent platform guarantees.
- Idempotency guide added for worker retry safety.

Status: **Pilot ready**.
Required before scale: duplicate-run tests for each worker type.

## 6. Performance Status

- Production DB index plan and query plan checklist added.
- Safe gated index migration added: `supabase/migrations/20260531_production_hardening_indexes.sql`.
- DB pool variables and worker pool override are documented and wired.

Status: **P1 remaining**: Development EXPLAIN review and load test execution not yet recorded.

## 7. Worker/Outbox Status

- Outbox worker now selects rows with `FOR UPDATE SKIP LOCKED`.
- Outbox terminal retry state uses `dead_letter`.
- Webhook delivery queue selection uses `FOR UPDATE OF d SKIP LOCKED`.
- Worker operations and idempotency runbooks added.

Status: **Pilot ready**.
Required before production: heartbeat dashboard and one-worker-type-at-a-time resume procedure rehearsal.

## 8. Audit/Compliance Status

- Audit reliability and retention policy added.
- Critical mutations, denied access, admin/security changes, export/download, portal, integration and AI actions are defined as audit-required.

Status: **Pilot ready with audit coverage review required**.

## 9. Backup/DR Status

- Backup/restore and DR runbooks added.
- RPO/RTO targets defined.
- Storage, config, secrets and worker restart considerations included.

Status: **P1 remaining**: restore rehearsal must be executed and recorded before first paying customer.

## 10. Monitoring Status

- Monitoring and alerting runbook added.
- Required dashboards and alert thresholds defined.
- Request/correlation ids are present in FastAPI middleware.

Status: **P1 remaining**: dashboard wiring and alert channel verification required.

## 11. Deployment/Rollback Status

- Production release and rollback runbooks added.
- Worker pause/resume, migration review, smoke test and rollback stages defined.

Status: **Pilot ready**.
Required before production: one full release rehearsal in Development with rollback drill.

## 12. Portal/Integration/AI Safety Status

- Portal/external access checklist added.
- Integration security checklist added.
- AI safety production checklist added.
- Existing integration code verifies inbound signatures, hashes secrets, validates outbound HTTPS/private IP restrictions and masks delivery headers.

Status: **Pilot ready**.
Required before production: portal cross-customer negative test and inbound webhook replay/idempotency test evidence.

## 13. P0/P1/P2 Risks

P0 Production Blockers:

- No confirmed active P0 blocker from this static hardening pass.
- Any failed cross-tenant/scope/document/export/security negative test becomes P0.
- Any failed restore plan execution for production data becomes P0 before broad production launch.

P1 Before First Paying Customer:

- OpenAPI drift command currently refreshes generated artifacts and returns non-zero until the integration/OpenAPI generated diff is reviewed and committed.
- Restore rehearsal not yet executed.
- Load test plan exists, but load/stress/soak results not yet recorded.
- Query plan review not yet attached.
- Endpoint-by-endpoint permission matrix evidence incomplete.
- Worker heartbeat not yet persisted in an operations dashboard.
- Monitoring/alerting dashboards not yet verified.
- OpenAPI client adoption/drift must be checked on every release.

P2 Scale Improvements:

- Redis/cache layer with tenant-safe keys.
- Advanced queue service for high-volume workers.
- OpenTelemetry distributed tracing.
- BI/data warehouse and archive tier.
- Multi-region strategy.
- Customer-specific SLAs.
- Autoscaling policies and cost guardrails.

## 14. Required Before Production

- Run full typecheck/build/backend checks.
- Apply and verify production hardening index migration in Development.
- Run cross-tenant and cross-company negative smoke tests.
- Run document signed URL/download scope tests.
- Run portal customer isolation tests.
- Run inbound webhook invalid signature/stale timestamp/replay tests.
- Execute backup restore rehearsal.
- Wire monitoring dashboards and alert channels.
- Execute release and rollback rehearsal.

## 15. Required Before Scale

- Execute load/stress/soak test plan with production-like data.
- Add worker heartbeat persistence and dashboard.
- Add OpenTelemetry trace propagation across Next/FastAPI/workers.
- Add archival jobs for audit/outbox/webhook/email/export/AI histories.
- Add advanced queue or durable job orchestration if backlog grows.

## 16. Recommended Next 60 Days

1. Complete security negative test suite for tenant, company, portal, document, export and integration surfaces.
2. Run restore rehearsal monthly and record RPO/RTO.
3. Run load test after every major module deepening.
4. Add persistent worker heartbeat table and Admin Console view.
5. Add OpenTelemetry tracing and dashboard correlation from request to worker/outbox.
6. Convert retention policy into dry-run archival jobs.
