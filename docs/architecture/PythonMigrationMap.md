# Python Migration Map

Bu dokuman TypeScript backend logic'inin FastAPI/Python core backend'e nasil ayrilacagini tanimlar.

## A. Python'a Tasinacak

| TypeScript source | Python target | migration note |
| --- | --- | --- |
| `lib/operations/orchestrators/*` | `backend/app/domains/*` + operation services | Operation flow, precheck, idempotency ve mutation coordination Python'a tasinir. |
| `lib/operations/transaction-boundary/*` | `backend/app/services` veya `backend/app/domains/*` transaction unit-of-work | SQLAlchemy transaction veya DB RPC boundary Python'da uygulanir. |
| `lib/process/*` | `backend/app/domains/process` | Process instance/task/approval/event engine Python'a tasinir. |
| `lib/outbox/*` | `backend/app/domains/outbox`, `backend/app/workers` | Dispatcher ve handler runner worker olarak calisir. |
| `lib/audit/*` | `backend/app/domains/audit` | Audit write/read service Python'da olur. |
| `lib/integrity/*` | `backend/app/policies` veya `backend/app/domains/*/integrity.py` | Cross-domain consistency Python precheck katmanina tasinir. |
| `lib/security/policyEngine.ts` | `backend/app/policies` | Permission, scope ve record-status karar kaynagi Python olur. |
| `lib/security/scopePolicy.ts` | `backend/app/policies/scope.py` | Tenant/company/branch/facility scope enforcement Python'a tasinir. |
| `lib/security/serverPermissions.ts`, `lib/tenancy/server.ts` | `backend/app/core/security.py`, `backend/app/policies/access_context.py` | Supabase JWT, tenant membership, permission loading ve company scope karar kaynagi Python olur. |
| `lib/domains/*` | `backend/app/domains/*` | TS domain service prototipleri Python domain service'lere donusur. |
| `lib/setup/moduleReadinessChecker.ts` | `backend/app/services/readiness.py` | Module readiness Python request/startup guard olarak calisir. |
| `lib/read-models/*.server.ts`, projection query helpers | `backend/app/projections` | Projection/read model service veya DB view contract Python'a tasinir. |
| `app/api/**` business logic | `backend/app/api/v1/**` | Next route proxy/adaptor kalir. |

## First Endpoint Candidate Matrix

| domain | current TypeScript path | target Python path | migration priority | dependency | risk | first endpoint candidate |
| --- | --- | --- | --- | --- | --- | --- |
| Branch | `app/api/companies/[company_id]/official-changes/branch-opening/route.ts`, `app/api/companies/[company_id]/official-changes/branch-closing/route.ts`, `app/api/companies/branches/**`, `lib/operations/orchestrators/companyBranch*.ts`, `lib/domains/branches/**`, `lib/read-models/projections/branch*.ts` | `backend/app/domains/branches/`, `backend/app/api/v1/branches.py`, `backend/app/api/v1/company_branches.py`, `backend/app/domains/organization/`, `backend/app/domains/facilities/` | P0 | company, organization, facilities, outbox, audit | partial mutation and cross-domain consistency | `/api/v1/companies/{company_id}/branch-openings` |
| Company official changes | `app/api/companies/[company_id]/official-changes/**`, `app/api/companies/[company_id]/official-changes/_shared.ts`, `lib/operations/orchestrators/companyOfficialChange.orchestrator.ts` | `backend/app/domains/company/`, `backend/app/api/v1/companies.py` | P0 | policy, integrity, audit, outbox | official fields changing outside transaction boundary | `/api/v1/companies/{company_id}/official-changes/title-change`, `/address-change`, `/public-registration-update`, `/nace-change`, `/activity-subject-change` |
| Capital | `app/api/companies/[company_id]/capital-increases/**`, `app/api/companies/[company_id]/capital-decreases/**`, `lib/operations/orchestrators/capitalIncrease.orchestrator.ts` | `backend/app/domains/company/capital.py`, `backend/app/domains/ownership/` | P0/P1 | ownership current state, partners readiness, audit | ownership/capital mismatch | `/api/v1/companies/{company_id}/capital-increases` implemented for increase |
| Representatives | `app/api/companies/representatives/**`, `lib/operations/orchestrators/representativeAuthority.orchestrator.ts`, `lib/domains/representatives/**` | `backend/app/domains/representatives/`, `backend/app/api/v1/representatives.py` | P0 | branch/org/facility scope policy | duplicated cards or invalid authority scope | `/api/v1/representatives/{representative_id}/authority-transactions` implemented for authority transaction migration |
| Ownership | `app/api/ownership-transactions/**`, `app/api/companies/partners/**`, `lib/operations/orchestrators/ownershipTransaction.orchestrator.ts`, `lib/domains/ownership/**` | `backend/app/domains/ownership/`, `backend/app/domains/partners/`, `backend/app/api/v1/ownership.py`, `backend/app/api/v1/partners.py` | P0 | company, partners, process approvals | current ownership drift | `/api/v1/ownership/transactions` implemented for transaction creation; `[id]/**` approval/reversal routes remain follow-up |
| Card CRUD | `app/api/companies`, `app/api/companies/[company_id]`, `app/api/companies/partners/**`, `app/api/companies/representatives/**` | `backend/app/api/v1/{companies,partners,representatives}.py`, `backend/app/domains/{company,partners,representatives}` | P1 | projections, field control, delete guards | card edit changing operation-controlled state | Draft create, card PATCH and safe draft DELETE implemented for company/partner/representative cards |
| Process | `lib/process/**`, `app/api/processes/**`, `app/api/tasks/**`, `app/api/approvals/**` | `backend/app/domains/process/`, `backend/app/api/v1/{processes,tasks,approvals}.py` | P1 | operation endpoints, audit | task/approval state divergence | `/api/v1/processes`, `/api/v1/tasks`, `/api/v1/approvals` implemented as MVP |
| Outbox | `lib/outbox/**`, `app/api/cron/outbox-dispatch/route.ts` | `backend/app/domains/outbox/`, `backend/app/workers/` | P1 | event registry, audit | duplicate or lost event dispatch | `/api/v1/system/outbox/dispatch` and `python -m app.workers.outbox_worker --once` implemented |
| Audit | `lib/audit/**`, `app/api/audit/**` | `backend/app/domains/audit/`, `backend/app/api/v1/audit.py` | P1 | masking, tenant scope, permission | missing compliance trace | `/api/v1/audit` implemented with masking/list/detail MVP |
| Auth / Tenant Security | `lib/backend/fastApiProxy.ts`, `lib/security/serverPermissions.ts`, `lib/tenancy/**` | `backend/app/core/security.py`, `backend/app/policies/access_context.py`, `scope_policy.py` | P0 | Supabase Auth, tenant membership, permissions | header spoofing / cross-tenant access | Supabase JWT verification, tenant context, permission and scope loading landed |
| Observability | `middleware.ts`, proxy headers, ad-hoc logs | `backend/app/core/{logging,middleware,metrics,sanitization,error_tracking}.py`, system endpoints | P0/P1 | FastAPI, workers, Next BFF | untraceable production failures | Request/correlation IDs, structured logs, metrics, slow query hooks and error normalization landed |
| TS backend removal | `app/api/**`, `lib/{operations,process,outbox,audit,integrity,setup,read-models,domains,security}` | FastAPI domain/API/worker services plus generated OpenAPI contracts | P1 | all migrated modules | duplicate backend logic and unclear ownership | `RemainingTsBackendInventory.md`, `TsBackendRemovalReport.md`, `boundaries:check` and hardened `migration:status` landed |

## B. TypeScript'te Kalacak

| source | reason |
| --- | --- |
| `app/app/**` | Next.js frontend UI. |
| `components/**` | UI componentleri, tour, action guide, action center, forms. |
| frontend stores | Browser/client state. |
| API client wrappers | FastAPI OpenAPI client'a gecene kadar frontend adaptor. |
| frontend-only normalization | Form display/input normalization; persistence mappers backend'e tasinir. |
| UI-only type definitions | Component props ve presentation types. |

## C. Contract Olarak Paylasilacak

| contract | source of truth target |
| --- | --- |
| action keys | FastAPI OpenAPI + generated TS constants veya shared generated package |
| module keys | module contract export + Python enum |
| permission keys | Python permission registry + generated TS contract |
| event names | Python event contract registry + generated TS contract |
| process keys | Python process registry + generated TS contract |
| field control keys | Python policy/field contract + generated TS read model |
| DTO schemas | FastAPI OpenAPI / Pydantic v2 |
| enum definitions | Python enum + OpenAPI generated TS |

## Policy / Integrity / Readiness Python Targets

| current TS path | target Python path | status |
| --- | --- | --- |
| `lib/security/permissionRegistry.ts` | `backend/app/policies/permissions.py` | Python registry landed; generated TS contract planned |
| `lib/security/policyEngine.ts` | `backend/app/policies/policy_engine.py` | Python policy decision MVP landed |
| `lib/security/scopePolicy.ts` | `backend/app/policies/scope_policy.py` | Python scope policy MVP landed |
| `lib/setup/*` | `backend/app/setup/*` | Python readiness checker and endpoints landed |
| `lib/integrity/*` | `backend/app/integrity/*` | Python operation integrity checker landed |
| `lib/security/actionEligibility.ts` | `backend/app/policies/action_eligibility.py` | Python action eligibility MVP landed |

## Projection / Read Model Python Targets

| current TS path | target Python path | status |
| --- | --- | --- |
| `lib/read-models/projections/company*` | `backend/app/projections/company.py` | Company list/detail MVP landed |
| `lib/read-models/projections/branch*` | `backend/app/projections/branch.py` | Branch list/detail/summary MVP landed |
| `lib/read-models/projections/partner*` | `backend/app/projections/partner.py` | Partner list + current ownership hydrate MVP landed |
| `lib/read-models/projections/representative*` | `backend/app/projections/representative.py` | Representative list + authority status hydrate MVP landed |
| `lib/read-models/projections/currentOwnership*` | `backend/app/projections/current_ownership.py` | Current ownership projection wrapper landed |

## D. Silinecek / Sadelestirilecek

| pattern | action |
| --- | --- |
| duplicate route business logic | FastAPI endpoint var oldugunda sil/proxy yap |
| old fallback routes | canli kullanim yoksa sil |
| obsolete wrappers | deprecation planina gore sil |
| unused compatibility adapters | import yoksa sil |
| direct DB business logic in API route | Python endpoint cikinca kaldir |
| relation patch in main company PATCH | field/domain-specific endpoint veya operation'a tasi |

## Migration Status Comment Standard

```ts
// BACKEND_MIGRATION_STATUS: proxy_to_fastapi_with_legacy_fallback
// TARGET_BACKEND_MODULE: branches
// TARGET_FASTAPI_ENDPOINT: /api/v1/branches
// NOTES: Proxies to FastAPI when configured; TS fallback is temporary migration bridge.
```

Allowed statuses:

- `keep_frontend`
- `keep_bff_proxy`
- `keep_bff_proxy_with_legacy_fallback`
- `proxy_to_fastapi`
- `proxy_to_fastapi_with_legacy_fallback`
- `proxy_to_fastapi_with_temporary_fallback`
- `keep_ui_adapter`
- `keep_session_bootstrap`
- `keep_upload_adapter`
- `keep_temporary_fallback`
- `migrate_to_fastapi`
- `migrate_to_fastapi_then_proxy`
- `delete_obsolete`
- `deprecated_wrapper`
- `contract_endpoint`
- `contract_shared`
- `keep_shared_contract`
- `keep_generated`
- `generated_do_not_edit`

Step 11 itibariyla FastAPI endpointi olan Next route'lari icin tercih edilen
status `proxy_to_fastapi` veya `proxy_to_fastapi_with_legacy_fallback` oldu.
`migrate_to_fastapi` TS backend core dosyalari ve henuz proxy'ye inmemis
backend logic icin kullanilir.

Step 19 itibariyla `npm run boundaries:check` proxy-only rotalarda TS
backend/domain importlarini critical error olarak yakalar. `npm run
ts-backend:inventory` kalan TS backend yuzeyini dosya bazinda listeler.
