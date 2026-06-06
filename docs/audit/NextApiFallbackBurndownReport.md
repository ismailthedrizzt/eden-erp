# Next API Fallback Burn-down Report

Date: 2026-06-06
Branch: main
Working environment: remote server, local PostgreSQL/local DB

## Purpose

Freeze the current Next API fallback state and start the burn-down plan that enforces FastAPI as the canonical backend.

## Current Baseline

- Next API route files: 502
- Proxy-only candidates: 480
- Temporary fallback or fallback-reference routes: 50
- Migrate-to-FastAPI routes/gaps: 216
- P0 routes: 132
- Direct DB/Supabase app/api access: tracked by `npm run backend:boundary:audit`; current guard should remain zero.

## Burn-down Order

1. Company lifecycle operation routes.
2. Ownership / partner operations.
3. Representative authority operations.
4. Branch lifecycle operations.
5. Document/media/download routes.
6. Accounting risky mutations.
7. Admin/security/audit/export.
8. Portal external routes.
9. CRM/project/after-sales MVP routes.
10. Legacy aliases such as `/api/muhasebe/**`.

## Low-risk Conversion Decision

No critical lifecycle fallback was removed in this phase. The audit found enough P0/P1 surface that fallback removal should happen route-family by route-family with FastAPI smoke coverage.

## Command Baseline

| Command | Result | Notes |
| --- | --- | --- |
| `npm run nextapi:burndown` | Pass | Generated classification, inventory, gap, risk and coverage docs. |
| `npm run migration:status` | Pass | 502 route files; 403 headers; 99 missing headers; 0 P0 missing headers. |
| `npm run backend:boundary:audit` | Pass | 0 app/api direct DB/Supabase access; 0 app/api TS backend imports; 47 server TS direct DB files remain outside app/api. |
| `npm run boundaries:check` | Pass with warnings | 130 warnings; no critical errors. |
| `npm run typecheck` | Pass | No changed TypeScript files to check. |
| `npm run build` | Pass | Existing ESLint warnings only. |
| `npm run release:check` | Pass | Release registry/page route guard passed. |
| `npm run env:safety` | Pass | Release env safety guard passed. |
| `npm run db:target:check` | Pass | `app1db` classified as release target. |
| `npm run openapi:drift` | Pass | OpenAPI export/generate produced no committed diff. |
| `cd backend && python -m ruff check .` | Fail baseline | Existing 93 formatting/import/line-length findings. |
| `cd backend && python -m mypy app` | Fail baseline | Existing `app/api/v1/accounting.py:596` type error. |
| `cd backend && python -m pytest` | Fail baseline | 225 passed, 2 observability tests return 401 under release auth. |

## Temporary Fallback / Fallback Reference Sample

| route path | file path | current status | desired status | FastAPI target | business logic present? | DB mutation present? | auth/tenant/scope behavior | priority | recommended action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/accounting/bank-accounts/[accountId]` | `app/api/accounting/bank-accounts/[accountId]/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/bank-accounts/{accountId}` | no | no | trusted_proxy_context | P1 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/accounting/bank-accounts` | `app/api/accounting/bank-accounts/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/bank-accounts` | no | no | trusted_proxy_context | P1 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/accounting/bank-transactions/[id]/ignore` | `app/api/accounting/bank-transactions/[id]/ignore/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/bank-transactions/{id}/ignore` | no | no | trusted_proxy_context | P1 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/accounting/bank-transactions/[id]/match` | `app/api/accounting/bank-transactions/[id]/match/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/bank-transactions/{id}/match` | no | no | trusted_proxy_context | P1 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/accounting/bank-transactions/[id]` | `app/api/accounting/bank-transactions/[id]/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/bank-transactions/{id}` | no | no | trusted_proxy_context | P1 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/accounting/bank-transactions/import` | `app/api/accounting/bank-transactions/import/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/bank-transactions/import` | no | no | trusted_proxy_context | P1 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/accounting/bank-transactions` | `app/api/accounting/bank-transactions/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/bank-transactions` | no | no | trusted_proxy_context | P1 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/accounting/capital-reconciliation/[id]/match-payment` | `app/api/accounting/capital-reconciliation/[id]/match-payment/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/capital-reconciliation/{id}/match-payment` | no | no | trusted_proxy_context | P0 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/accounting/capital-reconciliation/[id]` | `app/api/accounting/capital-reconciliation/[id]/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/capital-reconciliation/{id}` | no | no | trusted_proxy_context | P0 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/accounting/capital-reconciliation` | `app/api/accounting/capital-reconciliation/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/capital-reconciliation` | no | no | trusted_proxy_context | P0 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/accounting/card-transactions` | `app/api/accounting/card-transactions/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/card-transactions` | no | no | trusted_proxy_context | P1 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/accounting/cari-accounts/[id]` | `app/api/accounting/cari-accounts/[id]/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/cari-accounts/{id}` | no | no | trusted_proxy_context | P1 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/accounting/cari-accounts` | `app/api/accounting/cari-accounts/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/cari-accounts` | no | no | trusted_proxy_context | P1 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/accounting/cari-transactions/[id]` | `app/api/accounting/cari-transactions/[id]/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/cari-transactions/{id}` | no | no | trusted_proxy_context | P1 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/accounting/cari-transactions` | `app/api/accounting/cari-transactions/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/cari-transactions` | no | no | trusted_proxy_context | P1 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/accounting/e-documents/[id]/match` | `app/api/accounting/e-documents/[id]/match/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/e-documents/{id}/match` | no | no | trusted_proxy_context | P0 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/accounting/e-documents/[id]/reject` | `app/api/accounting/e-documents/[id]/reject/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/e-documents/{id}/reject` | no | no | trusted_proxy_context | P0 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/accounting/e-documents/[id]` | `app/api/accounting/e-documents/[id]/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/e-documents/{id}` | no | no | trusted_proxy_context | P0 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/accounting/e-documents/import` | `app/api/accounting/e-documents/import/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/e-documents/import` | no | no | trusted_proxy_context | P0 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/accounting/e-documents` | `app/api/accounting/e-documents/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/e-documents` | no | no | trusted_proxy_context | P0 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/accounting/reconciliation/match` | `app/api/accounting/reconciliation/match/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/reconciliation/match` | no | no | trusted_proxy_context | P1 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/accounting/reconciliation/suggestions` | `app/api/accounting/reconciliation/suggestions/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/reconciliation/suggestions` | no | no | trusted_proxy_context | P1 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/accounting/reconciliation/summary` | `app/api/accounting/reconciliation/summary/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/reconciliation/summary` | no | no | trusted_proxy_context | P1 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/accounting/reconciliation/unmatch` | `app/api/accounting/reconciliation/unmatch/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/reconciliation/unmatch` | no | no | trusted_proxy_context | P1 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/accounting/reconciliation/unmatched` | `app/api/accounting/reconciliation/unmatched/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/accounting/reconciliation/unmatched` | no | no | trusted_proxy_context | P1 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/admin/features/[feature_key]` | `app/api/admin/features/[feature_key]/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/admin/features/{feature_key}` | no | no | trusted_proxy_context | P0 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/admin/features` | `app/api/admin/features/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/admin/features` | no | no | trusted_proxy_context | P0 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/admin/health/deep` | `app/api/admin/health/deep/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/admin/health/deep` | no | no | trusted_proxy_context | P0 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/admin/health` | `app/api/admin/health/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/admin/health` | no | no | trusted_proxy_context | P0 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/admin/integrations/[integration_key]/test` | `app/api/admin/integrations/[integration_key]/test/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/admin/integrations/{integration_key}/test` | no | no | trusted_proxy_context | P0 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/admin/integrations` | `app/api/admin/integrations/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/admin/integrations` | no | no | trusted_proxy_context | P0 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/admin/modules/[module_key]/activation` | `app/api/admin/modules/[module_key]/activation/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/admin/modules/{module_key}/activation` | no | no | trusted_proxy_context | P0 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/admin/modules/[module_key]` | `app/api/admin/modules/[module_key]/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/admin/modules/{module_key}` | no | no | trusted_proxy_context | P0 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/admin/modules` | `app/api/admin/modules/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/admin/modules` | no | no | trusted_proxy_context | P0 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/admin/outbox/[event_id]/retry` | `app/api/admin/outbox/[event_id]/retry/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/admin/outbox/{event_id}/retry` | yes | no | trusted_proxy_context | P0 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/admin/outbox/dispatch-once` | `app/api/admin/outbox/dispatch-once/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/admin/outbox/dispatch-once` | yes | no | trusted_proxy_context | P0 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/admin/outbox` | `app/api/admin/outbox/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/admin/outbox` | yes | no | trusted_proxy_context | P0 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/admin` | `app/api/admin/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/admin` | no | no | trusted_proxy_context | P0 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/admin/settings/[settings_key]` | `app/api/admin/settings/[settings_key]/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/admin/settings/{settings_key}` | no | no | trusted_proxy_context | P0 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/admin/settings` | `app/api/admin/settings/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/admin/settings` | no | no | trusted_proxy_context | P0 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/admin/workspace-settings` | `app/api/admin/workspace-settings/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/admin/workspace-settings` | no | no | trusted_proxy_context | P0 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/auth/otp/send` | `app/api/auth/otp/send/route.ts` | missing_header | keep_session_bootstrap | `/api/v1/auth/otp/send` | yes | no | route_local_or_unknown | P1 | Keep only as bounded adapter; no ERP domain mutation. |
| `/api/crm/stakeholders` | `app/api/crm/stakeholders/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/crm/stakeholders` | no | no | trusted_proxy_context | P1 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/hr/employees/[id]` | `app/api/hr/employees/[id]/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/hr/employees/{id}` | no | no | trusted_proxy_context | P1 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/hr/employees` | `app/api/hr/employees/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/hr/employees` | no | no | trusted_proxy_context | P1 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/products` | `app/api/products/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/products` | no | no | trusted_proxy_context | P1 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/projects/[id]` | `app/api/projects/[id]/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/projects/{id}` | no | no | trusted_proxy_context | P1 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/projects` | `app/api/projects/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/projects` | no | no | trusted_proxy_context | P1 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/projects/summary` | `app/api/projects/summary/route.ts` | proxy_to_fastapi_with_fallback_reference | proxy_to_fastapi | `/api/v1/projects/summary` | no | no | trusted_proxy_context | P1 | Verify fallback reference is non-executable; remove or reclassify after smoke. |
| `/api/reference/turkey-locations` | `app/api/reference/turkey-locations/route.ts` | migrate_to_fastapi | migrate_to_fastapi | `/api/v1/reference/turkey-locations` | no | no | route_local_or_unknown | P1 | Create FastAPI endpoint/schema/tests, then convert Next route to proxy. |

## Next Action

Pick one route family from the burn-down order, confirm FastAPI endpoint coverage and response contract, then convert those routes to `proxy_to_fastapi` only.
