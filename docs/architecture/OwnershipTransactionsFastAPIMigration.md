# Ownership Transactions FastAPI Migration

Bu fazda ortaklik/ownership transaction islem ailesi icin canonical backend FastAPI tarafina tasinmaya basladi. Next.js route'lari frontend uyumlulugu icin gecici BFF/proxy rolundedir.

## Migrated Endpoints

- `GET /api/v1/ownership/current?company_id=...`
- `GET /api/v1/companies/{company_id}/current-ownership`
- `POST /api/v1/ownership/transactions`
- `POST /api/v1/ownership/initial-partnership-entry`
- `POST /api/v1/ownership/share-transfer`
- `POST /api/v1/ownership/ownership-exit`
- `POST /api/v1/ownership/correction`
- `POST /api/v1/ownership/reversal`
- `PATCH /api/v1/partners/{partner_id}` card-only update guard

## Domain Rules

- Ortak karti kimlik, iletisim, profil ve belge bilgisidir.
- Ortaklik haklari pay, oy, kar payi, sermaye tutari, pay adedi ve imtiyaz alanlaridir.
- Ortaklik haklari normal partner card PATCH ile degistirilemez.
- Ilk Ortaklik Girisi taslak partner kartini aktif ortak yapar.
- Pay Devri devreden ve devralan ortaklari ayni company scope icinde kontrol eder.
- Ortakliktan Cikis tek ortakli sirketi sahipsiz birakamaz.
- Duzeltme ve hak degisikligi islemleri old/new ownership state'i transaction kaydinda tutar.

## Current Ownership

Python current ownership okumasi once `v_current_ownership` read modelini kullanir. View okunamazsa transaction aggregation fallback'i devreye girer. Guvenilir state olusmuyorsa `CURRENT_OWNERSHIP_UNAVAILABLE` blocking error doner.

## Next Proxy Behavior

`app/api/ownership-transactions/route.ts` artik `FASTAPI_BASE_URL` varsa `POST /api/v1/ownership/transactions` endpointine proxy eder. `FASTAPI_BASE_URL` yoksa TS fallback sadece migration bridge olarak calisir; yeni business rule bu route'a eklenmemelidir.

## Remaining Gaps

- `app/api/ownership-transactions/[id]/**` approve/reject/cancel/reverse route'lari henuz legacy TS fallback olarak duruyor.
- Partner list/detail FastAPI projection migration ayrica yapilacak.
- Seeded DB integration testleri current ownership view, operation idempotency, outbox ve audit kayitlarini dogrulamalidir.
- OpenAPI-generated frontend client henuz devreye alinmadi.
