# Architecture Compliance Report

Audit date: 2026-05-31

Compliance scale: `compliant`, `partial`, `non-compliant`, `unknown`.

## Compliance Matrix

| principle | status | evidence | production impact |
| --- | --- | --- | --- |
| 1. Next.js / FastAPI separation | partial | FastAPI backend is broad and tested; 500 Next API routes remain, 75 temporary fallback routes, 164 migrate-to-FastAPI routes. | P1 until fallback removal and release gating. |
| 2. CRUD vs Wizard separation | partial | Company lifecycle, official change, branch opening/closing, capital, HR lifecycle, ownership and representative operations exist as operation/wizard endpoints. Some card pages still import TS backend helpers. | P1, especially for operation-controlled fields. |
| 3. Add creates draft standard | partial | Company lifecycle tests and card CRUD tests exist; UI includes draft/lifecycle flows. Not every module page follows draft semantics. | P1 for production modules. |
| 4. Card vs transaction/operation separation | partial | Field-control registry locks company, partner, representative, branch and facility operation fields. Ownership/representative transaction services/tests exist. | P1, needs route visibility and UI smoke. |
| 5. Field control / locked fields | compliant for core company stack, partial globally | `backend/app/policies/field_control.py`, tests for guards, frontend `EntityForm` controlled fields. | P1 for non-core modules that use hand-rolled forms. |
| 6. Runtime visibility / release surface | partial | Module registry, navigation permissions and runtime visibility resolver exist. No final release-surface registry was found that hides all partial pages by environment. | P1/P0-if-exposed. |
| 7. Module registry / readiness / feature flags | partial | `lib/modules/moduleRegistry.ts`, `featureFlags`, setup/readiness exist. Several pages are route wrappers not obviously release-classified. | P1. |
| 8. Auth / tenant / scope | partial | Backend security, tenant tests, scope policy tests, middleware and permissions exist. Static audit did not prove every Next fallback enforces scope equally. | P1; P0 if any live route bypasses scope. |
| 9. Audit / outbox / process | partial | Backend audit/outbox/process domains and tests exist; admin outbox and process pages exist; temporary fallbacks remain. | P1. |
| 10. Frontend template consistency | partial | `SmartDataTable`, `EntityForm`, wizard components exist and are used in core pages; many MVP pages use local tables/forms. | P1 for field test polish. |
| 11. Legacy/obsolete code risk | partial | Redirect aliases, legacy pages and deprecated permission aliases exist. No unsafe deletion performed. | P1/P2 cleanup. |
| 12. Production readiness effect | partial | Build/tests pass, but live surface is too broad without environment visibility gating. | `PILOT_ONLY` until release registry/live smoke. |

## Architecture Decision Notes

- The target architecture is visible in code: Next as UI/BFF, FastAPI as canonical core, OpenAPI as contract, PostgreSQL/Supabase as data/auth/storage, workers for async jobs.
- The remaining problem is not a missing backend; it is operational separation and release discipline.
- The high-risk area is the overlap zone where Next routes still contain domain mutation/fallback behavior.

## Findings

- Backend migration and policy layers are materially present.
- The codebase is buildable and testable.
- CRUD/wizard intent is implemented for company/ownership/representative/branch/HR lifecycle areas.
- Runtime visibility exists as primitives, but not yet as a final environment release gate.

## Risks

- P1: partial pages can appear as production navigation items if feature/readiness flags are too permissive.
- P1: temporary fallback routes can keep Next acting as backend in production.
- P1: hand-rolled module forms may bypass canonical template behavior or locked-field UX.

## Recommended Fixes

- Create a release registry that maps route -> `live_candidate`, `staging_candidate`, `develop_only`, `hidden`.
- Convert temporary fallbacks to FastAPI-only proxies after staging verification.
- Require canonical list/form/wizard patterns for all routes promoted to live.
- Add route-level smoke tests for tenant/scope/permission denial on live candidates.

## P0/P1/P2 Priority

- P0: none confirmed in static/build audit.
- P1: release surface gating, temporary fallback removal, template consistency on live candidates.
- P2: deprecated permission aliases, legacy redirects and UI polish.

## Suggested Next Prompt

`Page Release Registry + Live/Preview/Hidden Visibility: ArchitectureComplianceReport ve PageStatusMatrix'e gore production navigasyonunu sadece live_candidate route'larla sinirla.`
