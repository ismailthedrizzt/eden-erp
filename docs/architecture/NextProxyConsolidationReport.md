# Next Proxy Consolidation Report

## Summary

Step 11 ile Next.js API route'lari kalici backend rolu yerine FastAPI BFF/proxy
rolune indirilmeye basladi. FastAPI endpointi olan route gruplari
`proxy_to_fastapi` veya `proxy_to_fastapi_with_legacy_fallback` statuleriyle
isaretlenir. Legacy TS fallback yalnizca staging FastAPI dogrulamasi tamamlanana
kadar migration bridge olarak kalir.

## Canonical Proxy Helper

`lib/backend/fastApiProxy.ts` canonical helperdir:

- `isFastApiEnabled`
- `buildFastApiUrl`
- `buildBackendHeaders`
- `proxyToFastApi`
- `proxyJsonToFastApi`
- `normalizeFastApiProxyError`
- `fastApiUnavailableResponse`

Helper `FASTAPI_BASE_URL` yoksa `null` donerek mevcut fallback akisini korur.
FastAPI erisilemezse teknik hata yerine is diliyle kontrollu hata doner.

## Route Coverage

Proxy/fallback status verilen route gruplari:

- Companies list/detail/projections and card CRUD
- Branch list/detail and branch opening/closing official changes
- Company official changes and capital increase
- Partners/current ownership, partner card CRUD and ownership transaction creation
- Representatives list/detail, representative card CRUD and authority transaction branch
- Process, tasks, approvals, audit, action center and outbox dispatch
- Setup readiness, policy and integrity endpoints

`app/api/ownership-transactions/[id]/**`, branch documents and capital decrease
routes FastAPI endpoint coverage tamamlanana kadar `deprecated_wrapper` olarak
izlenir; yeni business logic eklenmeyecek.

## Remaining Fallbacks

P1 removal triggers:

- Staging FastAPI endpointleri seeded DB ile dogrulanir.
- Frontend wizard/list/detail smoke testleri Next BFF uzerinden gecer.
- `FASTAPI_BASE_URL` production/staging ortamlarinda zorunlu hale gelir.
- Route fallback'i kaldirilir ve status `proxy_to_fastapi` olarak daraltilir.

## Frontend Wrapper State

`companyService` public method imzalari korunur. Wrapper halen Next BFF
route'larini cagirir, ancak endpoint aileleri generated OpenAPI `BackendPaths`
tipleriyle isaretlenmistir. Dogrudan generated client delegasyonu P1 takip
isidir.

## Validation

`npm run migration:status` route header coverage, invalid status ve client
component backend-risk importlarini raporlar. `npm run migration:inventory`
`NextApiRouteMigrationInventory.md` dosyasini yeni status sozluguyle yeniler.
