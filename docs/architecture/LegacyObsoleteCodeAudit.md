# Legacy / Obsolete Code Audit

Eden ERP yeni tasarlanan bir sistemdir. Bu nedenle eski, duplicate, kullanilmayan veya yeni mimariye aykiri kodlar kalici backward compatibility gerekcesiyle korunmaz. Bu audit silme/merge/deprecation kararlarini Python gecisi oncesi gorunur yapar.

## Priority Legend

- **P0 remove before Python migration**: Python migration baslamadan once kaldirilmasi veya canonical kaynaga baglanmasi gereken risk.
- **P1 remove during backend split**: FastAPI endpoint/proxy ayrimi sirasinda tasinacak veya silinecek kod.
- **P2 later cleanup**: Kademeli temizlik ve UI polish borcu.

## Findings

| file/path | problem | why obsolete | action | priority |
| --- | --- | --- | --- | --- |
| `app/api/companies/[company_id]/official-changes/_shared.ts` | Cok sayida official change helper, scope helper ve wrapper ayni dosyada. | Domain Service Layer ve FastAPI hedefinde route shared helper canonical kaynak olmamali. | `replace`: helperlari Python Company/Branch/Organization/Facility service'e tasi; kalan Next wrapper proxy olsun. | P0 |
| `lib/operations/orchestrators/*` | TS orchestratorlar core mutation akisini tasiyor. | Next.js kalici core backend degil. | `migrate_to_python`: FastAPI operation services ve SQLAlchemy transaction boundary'ye tasi. | P0 |
| `lib/operations/transaction-boundary/*` | TS transaction boundary/RPC runner. | Critical atomicity Python transaction katmanina gecmeli. | `migrate_to_python`: Python transaction unit-of-work/RPC adaptor kur. | P0 |
| `app/api/companies/[company_id]/capital-increases/route.ts` | Sermaye artirimi mutation zinciri route icinde agir. | Core business mutation route'ta kalamaz. | `replace`: Python capital operation endpoint + Next proxy. | P0 |
| `app/api/ownership-transactions/**` | Ownership transaction behavior TS route/service tarafinda. | Ownership Domain Python'a tasinacak P0 operasyon. | `migrate_to_python`: ownership transactions endpointlerini FastAPI'ye tasi. | P0 |
| `app/api/companies/representatives/[id]/route.ts` | Representative authority transaction/scope behavior route icinde. | Temsil yetkisi domain logic Python authority service'e ait olmali. | `replace`: route'u proxy/adaptor yap. | P0 |
| `lib/security/policyEngine.ts`, `lib/security/scopePolicy.ts` | Policy/scope kararinin core uygulamasi TS. | Authorization karar kaynagi Python backend olmalidir; frontend/BFF karar source of truth olamaz. | `migrate_to_python`: TS sadece UI eligibility preview kullansin. | P1 |
| `lib/integrity/**` | Integrity Guard TS'de. | Cross-domain consistency core backend sorumlulugu. | `migrate_to_python`: Python integrity service ve precheck endpointleri. | P1 |
| `lib/process/**` | Process instance/task/approval engine TS. | Process Engine core backend sorumlulugu. | `migrate_to_python`: Python Process Domain. | P1 |
| `lib/outbox/**` ve `app/api/cron/outbox-dispatch` | Outbox dispatch TS/Next cron. | Background worker Python tarafina tasinmali. | `replace`: Python worker + scheduler/queue. | P1 |
| `lib/audit/**` ve `app/api/audit/**` | Audit service TS'de. | Denetim izi core backend ve worker entegrasyonu Python'da olmali. | `migrate_to_python`: Next audit route read-only proxy olabilir. | P1 |
| `lib/read-models/registry.ts` `legacyListProjectionKeyMap` | Legacy projection key aliaslari var. | Yeni sistemde bir projection icin tek key olmali. | `deprecate`: UI importlari canonical key'e tasininca aliaslari sil. | P1 |
| `lib/tenancy/databaseRouting.ts`, `app/api/tenants/current/route.ts` legacy fallback query | Eski foundation/fallback path adlari duruyor. | Yeni sistemde workspace routing tek canonical contract kullanmali. | `merge`: mevcut canli gecis icin planli deprecation; Python tenancy service'e tasi. | P1 |
| `lib/modules/entity-bank-accounts/entityBankAccounts.service.ts` legacy bank account fallback | Legacy bank account path fallbacklari var. | Entity-bank account modelinde tek persistence model olmali. | `deprecate`: veri modeli netlestikten sonra legacy fallback sil. | P2 |
| `app/layout.tsx` `legacyTheme` localStorage fallback | Eski theme anahtari okunuyor. | Yeni user preferences modeli varken uzun vadeli legacy key gerekmez. | `deprecate`: bir release sonra legacy key okumasini kaldir. | P2 |
| `docs/architecture/*` eski "compatibility/backward" ifadeleri | Bazi dokumanlarda eski davranisi koruma dili var. | Yeni karar obsolete davranisin korunmayacagini soyluyor. | `replace`: dokuman dilini migration bridge/deprecation planina cevir. | P1 |
| `docs/AI_COLLABORATION_GUIDE.md` eski shadcn/Tailwind/Supabase backend ifadeleri | Package ve hedef mimariyle celiski. | AI oturumlarinda yanlis mimari karar uretir. | `replace`: bu fazda guncellendi. | P0 |
| `app/api/companies/[company_id]/official-changes/*` precheck ve operation route'lari | Resmi degisiklik precheck/mutation kararlari Next route icinde dagiliyor. | FastAPI Company Domain ve Operation Service source of truth olmali. | `migrate_to_python`: P0 header eklendi; endpointler Python'a tasininca route proxy olur. | P0 |
| `app/api/companies/[company_id]/capital-decreases/**` | Sermaye operasyon ailesinin precheck ve route davranisi TS route'ta. | Capital domain Python'a tasinacak; TS route kalici backend olamaz. | `migrate_to_python`: capital endpointleri Python'a tasininca proxy yap. | P1 |
| `app/api/companies/branches/[id]/documents/route.ts` | Sube belge guncelleme route'u branch/document business rule tasiyor. | Branch ve Document Domain Python'da ayrismali. | `migrate_to_python`: branch document endpointini Python'a tasi. | P1 |
| `app/api/companies/representatives/route.ts` | Temsilci list/create logic route icinde. | Representative Domain Service Python source of truth olmali. | `migrate_to_python`: route sonra proxy/adaptor olur. | P1 |
| Client component Supabase/server import riski | `npm run migration:status` client backend-risk taramasi 0 dosya raporladi. | Frontend dogrudan DB business query yapmamali. | `monitor`: script P1 guard olarak tutulacak. | P1 |

## Duplicate Helper Watchlist

| helper/pattern | canonical target | action |
| --- | --- | --- |
| `getCompanyLifecycle` | Python Company Domain Service, geciste `lib/domains/company` | migrate/replace |
| `isActiveBranch` | Python Branch Domain Service, geciste `branch.types.ts` | migrate/replace |
| `normalizeDocuments` | Document Domain / shared DTO mapper | merge |
| `validateOfficialDates` | Operation precheck validator | merge |
| `detectVersionConflict` | Transaction/optimistic locking helper | merge |
| permission fallback helpers | Permission Registry | merge |
| module guard helpers | Module Guard + Readiness | merge |
| field patch violation helpers | Field Control Guard | merge |
| branch/facility/organization scope helpers | Scope Policy + Domain Service | migrate |
| response normalizers | API response adapter / FastAPI exception mapper | merge |

## Official Change Shared Helper Classification

`app/api/companies/[company_id]/official-changes/_shared.ts` gecis dosyasidir ve `deprecated_wrapper` olarak isaretlidir. Bu dosyada yeni business logic buyutulmeyecek.

| helper group | target |
| --- | --- |
| company lifecycle helpers | `backend/app/domains/company/` |
| branch helpers | `backend/app/domains/branches/` |
| organization helpers | `backend/app/domains/organization/` |
| facility helpers | `backend/app/domains/facilities/` |
| NACE/public registration helpers | `backend/app/domains/company/` |
| transaction/history insert helpers | Python operation service + audit/outbox services |
| document helpers | Python document/branch DTO mapper |
| date validation helpers | Python operation precheck validators |
| response helpers | temporary Next BFF adapter only |

## Route Alias Scan

Canonical paths are `/app/app/sirket/companies`, `/app/app/sirket/companies/partners`, `/app/app/sirket/companies/representatives`, `/app/app/sirket/companies/branches`, `/api/companies`, `/api/companies/partners`, `/api/companies/representatives` and `/api/companies/branches`.

`scripts/check-performance-contracts.js` already asserts that `app/api/sirketler` and `app/app/sirket/sirketler` must not exist. No active legacy Turkish route directory was found in this pass; remaining Turkish table/model names are database naming debt and are tracked separately from route aliases.

## Non-Negotiable Cleanup Rule

If behavior conflicts with target architecture, remove it, replace it with the canonical helper, or add it to this deprecation plan. Do not keep duplicate business rules because they "might be useful later."
