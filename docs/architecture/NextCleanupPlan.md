# Next.js Cleanup Plan

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
| `app/api/companies/[company_id]/official-changes/_shared.ts` | Eski importlari topluyor. | Domain/FastAPI proxy sonrasinda silinecek. |
| `lib/read-models/registry.ts` legacy projection key map | UI gecisi icin alias sagliyor. | Canonical projection key kullanimi tamamlaninca sil. |
| `lib/tenancy/databaseRouting.ts` legacy fallback query | Workspace routing gecis katmani. | Python tenancy service ve tek binding contract. |

## migrate_to_fastapi

| path/pattern | target |
| --- | --- |
| `app/api/companies/[company_id]/official-changes/**` | `/api/v1/companies/{company_id}/official-changes/*` |
| `app/api/companies/[company_id]/capital-increases/**` | `/api/v1/companies/{company_id}/capital-increases` |
| `app/api/companies/branches/**` | `/api/v1/branches` |
| `app/api/companies/representatives/**` | `/api/v1/representatives` |
| `app/api/ownership-transactions/**` | `/api/v1/ownership-transactions` |
| `app/api/processes/**`, `app/api/tasks/**`, `app/api/approvals/**` | `/api/v1/processes`, `/api/v1/tasks`, `/api/v1/approvals` |
| `app/api/audit/**` | `/api/v1/audit` |
| `app/api/cron/outbox-dispatch` | Python worker scheduler |
| `lib/operations/**`, `lib/process/**`, `lib/outbox/**`, `lib/audit/**`, `lib/integrity/**`, `lib/domains/**` | `backend/app/**` |

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

## Enforcement

New Next API route files must include one of the migration status comments:

- `keep_bff_proxy`
- `migrate_to_fastapi`
- `delete_obsolete`
- `deprecated_wrapper`

New business mutation logic should not be added to Next API routes.
