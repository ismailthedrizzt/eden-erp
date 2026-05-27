# Codebase Inventory

Bu envanter Python/FastAPI core backend gecisi oncesi repo katmanlarini siniflandirir. Sayilar 2026-05-27 tarihli repo taramasindan alinmistir ve yaklasik yonlendirme amaclidir.

## Summary

| kategori | path pattern | yaklasik adet | amac | kalacak mi | Python'a tasinacak mi | silinecek mi | gecis koprusu mu |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| UI/client components | `app/app/**`, `components/**` | 164+ | Sayfa, panel, form, tablo, rehber, action center ve layout UI | Evet | Hayir | Hayir | Hayir |
| API route handlers | `app/api/**` | 196 | Bugun request/response ve bazi business logic | Kademeli | Evet, core logic | Obsolete route varsa evet | Evet |
| frontend service wrappers | `lib/services/**`, `lib/*Client*`, client hooks | 5+ | Frontend/BFF API client ve UI state adapterleri | Evet, sade | Hayir | Duplicate varsa evet | Evet |
| TS backend logic | `lib/operations/**`, `lib/process/**`, `lib/outbox/**`, `lib/audit/**`, `lib/integrity/**`, `lib/security/policyEngine.ts`, `lib/security/scopePolicy.ts`, `lib/domains/**` | 120+ | Operation, process, event, audit, policy, integrity ve domain servisleri | Gecici | Evet | Obsolete wrapper varsa evet | Evet |
| shared contracts/types | `lib/*types.ts`, registry key dosyalari, module contracts | coklu | Action keys, module keys, permission keys, event names, DTO ve enum sozlesmeleri | Evet | Python ile paylasilacak | Hayir | Contract |
| migrations/scripts | `supabase/migrations/**`, `scripts/**`, `backend/migrations/**` | 60+ | DB migration, reference import, quality guard, backend migration scaffold | Evet | Alembic ile koordine | Eski script varsa audit | Hayir |
| docs | `docs/**` | 70+ | Mimari, sayfa ve migration dokumantasyonu | Evet | N/A | Celiskili docs guncellenecek | N/A |
| obsolete/legacy/duplicate files | eski route/path/helper/adaptor kalintilari | audit listesine bagli | Eski davranis veya duplicate karar noktasi | Hayir | Gerekirse | Evet/deprecate | Sinirli |

## Category Details

### 1. UI / Client Components

| path pattern | karar | not |
| --- | --- | --- |
| `app/app/**/page.tsx` | keep_frontend | Next.js kalici frontend olarak kalir. |
| `components/**` | keep_frontend | UI componentleri, onboarding, action guide, action center ve form parcalari kalir. |
| `lib/security/moduleStore.tsx`, `permissionStore.tsx` | keep_frontend | Frontend store olarak kalabilir; backend authorization kaynagi degildir. |

### 2. API Route Handlers

| path pattern | karar | not |
| --- | --- | --- |
| `app/api/companies/**` | keep_bff_proxy -> migrate_to_fastapi | Sirket, resmi degisiklik, branch, partner ve representative route'lari FastAPI endpointlerine proxy/adaptor olacak. |
| `app/api/ownership-transactions/**` | migrate_to_fastapi | Ownership transaction core logic Python Ownership Domain Service'e tasinacak. |
| `app/api/processes/**`, `app/api/tasks/**`, `app/api/approvals/**` | migrate_to_fastapi | Process Engine Python'a tasinacak; Next route UI/BFF adaptor olacak. |
| `app/api/audit/**` | migrate_to_fastapi | Audit read/write service Python'a tasinacak; admin UI icin proxy kalabilir. |
| `app/api/cron/outbox-dispatch` | migrate_to_fastapi | Python worker/cron tarafina tasinacak. |
| `app/api/setup/**` | migrate_to_fastapi | Readiness core Python'a tasinacak; setup UI icin proxy kalabilir. |
| `app/api/ai/action-guide/**` | keep_bff_proxy | Resolver Python'a tasinabilir; UI-specific BFF rolune izin verilir. |

### 3. Frontend Service Wrappers

| path pattern | karar | not |
| --- | --- | --- |
| `lib/services/**` | keep_frontend | Fetch wrapper olarak sade kalmali; DB veya domain mutation logic icermemeli. |
| `components/**` icindeki fetch helperlari | keep_frontend | API client veya hook olarak kalabilir; endpoint contract OpenAPI'den uretilecek client'a tasinabilir. |

### 4. TypeScript Backend Logic

| path pattern | karar | target |
| --- | --- | --- |
| `lib/operations/orchestrators/**` | migrate_to_fastapi | `backend/app/domains/*` + operation services |
| `lib/operations/transaction-boundary/**` | migrate_to_fastapi | SQLAlchemy transaction / DB RPC boundary |
| `lib/process/**` | migrate_to_fastapi | Python Process Domain |
| `lib/outbox/**` | migrate_to_fastapi | Python worker/outbox dispatcher |
| `lib/audit/**` | migrate_to_fastapi | Python Audit Domain |
| `lib/integrity/**` | migrate_to_fastapi | Python Integrity Guard |
| `lib/security/policyEngine.ts`, `scopePolicy.ts` | migrate_to_fastapi | Python Policy/Scope Engine |
| `lib/domains/**` | migrate_to_fastapi | Python Domain Service Layer |
| `lib/setup/moduleReadinessChecker.ts` | migrate_to_fastapi | Python setup/readiness service |
| `lib/read-models/**.server.ts`, projection query helpers | migrate_to_fastapi | Python projection service veya DB view contract |

### 5. Shared Contracts

Paylasilacak contractlar:

- action keys
- module keys
- permission keys
- event names
- process keys
- field control keys
- OpenAPI schemas
- enum definitions
- DTO contracts

Uzun vadede FastAPI OpenAPI source of truth olacak; frontend TypeScript client ve DTO tipleri buradan uretilecek.

### 6. Migrations / Scripts

Supabase SQL migrationlari korunur. Python tarafinda Alembic scaffold eklendi; gecis doneminde SQL migration sahipligi dokumante edilmelidir. Supabase migration ve Alembic ayni nesneyi celiskili yonetmemelidir.

### 7. Docs

Ana referans [EdenERPPlatformArchitecture](./EdenERPPlatformArchitecture.md) dokumanidir. FastAPI gecisi icin yeni referanslar:

- [Python Migration Map](./PythonMigrationMap.md)
- [Python Migration Roadmap](./PythonMigrationRoadmap.md)
- [OpenAPI Contract Strategy](./OpenAPIContractStrategy.md)
- [Next Cleanup Plan](./NextCleanupPlan.md)

### 8. Obsolete / Legacy / Duplicate

Obsolete kalemler [Legacy Obsolete Code Audit](./LegacyObsoleteCodeAudit.md) dokumaninda P0/P1/P2 olarak izlenir. "Eski davranis kirilmasin" gerekcesiyle yeni mimariye aykiri davranis korunmaz.
