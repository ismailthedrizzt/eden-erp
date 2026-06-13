# TS Backend Removal Report

<!-- source-of-truth-standard: contract overrides markdown -->

Step 19 consolidates the Python/FastAPI migration boundary. FastAPI is the canonical ERP backend; TypeScript backend code is now either a BFF/proxy, a temporary migration fallback, a frontend/shared contract, generated OpenAPI output, or a documented migrate-later debt item.

## Current Control Points

- `npm run migration:status` reports Next API route migration headers, proxy-only boundary violations, temporary fallback routes and client backend-risk files.
- `npm run migration:inventory` regenerates `NextApiRouteMigrationInventory.md`.
- `npm run ts-backend:inventory` regenerates `RemainingTsBackendInventory.md`.
- `npm run boundaries:check` checks client/server and proxy-only import boundaries.
- CI runs `migration:status` and `boundaries:check` before the production build.

## Removed Files

No risky TS backend files were deleted in this pass. The inventory still shows many temporary fallbacks and migrate-later files that are referenced by live routes or frontend contracts. Deletion is now gated by import boundary checks, staging verification and the cleanup plan.

## Proxy-Only Routes

The routes explicitly marked `proxy_to_fastapi` are treated as thin compatibility endpoints. They must only parse the request minimally, call `proxyToFastApi`/`proxyJsonToFastApi`, and return the FastAPI response. `npm run migration:status` now fails if a `proxy_to_fastapi` route imports backend/domain modules or direct DB code.

Permanent rule:

- no DB mutation in proxy-only routes
- no operation orchestration in proxy-only routes
- no policy/readiness/integrity decision logic in proxy-only routes
- no outbox/audit/process runtime logic in proxy-only routes

## Remaining Temporary Fallbacks

Temporary fallbacks remain where local frontend behavior still depends on TS code until FastAPI staging validation is complete:

- company official changes
- branch opening/closing
- company/partner/representative/branch card CRUD fallback paths
- ownership transaction list/create and selected workflow routes
- process/tasks/approvals
- audit/action-center/setup readiness
- cron outbox dispatch

Removal condition:

1. FastAPI endpoint exists and passes backend tests.
2. Staging data smoke test passes.
3. Frontend E2E or manual flow passes through the Next BFF route with `FASTAPI_BASE_URL`.
4. Fallback is removed and route status changes to `proxy_to_fastapi`.

## Remaining Migrate-Later Files

The generated `RemainingTsBackendInventory.md` classifies every scanned `app/api/**` and TS backend-core file. Current categories include:

- `migrate_later_p1`: active TS backend runtime logic in migrated domains that should be removed after FastAPI verification.
- `migrate_later_p2`: domain modules not yet fully covered by Python.
- `deprecated_wrapper`: compatibility wrappers that should not receive new behavior.
- `obsolete_unknown_owner`: files that need ownership classification before future changes.

## Shared Contract Files

Allowed TypeScript surfaces:

- generated OpenAPI types
- string constants for action/module/permission keys
- frontend row/view models
- frontend form values
- UI-only validation hints
- BFF response adapters

Disallowed TypeScript surfaces:

- DB mutation services
- operation request lifecycle management
- process engine runtime
- outbox dispatcher
- audit write core
- policy enforcement core
- readiness DB checks
- integrity decision core
- server-side projection query logic

## Import Boundary Status

`npm run boundaries:check` currently runs in warning mode for temporary fallback and frontend/shared imports. It produces critical errors for:

- `proxy_to_fastapi` routes importing TS backend/domain or direct DB code
- client files importing server-only Supabase/FastAPI proxy modules
- client files referencing server secrets

Warnings are expected while temporary fallbacks remain. P1 cleanup should reduce warning count by turning route fallbacks into proxy-only routes and replacing frontend imports with generated/shared contract imports.

## Next Cleanup Priority

P1:

- Remove temporary TS fallbacks for official changes, process/audit/action-center/setup and ownership workflow routes after staging verification.
- Convert remaining P0 migrated routes to `proxy_to_fastapi`.
- Replace TS process/outbox/audit/integrity runtime imports with Python endpoints.
- Keep `companyService` and related services as API client wrappers only.

P2:

- Migrate accounting, HR, organization, settings and reference routes to FastAPI domain services.
- Reduce `obsolete_unknown_owner` inventory to explicit keep/remove decisions.
- Move remaining UI adapters toward generated OpenAPI client usage where practical.

## Validation

The expected validation set for this consolidation is:

- `npm run typecheck`
- `npm run build`
- `npm run migration:status`
- `npm run boundaries:check`
- `npm run openapi:refresh`
- `cd backend && python -m ruff check .`
- `cd backend && python -m mypy app`
- `cd backend && python -m pytest`
