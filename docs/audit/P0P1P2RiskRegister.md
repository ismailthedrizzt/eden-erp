# P0 P1 P2 Risk Register

Audit date: 2026-05-31

Overall result: no confirmed active P0 build/typecheck/backend-test blocker. The platform is `PILOT_ONLY` until release visibility, fallback burn-down and staging smoke are complete.

## P0 Risks

| id | title | module | severity | impact | file/path | recommended fix | suggested next prompt |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P0-001 | Auth bypass env enabled in production | auth/security | P0-if-enabled | complete auth bypass | `lib/user-state/server.ts`, `lib/security/serverPermissions.ts` | add production hard-fail guard and CI env check | `Production Env Safety Guard ekle` |
| P0-002 | Tenant/scope bypass in live route | platform/security | P0-if-found | cross-tenant/company data exposure | all live API routes | staging smoke for tenant/company-scope denial | `Tenant Scope Smoke Tests ekle` |
| P0-003 | Operation-controlled field bypass | company/ownership/representatives/branches | P0-if-found | official/legal data corruption | Next fallbacks and FastAPI operation routes | locked-field PATCH tests and fallback removal | `Critical Operation Guard Smoke Tests ekle` |
| P0-004 | Unsafe portal external access | portal | P0-if-found | customer data exposure | `app/api/portal/**`, `backend/app/domains/portal/**` | portal scope/suspended-user/document sharing smoke | `Portal External Access Smoke Tests ekle` |
| P0-005 | Service role exposure to client | security | P0-if-found | secret compromise | `lib/supabase/server.ts`, route handlers | env/static scan CI and no client imports | `Secret Exposure CI Guard ekle` |

## P1 Risks

| id | title | module | severity | impact | file/path | recommended fix | suggested next prompt |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P1-001 | Temporary Next API fallbacks remain | platform/API | P1 | divergence from FastAPI canonical backend | 75 routes from `migration:status` | FastAPI-only proxy after staging smoke | `Next API Fallback Burn-down` |
| P1-002 | 164 routes still `migrate_to_fastapi` | platform/API | P1 | Next continues to own backend behavior | `app/api/**/route.ts` | migrate domain logic to FastAPI | `Migrate Remaining Next Business Routes` |
| P1-003 | Missing migration headers | platform/API | P1/P2 | route responsibility unclear | 205 Next routes | add explicit `BACKEND_MIGRATION_STATUS` headers | `Route Header Coverage 500/500` |
| P1-004 | Frontend imports TS backend-core helpers | frontend/backend boundary | P1 | weak Next/FastAPI separation | company pages, audit, process, action-center components | split shared contracts from server logic | `Frontend Backend Boundary Cleanup` |
| P1-005 | Release visibility not final | release/runtime | P1 | partial pages visible in production | navigation/module/visibility registries | route release registry | `Page Release Registry + Live/Preview/Hidden Visibility` |
| P1-006 | Admin/export/document pages need security smoke | admin/documents/export | P1 | sensitive data leakage | `app/app/sistem/**`, `app/app/belgeler` | role/scope/signed-url/export tests | `Admin Document Export Security Smoke` |
| P1-007 | Portal not production-smoked | portal | P1 | external customer scope leak | `app/portal/**`, `app/api/portal/**` | portal end-to-end smoke | `Portal External Access Smoke Tests` |
| P1-008 | Worker visibility and retry operations partial | workers/outbox | P1 | failed background jobs invisible | `backend/app/workers/**`, Admin outbox | heartbeat/retry/DLQ admin smoke | `Worker Operations Smoke Tests` |
| P1-009 | Frontend template inconsistency | frontend | P1 | uneven UX and possible locked-field confusion | MVP pages under `components/modules/**` | canonical template pass for live candidates | `Live Candidate Template Hardening` |
| P1-010 | Real staging smoke not executed | release | P1 | build success mistaken for runtime readiness | smoke script only dry-run | run services and smoke routes with auth | `Runtime Smoke Fixes and Execution` |
| P1-011 | Lint hook warnings in core pages | frontend | P1 | stale closure/runtime refresh issues | lint output files | fix hook dependencies | `Core Hook Warning Burn-down` |

## P2 Risks

| id | title | module | severity | impact | file/path | recommended fix | suggested next prompt |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P2-001 | Legacy route aliases | routing | P2 | navigation/support confusion | `app/muhasebe/**`, `app/ik/**`, `app/ayarlar/**` | hide, redirect, later delete | `Legacy Route Alias Cleanup` |
| P2-002 | Deprecated permission aliases | RBAC | P2 | role matrix complexity | `backend/app/policies/permissions.py` | phase out after role migration | `Permission Alias Deprecation Plan` |
| P2-003 | Mock/MVP files remain | modules | P2 | demo assumptions leak into product | `lib/modules/**/*.mock.ts`, `*MvpPages.tsx` | rename/move under demo or replace | `MVP Mock Cleanup` |
| P2-004 | Docker CLI unavailable locally | ops | P2 | local compose validation skipped | workstation/tooling | run in CI or install Docker | `CI Docker Compose Validation` |
| P2-005 | Next lint deprecation | tooling | P2 | future Next 16 friction | `package.json` lint script | migrate to ESLint CLI | `Next Lint to ESLint CLI Migration` |
| P2-006 | PWA build artifacts mutate locally | tooling | P2 | dirty worktree after build | `public/sw.js`, fallback files | deterministic CI handling or ignore strategy | `PWA Artifact Strategy` |

## Findings

- No active P0 blocker was confirmed by build/test/static audit.
- P1 risk volume is high enough that direct broad production launch is not recommended.
- Most P0 items are conditional: they become blockers if release visibility exposes unsafe/partial routes or if production env flags are misconfigured.

## Risks

- P1 risks can become P0 when a route is production-visible.
- The current buildable surface is too broad for normal production navigation.
- Temporary fallback routes are the most important architectural debt.

## Recommended Fixes

- Treat release registry as the next platform hardening step.
- Run real staging smoke before any production decision.
- Burn down temporary fallbacks by domain priority: company/operation, process/action/audit, admin/export/document, portal/integration.
- Add production env safety checks for bypass flags and secrets.

## P0/P1/P2 Priority

- P0: conditional only; none confirmed active.
- P1: release gating, fallback removal, smoke execution, boundary cleanup.
- P2: aliases, mocks, tooling polish.

## Suggested Next Prompt

`Page Release Registry + Live/Preview/Hidden Visibility calismasini uygula ve ardindan Runtime Smoke Fixes and Execution fazina gec.`
