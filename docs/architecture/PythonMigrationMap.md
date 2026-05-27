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
| `lib/domains/*` | `backend/app/domains/*` | TS domain service prototipleri Python domain service'lere donusur. |
| `lib/setup/moduleReadinessChecker.ts` | `backend/app/services/readiness.py` | Module readiness Python request/startup guard olarak calisir. |
| `lib/read-models/*.server.ts`, projection query helpers | `backend/app/projections` | Projection/read model service veya DB view contract Python'a tasinir. |
| `app/api/**` business logic | `backend/app/api/v1/**` | Next route proxy/adaptor kalir. |

## First Endpoint Candidate Matrix

| domain | current TypeScript path | target Python path | migration priority | dependency | risk | first endpoint candidate |
| --- | --- | --- | --- | --- | --- | --- |
| Branch | `app/api/companies/[company_id]/official-changes/branch-opening/route.ts`, `app/api/companies/[company_id]/official-changes/branch-closing/route.ts`, `app/api/companies/branches/**`, `lib/operations/orchestrators/companyBranch*.ts`, `lib/domains/branches/**`, `lib/read-models/projections/branch*.ts` | `backend/app/domains/branches/`, `backend/app/api/v1/branches.py`, `backend/app/api/v1/company_branches.py`, `backend/app/domains/organization/`, `backend/app/domains/facilities/` | P0 | company, organization, facilities, outbox, audit | partial mutation and cross-domain consistency | `/api/v1/companies/{company_id}/branch-openings` |
| Company official changes | `app/api/companies/[company_id]/official-changes/**`, `app/api/companies/[company_id]/official-changes/_shared.ts`, `lib/operations/orchestrators/companyOfficialChange.orchestrator.ts` | `backend/app/domains/company/`, `backend/app/api/v1/companies.py` | P0 | policy, integrity, audit, outbox | official fields changing outside transaction boundary | `/api/v1/companies/{company_id}/official-changes/title-change`, `/address-change`, `/public-registration-update`, `/nace-change`, `/activity-subject-change` |
| Capital | `app/api/companies/[company_id]/capital-increases/**`, `app/api/companies/[company_id]/capital-decreases/**`, `lib/operations/orchestrators/capitalIncrease.orchestrator.ts` | `backend/app/domains/company/capital.py`, `backend/app/domains/ownership/` | P0/P1 | ownership current state, partners readiness, audit | ownership/capital mismatch | `/api/v1/companies/{company_id}/capital-increases` |
| Representatives | `app/api/companies/representatives/**`, `lib/operations/orchestrators/representativeAuthority.orchestrator.ts`, `lib/domains/representatives/**` | `backend/app/domains/representatives/`, `backend/app/api/v1/representatives.py` | P0 | branch/org/facility scope policy | duplicated cards or invalid authority scope | `/api/v1/representatives/{representative_id}/authority-transactions` |
| Ownership | `app/api/ownership-transactions/**`, `app/api/companies/partners/**`, `lib/operations/orchestrators/ownershipTransaction.orchestrator.ts`, `lib/domains/ownership/**` | `backend/app/domains/ownership/`, `backend/app/api/v1/ownership.py` | P0 | company, partners, process approvals | current ownership drift | `/api/v1/ownership-transactions` |
| Process | `lib/process/**`, `app/api/processes/**`, `app/api/tasks/**`, `app/api/approvals/**` | `backend/app/domains/process/`, `backend/app/workers/` | P1 | operation endpoints, audit | task/approval state divergence | `/api/v1/processes` |
| Outbox | `lib/outbox/**`, `app/api/cron/outbox-dispatch/route.ts` | `backend/app/domains/outbox/`, `backend/app/workers/` | P1 | event registry, audit | duplicate or lost event dispatch | `python-worker:outbox-dispatch` |
| Audit | `lib/audit/**`, `app/api/audit/**` | `backend/app/domains/audit/`, `backend/app/api/v1/audit.py` | P1 | masking, tenant scope, permission | missing compliance trace | `/api/v1/audit` |

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
// BACKEND_MIGRATION_STATUS: migrate_to_fastapi
// TARGET_BACKEND_MODULE: branches
// TARGET_FASTAPI_ENDPOINT: /api/v1/branches
// NOTES: Contains domain mutation logic; should move to Python Branch Domain Service.
```

Allowed statuses:

- `keep_frontend`
- `keep_bff_proxy`
- `keep_bff_proxy_with_legacy_fallback`
- `keep_ui_adapter`
- `migrate_to_fastapi`
- `migrate_to_fastapi_then_proxy`
- `delete_obsolete`
- `contract_shared`
- `generated_do_not_edit`
- `deprecated_wrapper`
