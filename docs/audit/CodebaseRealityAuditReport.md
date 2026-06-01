# Codebase Reality Audit Report

Audit date: 2026-05-31

Audit scope: codebase reality, architecture compliance, page status, frontend template consistency, CRUD/wizard/lifecycle separation, backend migration state, Next API route state, legacy/obsolete code, runtime build smoke, release surface and P0/P1/P2 risk classification.

## Executive Summary

Result: `PILOT_ONLY`.

Eden ERP is in a materially working state: Next build passes, typecheck passes, OpenAPI drift passes, backend lint/typecheck/tests pass and the FastAPI backend is broad enough to be considered a real canonical backend. However, the production surface is not yet safe to expose broadly. The codebase still has 75 temporary Next API fallback routes, 164 routes marked `migrate_to_fastapi`, several frontend imports of TS backend-core helpers, and a buildable page surface that is larger than the safe live surface.

The next release decision should not be "can it build?" because it can. The decision should be "which buildable pages are allowed in production?" The answer from this audit: core company/accounting/HR employee pages are closest to live, while admin, audit, documents, portal, integration, AI, automation, reporting and newer MVP modules should stay staging/develop until route-level smoke and release gating are done.

## Audit Outputs

| report | purpose |
| --- | --- |
| `docs/audit/ArchitectureComplianceReport.md` | target architecture compliance status |
| `docs/audit/PageStatusMatrix.md` | page-by-page build/release matrix |
| `docs/audit/FrontendTemplateConsistencyReport.md` | list/form/detail/wizard consistency |
| `docs/audit/CrudWizardLifecycleComplianceReport.md` | CRUD vs operation/lifecycle boundary |
| `docs/audit/BackendMigrationRealityReport.md` | FastAPI migration reality |
| `docs/audit/NextApiRouteRealityReport.md` | Next API route responsibility and migration state |
| `docs/audit/LegacyObsoleteCodeReport.md` | legacy, obsolete, placeholder and fallback inventory |
| `docs/audit/RuntimeBuildSmokeReport.md` | command results and smoke evidence |
| `docs/audit/ReleaseSurfaceCandidateMatrix.md` | production/staging/develop visibility proposal |
| `docs/audit/P0P1P2RiskRegister.md` | prioritized risk register |

## System Reality

| area | result | notes |
| --- | --- | --- |
| Frontend build | pass | `npm run build` passed; lint warnings only. |
| Typecheck | pass | `npm run typecheck` passed. |
| Backend quality | pass | `python -m ruff`, `python -m mypy`, `python -m pytest` passed. |
| Backend tests | pass | 222 passed, 4 warnings. |
| OpenAPI drift | pass | generated schema/types are current. |
| Next API migration | partial | 500 routes, 75 temporary fallbacks, 164 migrate-to-FastAPI. |
| Page inventory | partial/live split needed | 138 app pages build; only a subset should be production-visible. |
| Runtime smoke | partial | dry-run scenario list exists; real service smoke not executed in this phase. |
| Docker compose | not run | Docker CLI unavailable locally. |

## Architecture Status

- Next.js currently acts as frontend + BFF/proxy + compatibility layer.
- FastAPI/Python is a real canonical backend with domains, policies, workers, OpenAPI, migrations and tests.
- PostgreSQL/Supabase assumptions remain in both backend config and some Next adapters.
- Module registry, feature flags and runtime visibility primitives exist.
- Final release-surface gating is still missing.

## Security Status

No active service-role client leak or auth bypass was confirmed by this audit. Security-sensitive conditional risks remain:

- `EDEN_LOGIN_DISABLED` and `EDEN_ALLOW_LEGACY_API_ACCESS` must hard-fail in production if enabled.
- Portal, export, document signed URL, audit export, admin and integration routes need live/staging security smoke.
- Tenant/company-scope enforcement is covered by backend tests in parts, but not proven across every fallback route.

## Tenant And Company Scope Status

Backend tenant/scope/policy components and tests exist, but this audit did not perform runtime cross-tenant browser/API attacks. Treat tenant/company scope as `partial` until staging smoke validates:

- global search
- dashboards and reports
- exports
- document download/signed URL
- portal routes
- notifications/action center
- worker/outbox events

## Data Integrity Status

Core lifecycle architecture is strong in code:

- Company official changes, capital, liquidation/deregistration and opening flows exist.
- Ownership transactions and current ownership projections exist.
- Representative authority/scope transactions exist.
- Branch opening/closing operations exist.
- Field-control registry protects operation-controlled fields.

Remaining risk: Next temporary fallback parity must be proven or removed.

## Performance And Operations Status

- DB pooling config exists in FastAPI (`DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `DB_POOL_TIMEOUT`, `DB_POOL_RECYCLE`, `DB_STATEMENT_TIMEOUT_MS`, `DB_SLOW_QUERY_MS`, `WORKER_DB_POOL_SIZE`).
- Load test scenario inventory exists.
- Worker files exist, but worker operational visibility/heartbeat/retry/DLQ smoke is still P1.
- Production observability exists in backend primitives, but full staging dashboards were not verified.

## Release Surface Recommendation

Initial normal-user production candidate set after staging smoke:

- `/login`
- `/offline`
- `/app`
- `/app/sirket/companies`
- `/app/sirket/companies/branches`
- `/app/sirket/companies/partners`
- `/app/sirket/companies/representatives`
- `/app/sirket/tesisler`
- `/app/sirket/teskilat`
- `/app/muhasebe/cari-kartlar`
- `/app/muhasebe/cari-hareketler`
- `/app/muhasebe/on-muhasebe-hareketleri`
- `/app/muhasebe/banka-hesaplari-ve-kartlari`
- `/app/muhasebe/banka-kart-hareketleri`
- `/app/muhasebe/hesap-ve-kart-hareketleri`
- `/app/ik/calisanlar`

Staging-only until smoke:

- admin console, setup, health, feature flags, modules
- audit, documents, export/import
- CRM, project/task, products, after-sales, reporting
- integrations, automation, AI copilot
- customer portal

Hidden/develop-only:

- demo/test pages
- legacy aliases
- placeholder/coming-soon pages

## Minor Fixes Applied

No product code fix was applied. Build-generated PWA artifacts were cleaned because they were generated by audit commands and not part of the requested report changes.

## Required Before Production

1. Route release registry and production visibility guard.
2. Real staging smoke for all live candidates.
3. Tenant/company-scope smoke for search/report/export/document/action center/portal.
4. Temporary fallback removal or explicit production block.
5. Production env safety guard for auth/API bypass flags.
6. Admin/document/export/audit signed URL and role smoke.

## Required Before Scale

1. Worker heartbeat/retry/DLQ visibility.
2. Load test execution against staging.
3. Query/index review with real data volume.
4. Observability dashboards and alerts.
5. CI-enforced backend/frontend boundary checks.
6. Cleanup of deprecated wrappers, aliases and mocks.

## Recommended Next 60 Days

- Week 1: release registry, route visibility guard, env safety guard.
- Week 2: staging smoke suite for live candidates and tenant/company scope.
- Week 3: Next API fallback burn-down for company/process/action/audit routes.
- Week 4: admin/document/export/portal security smoke and hardening.
- Weeks 5-6: worker operations, load test execution, observability dashboards.
- Weeks 7-8: legacy alias cleanup, template consistency and lint warning burn-down.

## Findings

- Eden ERP builds and tests successfully.
- FastAPI migration is real and broad.
- The architecture is partially compliant, not production-complete.
- The safe release surface is much smaller than the buildable surface.
- No active P0 blocker was confirmed, but several P1 risks can become P0 if exposed in production.

## Risks

- P1: 75 temporary fallback routes and 164 migrate-to-FastAPI routes.
- P1: route release visibility is not final.
- P1: admin/export/document/portal/security-sensitive surfaces need real smoke.
- P1: frontend template consistency varies across MVP modules.
- P0-if-enabled: auth/API legacy bypass flags in production.

## Recommended Fixes

- Implement `Page Release Registry + Live/Preview/Hidden Visibility`.
- Run real runtime smoke for the candidate production page set.
- Burn down temporary Next API fallbacks by risk family.
- Add production env safety guard for bypass flags and secret exposure.
- Harden live-candidate frontend templates before broad pilot.

## P0/P1/P2 Priority

- P0: none confirmed active.
- P1: release gating, fallback burn-down, staging smoke, tenant/scope/security checks.
- P2: legacy aliases, deprecated permissions, mocks, lint/tooling polish.

## Suggested Next Prompt

`Page Release Registry + Live/Preview/Hidden Visibility uygula; docs/audit/PageStatusMatrix.md ve docs/audit/ReleaseSurfaceCandidateMatrix.md kararlarini navigation/sidebar/search/command palette ve direct route guard seviyesine bagla.`
