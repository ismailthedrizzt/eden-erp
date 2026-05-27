# Representative Authority FastAPI Migration

Bu faz temsilci yetki islemlerini FastAPI core backend'e tasimaya baslar. Next.js route artik canonical backend degildir; `FASTAPI_BASE_URL` tanimliysa authority transaction istekleri Python endpointine proxy edilir.

## Migrated Endpoints

- `POST /api/v1/representatives/{representative_id}/authority-transactions`
- `GET /api/v1/representatives/{representative_id}/current-authority`
- `GET /api/v1/representatives/authorities`
- `GET /api/v1/representatives`
- `GET /api/v1/representatives/{representative_id}`
- `POST /api/v1/representatives`
- `PATCH /api/v1/representatives/{representative_id}`
- `DELETE /api/v1/representatives/{representative_id}`

Asil P0 kapsam `authority-transactions` endpointidir. Liste/detail/card update endpointleri migration yuzeyi ve contract hazirligi olarak eklendi.

## Authority Transaction Model

Desteklenen islem tipleri:

- `Temsilcilik Baslatma`
- `Yetki Yenileme`
- `Yetki Kapsami Degisikligi`
- `Limit Degisikligi`
- `Askiya Alma`
- `Sonlandirma`
- `Duzeltme Kaydi`
- `Ters Kayit`

Python servis katmani `company_representative_authority_transactions` tablosuna islem kaydi yazar, temsilci kartinin ana durumunu gunceller, current authority read modelini okur, outbox event ve audit kaydini best-effort olarak uretir.

## Card vs Authority

Temsilci karti `company_representatives` kaydidir. Yetki; kapsam, limit, imza turu ve yetki tipiyle birlikte authority transaction seviyesinde tutulur.

Normal kart PATCH su alanlari reddeder:

- authority/status/workflow alanlari
- limit ve para birimi alanlari
- scope alanlari
- current authority ve transaction history alanlari

Hata kodu: `OPERATION_CONTROLLED_FIELDS`.

## Scope Rules

Scope tipleri:

- `company_wide`
- `branch`
- `organization_unit`
- `facility`

Kurallar:

- `company_wide` scope'ta branch/unit/facility secilemez.
- `branch` scope aktif ve ayni sirkete bagli sube ister.
- `organization_unit` scope aktif ve ayni sirkete bagli organizasyon birimi ister.
- `facility` scope aktif ve ayni sirkete bagli tesis/lokasyon ister.
- Kapali/pasif scope hedefleri yeni aktif yetki alamaz.

Askıya alma ve sonlandirma islemleri yeni scope gelmezse mevcut yetkinin scope'unu korur.

## Next Proxy Behavior

`app/api/companies/representatives/[id]/route.ts`:

- `authority_action=true` veya bilinen transaction type varsa FastAPI proxy dener.
- `FASTAPI_BASE_URL` yoksa TS legacy fallback calisir.
- Kart update davranisi bu fazda TS fallback olarak kalir.

Migration status:

```ts
// BACKEND_MIGRATION_STATUS: proxy_to_fastapi_with_legacy_fallback
// TARGET_FASTAPI_ENDPOINT: /api/v1/representatives/{representative_id}/authority-transactions
```

## Outbox / Audit

Outbox eventleri:

- `representative.authority_started`
- `representative.authority_updated`
- `representative.authority_suspended`
- `representative.authority_terminated`

Audit action:

- `operation_complete`
- old/new authority scope ve limit ozeti

Audit/outbox best-effort calisir; bu ek kayitlarin eksikligi ana transaction'i kirmamalidir.

## Known Gaps

- Representative list/detail FastAPI endpointleri henuz projection optimizasyonu tasimiyor.
- JWT ve permission enforcement Python tarafinda MVP header context seviyesinde.
- Current authority view kapsam hydration'i DB view'e baglidir; view yoksa son approved transaction fallback kullanilir.
- Representative card create/update route'lari tam frontend proxy'ye alinmadi.
- Approval/process entegrasyonu sonraki fazda Python'a tasinacak.
