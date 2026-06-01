# Next API Route Reality Report

Audit date: 2026-05-31

Scope: all `app/api/**/route.ts` files. Total route files: 500.

## Guard Script Summary

| metric | value |
| --- | ---: |
| route files | 500 |
| explicit migration headers | 295 |
| missing migration headers | 205 |
| P0 missing headers | 0 |
| temporary fallback routes | 75 |
| proxy-only boundary violations | 0 |
| proxy-only routes without proxy helper | 0 |

## Status Counts

| status | count | interpretation |
| --- | ---: | --- |
| `proxy_to_fastapi` | 222 | desired BFF/proxy direction |
| `proxy_to_fastapi_with_legacy_fallback` | 74 | useful during migration, not final production shape |
| `proxy_to_fastapi_with_temporary_fallback` | 1 | highest-priority fallback cleanup |
| `migrate_to_fastapi` | 164 | Next still acts as backend for these routes |
| `keep_ui_adapter` | 24 | acceptable if no domain mutation/secret leakage |
| `keep_upload_adapter` | 3 | acceptable upload adapters, must keep storage scope checks |
| `keep_session_bootstrap` | 1 | acceptable session bootstrap |
| `deprecated_wrapper` | 11 | cleanup candidates |

## Route Group Reality

| route group | current behavior | status recommendation | business logic present? | DB mutation present? | FastAPI target | risk | recommended action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/companies/**` | mix of FastAPI proxy and legacy/temporary fallback | proxy_to_fastapi | yes | yes | `/api/v1/companies`, branch/partner/representative/operation endpoints | P1, P0-if-scope-bypass | Remove fallback after staging smoke. |
| `/api/ownership-transactions/**` | FastAPI proxy with legacy fallback | proxy_to_fastapi | yes | yes | `/api/v1/ownership` | P1 | Make FastAPI-only and keep idempotent transaction semantics. |
| `/api/processes/**`, `/api/tasks/**`, `/api/approvals/**` | proxy/fallback platform routes | proxy_to_fastapi | yes | yes | `/api/v1/processes`, `/api/v1/tasks`, `/api/v1/approvals` | P1 | Remove TS fallback once process staging smoke passes. |
| `/api/action-center/**` | temporary fallback routes | proxy_to_fastapi | yes | no/partial | `/api/v1/action-center` | P1 | FastAPI-only after dashboard/action smoke. |
| `/api/audit/**` | temporary fallback routes | proxy_to_fastapi | yes | no/partial | `/api/v1/audit` | P1 | Audit export/access permission smoke before live. |
| `/api/accounting/**` | many routes still direct/migrate-to-FastAPI | migrate_to_fastapi | yes | yes | `/api/v1/accounting` | P1 | Migrate high-risk mutations first: reconciliation/import/export/bank sync. |
| `/api/muhasebe/**` | Turkish legacy accounting API surface | delete/migrate | yes | yes | `/api/v1/accounting` | P1/P2 | Replace callers with canonical accounting routes, then delete wrappers. |
| `/api/hr/**`, `/api/employees/**` | FastAPI plus legacy employee routes | migrate/proxy | yes | yes | `/api/v1/hr` | P1 | Prefer `/api/hr/**`/FastAPI canonical routes. |
| `/api/projects/**`, `/api/project-tasks/**` | project/task backend adapter routes | proxy_to_fastapi or migrate | yes | yes | `/api/v1/projects`, `/api/v1/tasks` | P1 | Keep staging until task transition smoke passes. |
| `/api/products/**`, `/api/after-sales/**` | MVP product/after-sales routes | proxy/migrate | yes | yes | `/api/v1/products`, `/api/v1/after-sales` | P1 | Staging-only until template and scope tests pass. |
| `/api/crm/**` | catch-all plus master/stakeholder routes | proxy/migrate | yes | yes | `/api/v1/crm` | P1 | Replace catch-all/legacy logic with explicit FastAPI proxies. |
| `/api/documents/**`, `/api/uploads/**` | document and upload adapters | keep_upload_adapter/proxy | yes | yes | `/api/v1/documents` plus storage adapter | P1 | Signed URL and storage path scope smoke required. |
| `/api/reporting/**`, `/api/export/**`, `/api/import/**` | reporting/import/export backend routes | proxy/migrate | yes | yes | `/api/v1/reporting`, import/export routes | P1 | Scope/export leak tests before production. |
| `/api/integrations/**` | integration/webhook routes | proxy/migrate | yes | yes | `/api/v1/integrations` | P1 | Webhook signature/SSRF/secret smoke before live. |
| `/api/admin/**`, `/api/security/**`, `/api/settings/**` | admin/security/settings operations | proxy/migrate/keep_ui_adapter | yes | yes | `/api/v1/admin`, `/api/v1/security`, `/api/v1/system` | P1 | Role-gate and audit every mutation. |
| `/api/portal/**` | portal external access | proxy_to_fastapi | yes | yes | `/api/v1/portal` | P1, P0-if-scope-bypass | External scope and suspended-user smoke before live. |
| `/api/ai/**` | AI assistant/action-guide routes | proxy/migrate | yes | yes | `/api/v1/ai` | P1 | Enforce no direct critical mutation and prompt masking. |
| `/api/session/**`, `/api/auth/**`, `/api/user/**` | session/auth UI adapter | keep_ui_adapter/session_bootstrap | yes | yes | Supabase/auth adapter | P1 | Ensure no service role exposure and tenant membership validation. |
| `/api/cron/**` | cron worker triggers | proxy_to_fastapi/worker | yes | yes | FastAPI/worker | P1 | Require secret, idempotency and worker visibility. |

## Representative Route Samples

| route path | file path | current behavior | status recommendation | business logic present? | DB mutation present? | FastAPI target | risk | recommended action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/companies` | `app/api/companies/route.ts` | proxy plus temporary fallback | proxy_to_fastapi | yes | yes | `/api/v1/companies` | P1 | Remove fallback after company list/create smoke. |
| `/api/companies/[company_id]` | `app/api/companies/[company_id]/route.ts` | proxy plus temporary fallback | proxy_to_fastapi | yes | yes | `/api/v1/companies/{company_id}` | P1 | Remove fallback after card PATCH guard smoke. |
| `/api/companies/[company_id]/official-changes/title-change` | `app/api/companies/[company_id]/official-changes/title-change/route.ts` | operation proxy plus fallback | proxy_to_fastapi | yes | yes | `/api/v1/companies/{company_id}/official-changes/title-change` | P1/P0-if-bypass | FastAPI-only before production. |
| `/api/companies/branches` | `app/api/companies/branches/route.ts` | branch proxy plus fallback | proxy_to_fastapi | yes | yes | `/api/v1/branches` | P1/P0-if-free-create | Confirm operation guard and remove fallback. |
| `/api/companies/partners` | `app/api/companies/partners/route.ts` | partner proxy plus fallback | proxy_to_fastapi | yes | yes | `/api/v1/partners` | P1 | Locked ownership field smoke. |
| `/api/companies/representatives` | `app/api/companies/representatives/route.ts` | representative proxy plus fallback | proxy_to_fastapi | yes | yes | `/api/v1/representatives` | P1 | Authority field smoke. |
| `/api/ownership-transactions` | `app/api/ownership-transactions/route.ts` | proxy plus fallback | proxy_to_fastapi | yes | yes | `/api/v1/ownership` | P1 | Idempotent transaction smoke. |
| `/api/action-center/counts` | `app/api/action-center/counts/route.ts` | platform proxy plus fallback | proxy_to_fastapi | yes | no/partial | `/api/v1/action-center/counts` | P1 | Company/tenant scope smoke. |
| `/api/audit` | `app/api/audit/route.ts` | audit proxy plus fallback | proxy_to_fastapi | yes | no/partial | `/api/v1/audit` | P1 | Audit permission/export smoke. |
| `/api/accounting/reconciliation/match` | `app/api/accounting/reconciliation/match/route.ts` | accounting route marked for migration/proxy | migrate_to_fastapi | yes | yes | `/api/v1/accounting/reconciliation/match` | P1 | Migrate high-risk mutation. |
| `/api/documents/[id]/download-url` | `app/api/documents/[id]/download-url/route.ts` | document access route | proxy_to_fastapi/adapter | yes | no/partial | `/api/v1/documents/{id}/download-url` | P1/P0-if-leak | Signed URL scope smoke. |
| `/api/portal/documents/[id]/download-url` | `app/api/portal/documents/[id]/download-url/route.ts` | portal external document route | proxy_to_fastapi | yes | no/partial | `/api/v1/portal/documents/{id}/download-url` | P1/P0-if-leak | Customer scope smoke. |
| `/api/integrations/inbound-events` | `app/api/integrations/inbound-events/route.ts` | integration inbound route | proxy_to_fastapi | yes | yes | `/api/v1/integrations/inbound-events` | P1/P0-if-unsigned | Signature/replay smoke. |
| `/api/session/bootstrap` | `app/api/session/bootstrap/route.ts` | session bootstrap adapter/proxy | keep_session_bootstrap | yes | yes | `/api/v1/session/bootstrap` or auth adapter | P1 | Tenant membership smoke. |

## Critical Temporary Fallback Families

| family | examples | risk | priority |
| --- | --- | --- | --- |
| company lifecycle/official changes | title/address/NACE/activity/branch/capital/opening/liquidation/deregistration routes | operation parity and locked-field bypass risk | P1 |
| action/process/task/audit | action-center, processes, tasks, approvals, audit | duplicated platform behavior | P1 |
| setup/readiness/policy/integrity | setup/readiness, policy/evaluate, integrity/check | admin/readiness false confidence | P1 |
| cron/outbox | `cron/outbox-dispatch` | worker behavior hidden behind Next fallback | P1 |

## P0 Criteria Review

| P0 criterion | audit result |
| --- | --- |
| production critical route still core business mutation in Next | not confirmed as currently exposed; 164 migrate-to-FastAPI routes are P1 until exposure is gated |
| client service role or server secret leak | not confirmed by static audit |
| auth/tenant bypass | not confirmed by tests/build; requires live smoke |
| unsigned inbound webhook accepted | not confirmed; backend tests cover unsafe target/header constraints |

## Findings

- Next API route count remains high at 500.
- Guard scripts show zero critical boundary errors, which is good.
- 75 temporary fallback routes and 164 migrate-to-FastAPI routes mean the final architecture is not fully reached.
- The biggest risk is production exposure before fallback removal and route-level smoke.

## Risks

- P1: divergent behavior between FastAPI and temporary TS fallback.
- P1: migration headers missing on 205 routes reduce auditability.
- P1: domain mutations in Next increase blast radius for auth/tenant mistakes.

## Recommended Fixes

- Complete migration headers for all 500 routes.
- Make temporary fallback removal a release blocker for live candidates.
- Add route-level tests that assert FastAPI proxy path is used in production mode.
- Delete deprecated wrappers only after caller inventory confirms no references.

## P0/P1/P2 Priority

- P0: none confirmed.
- P1: temporary fallback and migrate-to-FastAPI groups.
- P2: deprecated wrappers and header coverage cleanup.

## Suggested Next Prompt

`Next API Fallback Burn-down: migration:status ciktisindaki temporary fallback route ailelerini sirayla FastAPI-only proxy yap ve route header coverage'i 500/500'e tamamla.`
