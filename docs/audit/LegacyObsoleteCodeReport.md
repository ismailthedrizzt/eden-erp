# Legacy Obsolete Code Report

Audit date: 2026-05-31

Scope: route aliases, compatibility wrappers, temporary fallbacks, mocks, deprecated permission aliases, placeholder pages, old Turkish paths and TS backend migration leftovers. No deletion was performed in this phase.

## Findings Table

| file/path | finding | why risky/obsolete | used by? | recommended action | priority |
| --- | --- | --- | --- | --- | --- |
| `app/muhasebe/**/page.tsx` | legacy redirect/alias pages | duplicate navigation/support surface outside canonical `/app/muhasebe/**` | old bookmarks | keep temporarily, hide from production navigation | P2 |
| `app/ik/personel/page.tsx` | legacy alias placeholder | duplicate HR route outside canonical app shell | old bookmarks | keep temporarily, hide | P2 |
| `app/ayarlar/entegrasyon-ayarlari/page.tsx` | legacy settings alias | duplicate integration settings route | old bookmarks | keep temporarily, hide | P2 |
| `app/app/ik/personel*.tsx` | legacy-rich HR route and placeholders | overlaps with `/app/ik/calisanlar`; more hook warnings and legacy naming | HR users during migration | migrate useful behavior to canonical route, then hide/delete | P1 |
| `app/app/sistem/login-sayfasi/page.tsx` | legacy placeholder | page builds but is not implementation-ready | none/old settings nav | mark coming soon or delete after inventory | P1 |
| `app/app/demo/**` and `app/test/page.tsx` | demo/test pages | should never appear to normal production users | developer/demo | hide via release registry | P2 |
| `app/api/**/route.ts` temporary fallback set | 75 temporary fallback routes | Next can still behave as backend, masking FastAPI divergence | active API callers | migrate/proxy to FastAPI only after staging smoke | P1 |
| `app/api/muhasebe/**` | legacy Turkish accounting API surface | duplicate accounting API namespace | old frontend callers | replace callers with canonical `/api/accounting/**` or FastAPI proxy | P1/P2 |
| `app/api/**` missing migration headers | 205 route files without explicit status header | harder to audit production route responsibility | active routes | document header status | P2 |
| `lib/operations/orchestrators/**` | TS operation orchestrators | canonical operation logic should live in FastAPI | temporary Next fallbacks | migrate to FastAPI and keep only client contracts | P1 |
| `lib/process/**`, `lib/outbox/**`, `lib/audit/**` | TS backend-core helpers imported by UI or fallbacks | weakens frontend/backend boundary | action center, audit, process pages | split client-safe types from server logic | P1 |
| `lib/modules/project-management/*.mock.ts` | mock data/config files | can be mistaken for production source | UI development | keep only if explicitly dev/demo, otherwise replace | P2 |
| `lib/modules/product-services/*.mock.ts` | mock data/config files | can leak demo assumptions into production | UI development | keep only if explicitly dev/demo, otherwise replace | P2 |
| `lib/modules/after-sales/*.mock.ts` | mock data/config files | can blur MVP readiness | UI development | keep only if explicitly dev/demo, otherwise replace | P2 |
| `backend/app/policies/permissions.py` deprecated aliases | deprecated permission fallback keys | increases RBAC matrix complexity | compatibility permissions | document and phase out after role migration | P2 |
| `backend/app/schemas/placeholder.py` | placeholder schema | harmless but signals placeholder endpoints/models | backend placeholder responses | keep documented or remove if unused | P2 |
| `backend/app/workers/README.md` | outbox handlers described as MVP placeholders | worker behavior may be less complete than production expectations | worker operators | expand worker runbook and tests | P1 |
| `lib/security/serverPermissions.ts` legacy access env bypass | `EDEN_ALLOW_LEGACY_API_ACCESS` fallback | dangerous if enabled in production | migration/dev compatibility | assert disabled in production health/security guard | P1 |
| `lib/user-state/server.ts` login disabled env | `EDEN_LOGIN_DISABLED` | auth bypass if enabled in production | local/dev | assert disabled in production guard | P0-if-prod-enabled |
| `components/modules/*MvpPages.tsx` | MVP naming and local form/table patterns | can be promoted before readiness | project/product/after-sales/CRM | staging only until template pass | P1 |

## Search Patterns Used

`sirketler`, `ortaklar`, `temsilciler`, `old`, `legacy`, `deprecated`, `mock`, `placeholder`, `TODO`, `FIXME`, `BACKEND_MIGRATION_STATUS`, `temporary_fallback`, `migrate_to_fastapi`, `delete_obsolete`.

## Notes

- A search for server secrets found service-role usage in server-only helpers and route handlers. No direct client exposure was confirmed in this audit.
- No file was deleted because this phase is an audit, not a cleanup/refactor phase.
- Several "legacy" occurrences are intentional compatibility markers rather than immediate defects.

## Findings

- Legacy and migration compatibility code is expectedly present after the long migration phase.
- The riskiest legacy items are not old page aliases; they are Next API fallback routes and TS backend-core helpers.
- Deprecated permission aliases are acceptable short-term but should not define new production roles.

## Risks

- P1: compatibility routes can accidentally become permanent backend behavior.
- P1: dev/demo/mock pages can appear in production without release gating.
- P0-if-prod-enabled: login/API legacy bypass environment flags would be production blockers if enabled.

## Recommended Fixes

- Add production startup/env guard for `EDEN_LOGIN_DISABLED` and `EDEN_ALLOW_LEGACY_API_ACCESS`.
- Add route release registry to hide demo, test and legacy alias pages.
- Create a TS-backend cleanup epic grouped by `lib/operations`, `lib/process`, `lib/outbox`, `lib/audit`.
- Replace mock data names with explicit `*.demo.ts` or move under demo-only folders.

## P0/P1/P2 Priority

- P0: no active P0 confirmed; auth bypass env flags are P0 if enabled in production.
- P1: temporary fallback routes, TS backend-core helper imports, MVP pages exposed too broadly.
- P2: aliases, mock naming, deprecated permission cleanup.

## Suggested Next Prompt

`Legacy Surface Guard uygula: demo/test/legacy alias route'lari production navigation'dan gizle ve production env'de EDEN_LOGIN_DISABLED / EDEN_ALLOW_LEGACY_API_ACCESS icin hard-fail guard ekle.`
