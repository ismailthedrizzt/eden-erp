# Next.js Cleanup Plan

<!-- source-of-truth-standard: contract overrides markdown -->

Bu plan Next.js tarafinda kalacak, silinecek, proxy olacak ve FastAPI'ye tasinacak alanlari siniflandirir.

## delete_obsolete

| path/pattern | reason | timing |
| --- | --- | --- |
| Eski Turkce/Ing route kalintilari (`/api/sirketler`, `/app/app/sirket/sirketler` varsa) | Yeni canonical route yapisi `/companies`, `/partners`, `/representatives`, `/branches`. | Tespit edilir edilmez. |
| Kullanilmayan compatibility aliases | Yeni sistem tek canonical field/action key kullanir. | Import kalmadiginda. |
| Main record PATCH ile relation/official field fallbackleri | Field Control ve operation/wizard kuralina aykiri. | FastAPI endpoint devreye alinmadan once P0 audit. |

## deprecated_wrapper

| path/pattern | reason | target |
| --- | --- | --- |
| `app/api/companies/[company_id]/official-changes/_shared.ts` | Company/branch/org/facility/NACE/document/date/response helperlarini gecis icin topluyor. | Domain/FastAPI proxy sonrasinda silinecek; yeni business logic eklenmeyecek. |
| `app/api/companies/[company_id]/capital-increases/_shared.ts` | Capital operation validation ve payload helperlari route ailesini ayakta tutuyor. | Python capital/ownership services cikinca silinecek. |
| `app/api/ownership-transactions/_shared.ts` | Ownership validation/mapping helperlari route ailesini ayakta tutuyor. | Python Ownership Domain Service cikinca silinecek. |
| `lib/read-models/registry.ts` legacy projection key map | UI gecisi icin alias sagliyor. | Canonical projection key kullanimi tamamlaninca sil. |
| `lib/tenancy/databaseRouting.ts` legacy fallback query | Workspace routing gecis katmani. | Python tenancy service ve tek binding contract. |

## migrate_to_fastapi

| path/pattern | target |
| --- | --- |
| `app/api/companies/[company_id]/official-changes/**` | `/api/v1/companies/{company_id}/official-changes/*` |
| `app/api/companies/[company_id]/capital-increases/**` | `/api/v1/companies/{company_id}/capital-increases` |
| `app/api/companies/[company_id]/current-ownership/route.ts` | `/api/v1/companies/{company_id}/current-ownership` |
| `app/api/companies/current-ownership/route.ts` | `/api/v1/ownership/current` for single-company reads; batch proxy remains a follow-up. |
| `app/api/companies/branches/**` | `/api/v1/branches` |
| `app/api/companies/representatives/**` | `/api/v1/representatives` |
| `app/api/ownership-transactions/**` | `/api/v1/ownership/transactions`, follow-up for `/api/v1/ownership/{transaction_id}/approval|reversal` style endpoints |
| `app/api/processes/**`, `app/api/tasks/**`, `app/api/approvals/**` | `/api/v1/processes`, `/api/v1/tasks`, `/api/v1/approvals` |
| `app/api/audit/**` | `/api/v1/audit` |
| `app/api/cron/outbox-dispatch` | Python worker scheduler |
| `lib/operations/**`, `lib/process/**`, `lib/outbox/**`, `lib/audit/**`, `lib/integrity/**`, `lib/domains/**` | `backend/app/**` |

## keep_ui_adapter

| path/pattern | reason |
| --- | --- |
| `app/api/uploads/**` | UI upload/signed-url adapter; domain document rules still move to Python. |
| `app/api/session/bootstrap` | BFF aggregation can remain while proxying Python readiness/permission/module data. |
| `app/api/auth/**` | UI/auth adapter; no ERP domain mutation should live here. |
| `app/api/onboarding/**`, `app/api/user/preferences` | UI state adapter until user preference service moves. |

## keep_frontend

| path/pattern | reason |
| --- | --- |
| `app/app/**` | Next.js frontend pages. |
| `components/**` | UI components. |
| frontend stores | Client state. |
| UI-only helpers/types | Presentation layer. |

## keep_bff_proxy

| path/pattern | reason |
| --- | --- |
| selected `app/api/**` routes | Frontend compatibility while FastAPI endpoints roll out. |
| `app/api/ai/action-guide/**` | UI-specific AI guide adapter can remain until resolver moves. |
| `app/api/session/bootstrap` | BFF aggregation endpoint can stay if it proxies Python readiness/permissions/modules. |

## proxy_to_fastapi_with_legacy_fallback

| path/pattern | reason | removal trigger |
| --- | --- | --- |
| `app/api/companies/[company_id]/official-changes/branch-opening/**` | FastAPI proxy is active when `FASTAPI_BASE_URL` is configured; TS fallback keeps local frontend usable during migration. | Remove TS fallback after FastAPI branch opening is validated against staging DB. |
| `app/api/companies/[company_id]/official-changes/branch-closing/**` | FastAPI proxy is active when `FASTAPI_BASE_URL` is configured; TS fallback keeps local frontend usable during migration. | Remove TS fallback after FastAPI branch closing is validated against staging DB. |
| `app/api/companies/[company_id]/official-changes/title-change/**` | FastAPI proxy is active when `FASTAPI_BASE_URL` is configured; TS fallback keeps local frontend usable during migration. | Remove TS fallback after FastAPI title change is validated against staging DB. |
| `app/api/companies/[company_id]/official-changes/address-change/**` | FastAPI proxy is active when `FASTAPI_BASE_URL` is configured; TS fallback keeps local frontend usable during migration. | Remove TS fallback after FastAPI address change is validated against staging DB. |
| `app/api/companies/[company_id]/official-changes/public-registration-update/**` | FastAPI proxy is active when `FASTAPI_BASE_URL` is configured; TS fallback keeps local frontend usable during migration. | Remove TS fallback after FastAPI public registration update is validated against staging DB. |
| `app/api/companies/[company_id]/official-changes/nace-change/**` | FastAPI proxy is active when `FASTAPI_BASE_URL` is configured; TS fallback keeps local frontend usable during migration. | Remove TS fallback after FastAPI NACE update is validated against staging DB. |
| `app/api/companies/[company_id]/official-changes/activity-subject-change/**` | FastAPI proxy is active when `FASTAPI_BASE_URL` is configured; TS fallback keeps local frontend usable during migration. | Remove TS fallback after FastAPI activity subject change is validated against staging DB. |
| `app/api/companies/representatives/[id]/route.ts` authority transaction branch | FastAPI proxy is active when `FASTAPI_BASE_URL` is configured for `authority_action`; card update remains a temporary TS fallback. | Remove authority transaction fallback after FastAPI representative authority endpoint is validated against staging DB. |
| `app/api/ownership-transactions/route.ts` POST branch | FastAPI proxy is active when `FASTAPI_BASE_URL` is configured for transaction creation; list and `[id]/**` workflow routes remain TS fallback. | Remove create fallback after FastAPI ownership transaction endpoint is validated against staging DB; migrate approve/reject/cancel/reverse routes next. |
| `app/api/processes/**`, `app/api/tasks/**`, `app/api/approvals/**` | FastAPI proxy is active when `FASTAPI_BASE_URL` is configured; TS Process Engine fallback keeps current UI usable. | Remove TS fallback after Python process/task/approval endpoints are validated against staging DB and UI flows. |
| `app/api/audit/**` | FastAPI proxy is active when `FASTAPI_BASE_URL` is configured; TS audit read service remains fallback. | Remove TS fallback after Python audit permission/scope hardening and admin UI smoke tests. |
| `app/api/action-center/**` | FastAPI proxy is active when `FASTAPI_BASE_URL` is configured; TS resolver remains fallback. | Remove TS fallback after Python Action Center source coverage includes operations/outbox warnings. |
| `app/api/cron/outbox-dispatch/route.ts` | FastAPI proxy is active when `FASTAPI_BASE_URL` is configured; TS dispatcher remains fallback. | Remove TS dispatcher after Python worker deployment is live. |
| `app/api/setup/readiness/**` | FastAPI proxy is active when `FASTAPI_BASE_URL` is configured; TS readiness fallback remains a migration bridge. | Remove TS readiness fallback after Python readiness is validated against staging DB. |
| `app/api/policy/**` | FastAPI-only BFF proxy endpoints; no TS policy fallback should be added. | Keep as thin proxy until frontend can call generated backend client. |
| `app/api/integrity/**` | FastAPI-only BFF proxy endpoints; no TS integrity fallback should be added. | Keep as thin proxy until frontend can call generated backend client. |
| `app/api/companies` and `app/api/companies/[company_id]` GET | FastAPI proxy is active when `FASTAPI_BASE_URL` is configured; TS read fallback remains for local migration. | Remove TS read model fallback after Python projection endpoints are validated. |
| `app/api/companies/branches/**` GET | FastAPI proxy is active for branch list/detail reads; PATCH/DELETE remain guarded BFF migration bridge. | Remove branch read fallback after projection smoke tests. |
| `app/api/companies/partners` GET | FastAPI proxy is active for partner list projection. | Remove partner list fallback after current ownership projection view is verified. |
| `app/api/companies/representatives` GET | FastAPI proxy is active for representative list projection. | Remove representative list fallback after current authority view scope fields are complete. |
| `app/api/companies` POST and `app/api/companies/[company_id]` PATCH/DELETE | FastAPI proxy is active for company card draft create, card PATCH and safe draft DELETE. | Remove TS card CRUD fallback after FastAPI card endpoints are verified with staging data. |
| `app/api/companies/partners` POST and `app/api/companies/partners/[id]` GET/PATCH/DELETE | FastAPI proxy is active for partner card CRUD. | Remove TS partner card fallback after ownership transaction flows and partner detail UI are verified. |
| `app/api/companies/representatives` POST and `app/api/companies/representatives/[id]` GET/PATCH/DELETE | FastAPI proxy is active for representative card CRUD; authority actions route to the authority transaction endpoint. | Remove TS representative card fallback after authority wizard and card edit smoke tests pass. |

## proxy_to_fastapi

| path/pattern | reason |
| --- | --- |
| `app/api/policy/**` | Thin BFF proxy for canonical Python policy decisions; no TS policy fallback should be added. |
| `app/api/integrity/**` | Thin BFF proxy for canonical Python integrity decisions; no TS integrity fallback should be added. |
| Future generated-client server adapters | May call FastAPI directly when session/context is already trusted server-side. |

## official-changes/_shared.ts split plan

| helper class | target |
| --- | --- |
| company lifecycle/context | `backend/app/domains/company/` |
| branch loading/precheck/status | `backend/app/domains/branches/` |
| organization unit create/passive/reassign | `backend/app/domains/organization/` |
| facility create/passive/reuse | `backend/app/domains/facilities/` |
| official transaction/history/outbox/audit assembly | Python operation service + transaction boundary |
| document normalization | Python DTO mapper / document domain |
| date validation | Python operation precheck validator |
| response formatting | thin Next BFF adapter only |

## Enforcement

New Next API route files must include one of the migration status comments:

- `proxy_to_fastapi`
- `proxy_to_fastapi_with_legacy_fallback`
- `proxy_to_fastapi_with_temporary_fallback`
- `keep_bff_proxy`
- `keep_bff_proxy_with_legacy_fallback`
- `keep_ui_adapter`
- `keep_session_bootstrap`
- `keep_upload_adapter`
- `keep_temporary_fallback`
- `migrate_to_fastapi_then_proxy`
- `migrate_to_fastapi`
- `delete_obsolete`
- `deprecated_wrapper`
- `contract_endpoint`
- `contract_shared`
- `keep_shared_contract`
- `keep_generated`
- `generated_do_not_edit`

New business mutation logic should not be added to Next API routes.

Use `npm run migration:status` to report route header coverage, proxy-only violations, temporary fallback counts and client-side backend access risks. Use `npm run migration:inventory` to regenerate [Next API Route Migration Inventory](./NextApiRouteMigrationInventory.md). Use `npm run boundaries:check` to catch proxy-only and client/server import boundary regressions. Use `npm run ts-backend:inventory` to regenerate [Remaining TS Backend Inventory](./RemainingTsBackendInventory.md).

## Step 19 Final Consolidation

P1 fallback removal queue:

| fallback group | removal condition | owner | risk |
| --- | --- | --- | --- |
| company official changes | FastAPI official-change endpoints verified in staging and wizard smoke tests pass | backend/platform | operation history and official field integrity |
| branch opening/closing | FastAPI branch operation endpoints verified with staging data | backend/platform | branch/facility/org consistency |
| company/partner/representative card CRUD | FastAPI card endpoints pass EntityForm create/PATCH/delete smoke tests | backend/frontend | form contract drift |
| ownership transaction workflow subroutes | Python detail/approval/reject/cancel/reverse endpoints or replacement operation endpoints land | backend/platform | current ownership drift |
| process/tasks/approvals | Python process/task/approval endpoints verified with Action Center flows | platform | task and approval state divergence |
| audit/action-center/setup readiness | Python endpoints verified in staging and admin screens smoke tested | platform | missing compliance/setup signals |
| cron outbox dispatch | Python worker deployed and monitored | platform/ops | duplicate or missed events |

No new TS fallback behavior should be added to these groups. A new requirement means adding or extending the FastAPI endpoint first.
