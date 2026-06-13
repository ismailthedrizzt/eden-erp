# Platform Migration Final Report

<!-- source-of-truth-standard: contract overrides markdown -->

## 1. Yapilan Mimari Katmanlar

Yedinci fazdan yirminci final faza kadar Eden ERP icin merkezi Event Contract Registry, Outbox Dispatcher, Action Guide, Guided Tour, Audit Log, Transaction Boundary, Representative Scope, Module Readiness, Action Center, Runtime Visibility, Data Integrity Guards, Domain Boundaries ve Domain Service Layer temelleri kuruldu. Final pass bu katmanlarin registry, response, visibility ve dokumantasyon uyumunu toparladi.

## 2. Etkilenen Moduller

Ana etki alani Sirketlerimiz, Ortaklarimiz, Temsilcilerimiz ve Subelerimiz modul gruplaridir. Platform tarafinda Process, Audit, Outbox, Setup/Readiness, Action Center, AI Action Guide, Field Control ve Module Navigation katmanlari da ortak karar mekanizmasina baglandi.

## 3. Korunan Ilkeler

- Frontend dogrudan Supabase cagirmadi; API/service katmani korundu.
- `+ Ekle` taslak kayit standardi korundu.
- Resmi/lifecycle islem alanlari wizard/operation kontrollu kaldi.
- Process Engine adim/gorev/onay yonetir; Operation Orchestrator mutation akisini koordine eder.
- Outbox external side effect yapmaz; sadece event queue altyapisi olarak kalir.
- Audit, history/transaction kayitlarinin yerine gecmez.
- Kullanici mesajlari teknik tablo/RPC/migration dili yerine is diliyle duzenlendi.

## 4. Tamamlanan Teknik Iyilestirmeler

- Platform consistency helper critical ve warning uretmeyecek hale getirildi.
- Integrity registry'deki company operation key uyumsuzluklari duzeltildi.
- Kullaniciya donebilecek eksik altyapi mesajlari "kurulum/hazir degil" diline cevrildi.
- Technical debt dokumani P1/P2/P3 oncelikli takip formatina alindi.
- Ana platform dokumani alt mimari dokumanlara tek referans olacak sekilde genisletildi.

## 5. Kalan Teknik Borclar

Kalan borclar [Technical Debt and Migration Plan](./TechnicalDebtAndMigrationPlan.md) dokumaninda P1/P2/P3 oncelikleriyle izlenir. En onemli kalemler field control backend enforcement'in tum PATCH route'larinda standardize edilmesi, capital/representative/ownership operasyonlarinin Transaction Boundary/RPC'ye tasinmasi ve eski official change shared helperlarinin domain service'e indirgenmesidir.

## 6. Riskler

- Bazi eski route'lar halen migration bridge wrapper ve lokal guard kullanir; obsolete davranis kalici olarak korunmaz.
- Canli veritabani semasi tenant/readiness durumuna gore farkli davranabilir.
- Process, Audit ve Action Center UI'lari MVP seviyesindedir; ileri admin ekranlari takip fazi gerektirir.
- PWA build ciktilari build sonrasi generated file churn uretebilir; final kontrolde temizlenmelidir.

## 7. Onerilen Sonraki Gelistirme Sirasi

1. FastAPI core backend scaffold'unu production deployment ve OpenAPI generation surecine baglama.
2. Branch Opening/Closing FastAPI endpointlerini ve Python transaction boundary'yi uygulama.
3. Company official changes, Capital Increase, Representative Authority ve Ownership Transactions route'larini Next proxy + FastAPI core pattern'ine tasima.
4. Process, Outbox, Audit, Policy ve Integrity katmanlarini Python servis/worker tarafina alma.
5. Field-control/backend route enforcement standardizasyonunu FastAPI policy ve DTO contract'lariyla birlestirme.

## 7.1 FastAPI Alignment Addendum

2026-05-27 itibariyla hedef mimari netlestirildi: Next.js kalici core backend degildir; frontend ve gecis donemi BFF/adaptor katmanidir. Core ERP backend FastAPI/Python tarafina tasinacaktir. Supabase backend olarak degil, PostgreSQL/Auth/Storage platformu olarak konumlandirilir.

## 7.2 Branch FastAPI Migration Addendum

Sube Acilisi ve Sube Kapanisi FastAPI tarafinda ilk gercek core backend pilotu olarak uygulandi. Canonical endpointler `POST /api/v1/companies/{company_id}/branch-openings`, `POST /api/v1/companies/{company_id}/branch-closings` ve ilgili precheck endpointleridir. Next.js official-change route'lari `FASTAPI_BASE_URL` varsa proxy eder; yoksa `proxy_to_fastapi_with_legacy_fallback` statulu gecici TS fallback calisir. Detaylar [Branch FastAPI Migration](./BranchFastAPIMigration.md) dokumanindadir.

## 7.3 Company Official Changes FastAPI Migration Addendum

Unvan, adres, kamu/tescil, NACE ve faaliyet konusu degisikligi FastAPI Company Domain Service tarafinda canonical operation olarak uygulandi. Next.js official-change route'lari `FASTAPI_BASE_URL` varsa FastAPI endpointlerine proxy eder; yoksa gecici TS fallback yalnizca migration bridge olarak kalir. NACE guncelleme ile faaliyet konusu degisikligi ayrimi Python backend'de de enforce edilir. Detaylar [Company Official Changes FastAPI Migration](./CompanyOfficialChangesFastAPIMigration.md) dokumanindadir.

## 7.4 Capital / Ownership FastAPI Migration Addendum

Sermaye Artirimi FastAPI Company Capital ve Ownership servislerine tasindi. Current ownership okunamazsa, aktif ortak yoksa veya pay dagilimi %100 degilse backend blocking is diliyle cevap verir. Next.js capital route'lari `FASTAPI_BASE_URL` varsa FastAPI endpointlerine proxy eder; yoksa gecici TS fallback yalnizca migration bridge olarak kalir. Detaylar [Capital / Ownership FastAPI Migration](./CapitalOwnershipFastAPIMigration.md) dokumanindadir.

## 7.5 Representative Authority FastAPI Migration Addendum

Temsilci yetki islemleri FastAPI Representative Authority servislerine tasinmaya basladi. `POST /api/v1/representatives/{representative_id}/authority-transactions` endpointi scope validation, kart/yetki ayrimi, normal PATCH authority guard, outbox/audit best-effort ve current authority fallback okuma davranisini uygular. Next.js representative PATCH route'u `authority_action` icin FastAPI proxy dener; `FASTAPI_BASE_URL` yoksa gecici TS fallback migration bridge olarak kalir. Detaylar [Representative Authority FastAPI Migration](./RepresentativeAuthorityFastAPIMigration.md) dokumanindadir.

## 7.6 Ownership Transactions FastAPI Migration Addendum

Ortaklik transaction islemleri FastAPI Ownership ve Partner servislerine tasinmaya basladi. `POST /api/v1/ownership/transactions` endpointi Ilk Ortaklik Girisi, Pay Devri, Ortakliktan Cikis, hak degisikligi, Duzeltme Kaydi ve Ters Kayit icin canonical Python validation/transaction davranisini kurar. Partner PATCH ownership alanlarini reddeder; current ownership once read modelden, gerekirse transaction aggregation fallback'inden okunur. Next.js ownership transaction route'u `FASTAPI_BASE_URL` varsa FastAPI proxy dener; `[id]/**` workflow fallbackleri sonraki migration borcudur. Detaylar [Ownership Transactions FastAPI Migration](./OwnershipTransactionsFastAPIMigration.md) dokumanindadir.

## 7.7 Process / Outbox / Audit FastAPI Migration Addendum

Process instance/task/approval, Audit read/write/masking, Outbox dispatcher ve Action Center minimal read adapter Python backend tarafinda MVP olarak kuruldu. Canonical endpointler `/api/v1/processes`, `/api/v1/tasks`, `/api/v1/approvals`, `/api/v1/audit`, `/api/v1/action-center` ve `/api/v1/system/outbox/dispatch` altindadir. Next.js route'lari `FASTAPI_BASE_URL` varsa proxy eder; yoksa migration bridge TS fallback calisir. Outbox worker `python -m app.workers.outbox_worker --once` komutuyla batch isleyebilir. Detaylar [Process / Outbox / Audit FastAPI Migration](./ProcessOutboxAuditFastAPIMigration.md) dokumanindadir.

## Product Step 7 Audit Compliance Addendum

Audit Admin UI `/app/sistem/audit` artik placeholder degil; filtrelenebilir denetim listesi, son 7 gun varsayilani, pageSize 100 limiti, compliance rapor presetleri, masked old/new detail drawer ve reusable kayit timeline bileseniyle urun deneyimine tasindi. FastAPI `/api/v1/audit` endpointi `audit.view` izni, search/result/severity/action/request/correlation filtreleri ve tenant scope ile sertlestirildi. Export, immutable audit storage, SIEM entegrasyonu ve tam DB-backed coverage testleri P1/P2 teknik borc olarak kalir.

## 7.8 Policy / Integrity / Readiness FastAPI Migration Addendum

Permission registry, policy engine, scope policy, module readiness, integrity checker
ve action eligibility Python backend tarafinda canonical MVP olarak kuruldu.
`/api/v1/setup/readiness`, `/api/v1/policy/*`, `/api/v1/integrity/*` ve
`/api/v1/action-eligibility/evaluate` endpointleri eklendi. Branch, capital,
representative authority ve ownership transaction operasyonlari mutation oncesi
readiness/policy/integrity guard akisini kullanmaya basladi. Detaylar
[Policy / Integrity / Readiness FastAPI Migration](./PolicyIntegrityReadinessFastAPIMigration.md)
dokumanindadir.

## 7.9 Projection / Read Model FastAPI Migration Addendum

Company, branch, partner, representative ve current ownership read modelleri
Python projection katmanina tasinmaya basladi. `/api/v1/companies`,
`/api/v1/branches`, `/api/v1/partners`, `/api/v1/representatives` ve
`/api/v1/projections/{projection_key}` endpointleri pagination/search/sort/status
contract'ini uretir. Next.js list/detail route'lari `FASTAPI_BASE_URL` varsa proxy
eder. OpenAPI client generation icin `openapi:export`, `openapi:generate` ve
`openapi:refresh` scriptleri eklendi. Detaylar
[Projection / Read Model FastAPI Migration](./ProjectionReadModelFastAPIMigration.md)
ve [OpenAPI Client Generation](./OpenAPIClientGeneration.md) dokumanlarindadir.

## 7.10 Next Proxy Consolidation Addendum

Next.js API route migration status sozlugu `proxy_to_fastapi`,
`proxy_to_fastapi_with_legacy_fallback`, `keep_ui_adapter`,
`keep_session_bootstrap` ve `keep_upload_adapter` ayrimlariyla
genisletildi. `lib/backend/fastApiProxy.ts` canonical BFF proxy helper olarak
URL/query insasi, backend header aktarimi, JSON proxy, unavailable response ve
proxy hata normalizasyonunu tek yerde toplar. Detaylar
[Next Proxy Consolidation Report](./NextProxyConsolidationReport.md)
dokumanindadir.

## 7.11 Generated OpenAPI Client Adoption Addendum

FastAPI OpenAPI contract source of truth olarak kalir. `types.ts` generated
dosya olarak elle duzenlenmez; `client.ts` hand-written adapter olarak response
envelope, operation/list envelope, error normalization ve unwrap helperlarini
saglar. `companyService` Company, Branch, Capital, Ownership ve Representative
Authority endpoint ailelerini generated `BackendPaths` ile tipleyerek manual DTO
tekrarlarini azaltmaya baslamistir. Detaylar
[Generated OpenAPI Client Adoption](./GeneratedOpenAPIClientAdoption.md)
dokumanindadir.

## 7.12 Card CRUD FastAPI Migration Addendum

Company, Partner ve Representative kart CRUD islemleri FastAPI domain servislerine
tasinmaya basladi. `/api/v1/companies`, `/api/v1/partners` ve
`/api/v1/representatives` endpointleri draft create, card PATCH ve safe draft
DELETE davranisini saglar. Official, ownership ve authority alanlari normal card
PATCH ile degismez; shared Python field-control guard `OPERATION_CONTROLLED_FIELDS`
dondurur. Next CRUD route'lari `FASTAPI_BASE_URL` varsa proxy eder, yoksa
legacy fallback yalnizca migration bridge olarak kalir. Detaylar
[Card CRUD FastAPI Migration](./CardCrudFastAPIMigration.md) dokumanindadir.

## 7.13 Python Auth / Tenant Security Addendum

FastAPI backend kendi guvenlik sinirini kurmaya basladi. `backend/app/core/security.py`
Supabase JWT dogrulama, user context, internal token guard ve production
security config kontrolunu saglar. `backend/app/policies/access_context.py`
tenant membership, permission loading ve company scope cozumunu Python tarafinda
canonical hale getirir. Next BFF proxy artik normal kullanici cagrisinda
`INTERNAL_BACKEND_TOKEN` tasimaz; varsa Supabase access token'i
`Authorization: Bearer ...` olarak iletir ve proxy secret'i ayri header'da
tutar. Detaylar [Python Auth / Tenant Security](./PythonAuthTenantSecurity.md)
dokumanindadir.

## 7.14 Observability / Logging / Metrics Addendum

FastAPI backend icin structured logging, request/correlation ID middleware,
normalized error responses, in-memory metrics, DB slow query hooks, system
metrics/deep health endpointleri ve operation/outbox/audit/projection log
noktalari kuruldu. Next BFF proxy `X-Request-Id` ve `X-Correlation-Id`
aktarimini standartlastirdi ve FastAPI response headerlarini frontend'e geri
tasir. Detaylar [Observability / Logging / Metrics](./ObservabilityLoggingMetrics.md)
dokumanindadir.

## 7.15 Performance / Load / DB Indexing Addendum

FastAPI backend icin DB pool config, statement timeout hazirligi, slow request
thresholdlari, `X-Response-Time-Ms`, projection performance budgetlari ve
SmartDataTable page size clamp eklendi. Platform load-test senaryolari
`scripts/load-test.js` icinde genisletildi; guvenli index migration hazirligi
`supabase/migrations/20260528_performance_indexes.sql` dosyasindadir. Detaylar
[Performance Targets](./PerformanceTargets.md), [Database Index Plan](./DatabaseIndexPlan.md)
ve [Performance Migration Plan](./PerformanceMigrationPlan.md) dokumanlarindadir.

## 7.16 Deployment / CI-CD / Environment Strategy Addendum

Eden ERP deployment modeli Next.js web/BFF, FastAPI API, Python worker ve
Supabase/PostgreSQL bilesenleri olarak ayrildi. `.github/workflows/ci.yml`
frontend, backend, OpenAPI drift ve Docker build kontrollerini tanimlar.
`Dockerfile.next`, `backend/Dockerfile`, `docker-compose.yml`, env example
dosyalari, smoke-test ve env-safety scriptleri eklendi. Detaylar
[Environment Strategy](./EnvironmentStrategy.md), [CI/CD Strategy](./CICDStrategy.md),
[Deployment Topology](./DeploymentTopology.md) ve
[Release Readiness Checklist](./ReleaseReadinessChecklist.md) dokumanlarindadir.

## 7.17 Python Migration Final Consolidation Addendum

Step 19 ile Next.js API route'larinin kalici backend davranisi kapatildi:
FastAPI core backend canonical kabul edilir, Next.js ise frontend/BFF/proxy/UI
adapter katmanidir. `scripts/check-backend-migration-status.js` proxy-only
ihlallerini ve temporary fallback sayilarini raporlar; `scripts/check-import-
boundaries.js` client/server ve proxy-only import sinirlarini kontrol eder.
`RemainingTsBackendInventory.md` kalan TS backend yuzeyini dosya bazinda
siniflandirir; `TsBackendRemovalReport.md` P1 fallback removal sirasini
belgeler.

## 7.18 Productization Readiness Gate Addendum

Final verification gate sonucu **READY_WITH_P1_DEBT** olarak belirlendi. P0
productization blocker bulunmadi; ancak migrated route gruplarinda temporary TS
fallbackler, ownership workflow subroute'lari, production auth/tenant E2E,
staging DB performance verification ve worker deployment P1 must-fix olarak
kalir. Endpoint/proxy coverage ve gate karari
[FastAPI Endpoint Coverage Matrix](./FastAPIEndpointCoverageMatrix.md),
[Next Proxy Coverage Matrix](./NextProxyCoverageMatrix.md) ve
[Productization Readiness Report](./ProductizationReadinessReport.md)
dokumanlarinda tutulur.

## 7.19 Companies Product Hardening Addendum

The first productization lane for `Sirketlerimiz` is now started:

- company detail shows a product readiness panel for lifecycle, opening, capital, ownership, representative, branch, public/registration and document state;
- active company official fields still route through field-control helpers and FastAPI `OPERATION_CONTROLLED_FIELDS`;
- Action Guide and guided tour copy now explain that `+ Ekle` is draft creation and official changes require wizards;
- product docs were added under `docs/product/companies/` for scope, real-data scenarios, E2E checklist and known gaps.

Remaining P1: run staging E2E with `FASTAPI_BASE_URL`, remove company route temporary fallbacks, and complete lifecycle deep FastAPI coverage for opening/liquidation/deregistration context routes.

## 7.20 Partners / Ownership Product Hardening Addendum

The second productization lane for `Ortaklarimiz` is now started:

- partner detail shows an ownership product summary panel for card status, current ownership, share/vote/profit/capital, company total share signal, privilege/control flags, delete behavior and next ownership actions;
- partner list now exposes share units, privilege/control flags, last ownership transaction and warning count alongside current ownership values;
- field-control and Action Guide copy now make the card-vs-ownership-rights boundary explicit;
- draft delete/blocking messages use business language aligned with FastAPI draft delete guards;
- product docs were added under `docs/product/partners/` for scope, real-data scenarios, E2E checklist and known gaps.

Remaining P1: verify partner/ownership flows in staging with `FASTAPI_BASE_URL`, migrate or replace ownership workflow subroutes (`approve/reject/cancel/reverse/history/impact`) in Python, and remove temporary Next fallbacks after E2E passes.

## 7.21 Representatives / Authority Product Hardening Addendum

The third productization lane for `Temsilcilerimiz` is now started:

- representative detail shows an authority readiness panel for card status, authority status, scope target, signature rule, limits, delete behavior and current authority warnings;
- representative list now exposes authority types, signature rule, scope target, currency, last authority transaction and warning signals alongside card lifecycle;
- field-control, Action Guide and guided tour copy now make the representative-card-vs-authority boundary explicit;
- draft delete/blocking messages use business language aligned with FastAPI draft delete guards;
- product docs were added under `docs/product/representatives/` for scope, real-data scenarios, E2E checklist and known gaps.

Remaining P1: verify representative authority flows in staging with `FASTAPI_BASE_URL`, harden branch/organization/facility scope fixtures and remove temporary Next fallbacks after E2E passes.

## 7.22 Branches Product Hardening Addendum

The fourth productization lane for `Subelerimiz` is now started:

- branch list keeps free create blocked and adds product filters for company, branch type, official/operational mode and city;
- branch widgets now show active, official, operational, closed, organization-linked, facility-linked and authority-bearing branch counts;
- branch detail shows a product readiness panel for company relationship, organization unit link, facility/location link, active representative authority impact and branch closing/document actions;
- FastAPI branch detail/PATCH/DELETE now uses the branch domain service so hydrated company, organization unit, facility and representative authority summary data can feed the current frontend contract;
- field-control, Action Guide and guided tour copy now make the branch-vs-company-vs-facility-vs-organization distinction explicit;

### Product hardening step 5 - Organization and facilities

- FastAPI now includes canonical organization unit and facility/location endpoints for product integration: organization unit list/create/detail/PATCH, position list/create, scoped authority summaries and impact checks; facility list/create/detail/PATCH, scoped authority summaries and impact checks.
- `Teşkilat/Kadro` now presents organization units as hierarchy/kadro records, not branches, with company/status/type/branch-link filters, readiness summary, hierarchy, branch relation and representative authority panels.
- `Tesisler/Lokasyonlar` now presents physical locations as their own domain, not branches, with facility list/detail/create/update, branch/reusable indicators, facility-scope authority visibility and impact guidance.
- Next `/api/facilities` routes are proxy-only. Next `/api/organization` is FastAPI-first with temporary fallback because unit type management still needs a Python endpoint.
- product docs were added under `docs/product/branches/` for scope, real-data scenarios, E2E checklist and known gaps.

Remaining P1: verify Branch Opening/Closing and branch detail hydration in staging with `FASTAPI_BASE_URL`, finalize representative authority impact warning/blocking policy and remove temporary Next fallbacks after E2E passes.

### Product hardening step 6 - Process and Action Center

- `/app/surecler` now presents process, task, approval and operation-warning queues as a real work center rather than a placeholder.
- `/app/surecler/{id}` now exposes process summary, step timeline, task completion/comment actions, approval decisions, related record links and process history.
- FastAPI Action Center now normalizes process tasks, approvals, failed/stuck operations and admin-visible outbox events into user-facing `UnifiedActionItem` records.
- Next Action Center components now handle both FastAPI `ApiSuccess` envelopes and legacy fallback envelopes.

Remaining P1: seed process/task/approval fixtures, run Playwright E2E, harden complex approval matrix and define retry-safe operation policy.

### Product hardening step 8 - Module setup, licensing and feature flags

- `Kurulum Merkezi` now presents module readiness as product cards with summary counts, setup steps and business-language status reasons.
- `Modul Lisanslari` now shows module activation, license language, submodules and feature flags in one detail panel.
- FastAPI now exposes `/api/v1/modules` and `/api/v1/features`; action eligibility can block a disabled feature with `FEATURE_DISABLED`.
- Next adds proxy-only `/api/modules*` and `/api/features*` routes for the new FastAPI contracts.

Remaining P1: move tenant module settings and feature flag overrides to persistent FastAPI DB-backed storage, then convert `/api/settings/module-licenses` to proxy-only.

## 8. Build / Typecheck Sonucu

Final pass sirasinda asagidaki kontroller calistirildi:

- `npm run typecheck`: basarili.
- `npm run typecheck:app`: basarili.
- `npm run build`: basarili.
- `npm run lint`: basarili; mevcut React hook dependency ve `<img>` kullanim uyarilari kaldi.
- Platform consistency check: critical 0, warning 0, info 0.
- `git diff --check`: whitespace error yok; yalnizca Git'in CRLF donusum uyarilari var.
- Local browser smoke: `localhost:3000` uzerinde temel app rotalari application error olmadan yuklendi; yetkisiz oturumda sirket/ortak/temsilci/sube rotalari login'e yonlendi.

## 9. Manual Regression Sonucu

Kod seviyesinde Sirketlerimiz, Ortaklarimiz, Temsilcilerimiz, Subelerimiz, Setup Readiness, Action Center, Audit, Process ve Action Guide entegrasyon noktalarinda statik regresyon kontrolu yapildi. `next build` rota listesinin tamamini uretti ve ana uygulama sayfalari build grafiginde basarili gorundu. Local browser smoke testte `companies`, `partners`, `representatives`, `branches`, `setup`, `audit` ve `process` rotalari application error uretmedi; login gerektiren sayfalar yetkisiz oturumda login ekranina yonlendi. Tam veri girisli E2E senaryolar calistirilmadi.

## 10. Kullanici Deneyimi Etkisi

Kullanici artik teknik tablo/RPC/migration hatasi yerine "modul hazir degil", "kurulum tamamlanmamis", "yetkiniz bulunmuyor" ve "bu alan ilgili islem sihirbaziyla degistirilebilir" gibi is odakli mesajlar gormelidir. Action Guide, Guided Tour, Action Center ve Runtime Visibility katmanlari kullaniciyi dogru sayfa, wizard veya kurulum adimina yonlendirecek ortak platform davranisina yaklasti.
