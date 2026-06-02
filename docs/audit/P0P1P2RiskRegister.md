# P0/P1/P2 Risk Register

Audit date: 2026-05-31

Overall result: no confirmed active P0 build/typecheck/backend-test blocker. The platform is `PILOT_ONLY` until release visibility, fallback burn-down, environment separation and staging smoke are complete.

## Environment And Release Guard Findings

| id | title | module | severity | impact | file/path | recommended fix | suggested next prompt |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P0-ENV-001 | Release Supabase mutation risk | env/db | P0 | Release data can be changed by development migration/seed | `scripts/check-supabase-target.js` | Keep guard required before migration/seed/import commands | Add CI gate for Supabase target check |
| P0-ENV-002 | Release login bypass risk | auth | P0 | Release users can bypass auth if unsafe env is enabled | `scripts/check-release-env-safety.js` | Fail release when `EDEN_LOGIN_DISABLED=true` | Add Vercel release env validation |
| P0-REL-001 | Development route visible in release | runtime visibility | P0 | Unapproved or sensitive pages can appear to users | `lib/release/routeReleaseRegistry.ts` | Keep `release:check` and middleware route guard | Add browser smoke for release nav |
| P1-REL-001 | New page missing release status | runtime visibility | P1 | Page may be invisible or treated as development unexpectedly | `scripts/check-release-registry.js` | Add registry entry with every new page | Add PR checklist for route registry |
| P1-DOC-001 | Promotion workflow manual | release ops | P1 | Release transfer depends on operator discipline | `docs/release/PromotionToReleaseWorkflow.md` | Add CI/checklist automation | Create release CI workflow |
| P2-OPS-001 | Advanced deploy automation absent | ops | P2 | More manual checks before scale | `.github/workflows` | Add optional release safety workflow | Add release safety GitHub Action |

## Platform Audit Risks

| id | title | module | severity | impact | file/path | recommended fix | suggested next prompt |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P0-001 | Auth bypass env enabled in production | auth/security | P0-if-enabled | complete auth bypass | `lib/user-state/server.ts`, `lib/security/serverPermissions.ts` | add production hard-fail guard and CI env check | `Production Env Safety Guard ekle` |
| P0-002 | Tenant/scope bypass in live route | platform/security | P0-if-found | cross-tenant/company data exposure | all live API routes | staging smoke for tenant/company-scope denial | `Tenant Scope Smoke Tests ekle` |
| P0-003 | Operation-controlled field bypass | company/ownership/representatives/branches | P0-if-found | official/legal data corruption | Next fallbacks and FastAPI operation routes | locked-field PATCH tests and fallback removal | `Critical Operation Guard Smoke Tests ekle` |
| P0-004 | Unsafe portal external access | portal | P0-if-found | customer data exposure | `app/api/portal/**`, `backend/app/domains/portal/**` | portal scope/suspended-user/document sharing smoke | `Portal External Access Smoke Tests ekle` |
| P0-005 | Service role exposure to client | security | P0-if-found | secret compromise | `lib/supabase/server.ts`, route handlers | env/static scan CI and no client imports | `Secret Exposure CI Guard ekle` |
| P1-001 | Temporary Next API fallbacks remain | platform/API | P1 | divergence from FastAPI canonical backend | 75 routes from `migration:status` | FastAPI-only proxy after staging smoke | `Next API Fallback Burn-down` |
| P1-002 | 164 routes still `migrate_to_fastapi` | platform/API | P1 | Next continues to own backend behavior | `app/api/**/route.ts` | migrate domain logic to FastAPI | `Migrate Remaining Next Business Routes` |
| P1-005 | Release visibility not final | release/runtime | P1 | partial pages visible in production | navigation/module/visibility registries | route release registry | `Page Release Registry + Live/Preview/Hidden Visibility` |
| P1-010 | Real staging smoke not executed | release | P1 | build success mistaken for runtime readiness | smoke script only dry-run | run services and smoke routes with auth | `Runtime Smoke Fixes and Execution` |
| P2-006 | PWA build artifacts mutate locally | tooling | P2 | dirty worktree after build | `public/sw.js`, fallback files | deterministic CI handling or ignore strategy | `PWA Artifact Strategy` |

## Recommended Fixes

- Development Supabase project ref and Release Supabase project ref should stay explicitly separated in Vercel envs.
- Migration/seed/reset commands should run `npm run supabase:target:check` first.
- New pages should default to `development` status in the route registry.
- A page should move to `release` status only after field testing and staging smoke.
- Burn down temporary fallbacks by domain priority: company/operation, process/action/audit, admin/export/document, portal/integration.

## P0/P1/P2 Priority

- P0: release data safety, auth bypass prevention, tenant/scope denial and release route guard.
- P1: missing registry entries, promotion automation, staging smoke, fallback removal and frontend/backend boundary cleanup.
- P2: route aliases, mock cleanup, build artifact determinism and advanced CI polish.

## Suggested Next Prompts

- `Local .env.local Development Supabase, VS env Release Supabase dogrulamasini yap ve release smoke checklist'i calistir.`
- `Page Release Registry + Live/Preview/Hidden Visibility calismasini uygula ve ardindan Runtime Smoke Fixes and Execution fazina gec.`
