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
// TARGET_ENDPOINT: /api/v1/branches
// NOTES: Contains domain mutation logic; should move to Python Branch Domain Service.
```

Allowed statuses:

- `keep_frontend`
- `keep_bff_proxy`
- `migrate_to_fastapi`
- `delete_obsolete`
- `contract_shared`
- `generated_do_not_edit`
- `deprecated_wrapper`
