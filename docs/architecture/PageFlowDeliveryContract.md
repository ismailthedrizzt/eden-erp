# Eden ERP Page / Flow Delivery Contract

<!-- source-of-truth-standard: contract overrides markdown -->

Version: 1.0.0  
Status: active architecture standard  
Owner: Engineering / Product Architecture

## Purpose

Eden ERP'de yeni bir page, form, wizard, lifecycle flow veya operation request
akisi yalnizca UI tamamlandi diye bitmis sayilmaz. Teslim, frontend form state
ile PostgreSQL insert/update arasindaki butun tip, payload, validation, hata ve
test sozlesmesinin tamamlanmasi anlamina gelir.

Bu standart su moduller dahil tum Eden ERP icin gecerlidir: Sirketlerimiz,
Subelerimiz, Ortaklarimiz, Temsilcilerimiz, Personel, Belgeler, Muhasebe,
Araclar, Temalarimiz, lifecycle wizardlari ve operation request akislari.

## Required Pipeline

Hicbir frontend payload'u backend tarafinda raw dict olarak dogrudan DB'ye
tasinamaz. Her akista su zincir korunur:

```text
Frontend form state
-> frontend Zod schema
-> generated typed API client
-> Next BFF/proxy typed payload
-> FastAPI Pydantic request model
-> service layer typed command/model
-> repository layer typed DB input
-> PostgreSQL uyumlu normalize edilmis veri
```

Next BFF auth, tenant, workspace ve correlation context ekleyebilir; payload
contract'i bozmaz, alan adlarini keyfi degistirmez, backend error response'unu
yutmaz.

## Backend ORM Persistence Standard

Yeni CRUD, wizard, submit ve lifecycle write flow'lari backend tarafinda
SQLAlchemy 2.x async ORM + Unit of Work standardini kullanir. Bu karar
backend-only'dir; Next.js, BFF ve frontend componentleri ORM modeli import etmez.

ORM katmani su dosyalarda baslar:

- `backend/app/persistence/orm.py`
- `backend/app/persistence/repository.py`
- `backend/app/persistence/unit_of_work.py`

Yeni write flow icin kural:

- Endpoint Pydantic request model alir.
- Pydantic date/datetime/UUID/enum alanlarini normalize eder.
- Service typed command/model olusturur.
- Repository typed ORM entity veya acik projection query ile calisir.
- `SqlAlchemyUnitOfWork` write transaction siniridir.
- Service basarili write sonunda `commit()` cagirir.
- `commit()` cagrilmadan context kapanirsa Unit of Work rollback yapar.
- Repository frontend form state veya generic raw dict kabul etmez.

Detayli standart:

- `docs/architecture/BackendOrmPersistenceStandard.md`

## Page Contract

Her yeni sayfa veya flow icin machine-readable contract olmalidir. Eden ERP'de
ana registry `contracts/page-flow-contracts.json` dosyasidir. Yeni flow ekleyen
gelistirici bu registry'ye en az su bilgileri ekler:

- page name
- route
- module
- entity
- operation type: `CRUD`, `lifecycle`, `wizard`, `operation_request`, `report`
- backend endpoints
- Next BFF routes
- DB tables
- frontend schemas
- backend schemas
- response schemas
- service commands
- repository methods
- date / datetime / UUID / enum / JSONB field contracts
- error handling and correlation behavior
- backend, frontend and e2e tests
- page status: `development`, `preview`, `live`, `hidden`

## Payload Contract

Her create, update, submit ve lifecycle action payload'u asagidaki field
tiplerini acikca tanimlar:

- string
- number
- boolean
- date
- datetime
- UUID
- enum
- money
- percentage
- JSONB
- nullable
- optional
- array

Su alanlar ozellikle normalize edilir:

- `created_at`
- `updated_at`
- `base_updated_at`
- `effective_date`
- `decision_date`
- `start_date`
- `end_date`
- UUID alanlari
- enum/status/lifecycle state alanlari

Frontend ISO string gonderebilir. Backend Pydantic model veya service command
seviyesinde bunlari `date`, timezone-aware `datetime`, `UUID` ve canonical enum
degerlerine normalize eder. Repository layer PostgreSQL timestamp alanina string
veremez.

## Frontend Validation

Her form veya wizard step icin Zod schema zorunludur.

- Wizard validation step bazli calisir.
- Final submit validation butun payload'u kapsar.
- Backend required alan frontend'de de required olur.
- UUID string olarak tasinsa bile format validate edilir.
- Enum option label ile canonical value ayridir.
- Tarihler ISO string olarak gonderilebilir ama schema backend beklentisini
  garanti eder.
- Component icinde rastgele `JSON.stringify(rawState)` kabul edilmez.

## Backend Validation

Her endpoint Pydantic request model alir.

- Endpoint raw dict kabul etmez.
- Pydantic date/datetime/UUID/Enum donusumunu yapar.
- Service layer typed command/model alir.
- Repository normalize edilmis DB input alir.
- `operation_requests` gibi ortak servisler operation type'a gore typed payload
  dogrulamasi yapar.
- Yeni write flow'lar repository sinirinda SQLAlchemy ORM entity veya typed
  projection input kullanir.
- Transaction boundary `SqlAlchemyUnitOfWork` ile acik olur; implicit commit
  kabul edilmez.

Example:

```py
class RepresentativeAuthoritySubmitRequest(BaseModel):
    company_id: UUID
    representative_id: UUID
    authority_type: RepresentativeAuthorityType
    effective_date: date
    base_updated_at: datetime | None = None
```

## Operation Request Standard

Operation request payload'u JSONB olarak saklanabilir; ancak saklanmadan once
operation type'a bagli typed model ile dogrulanir.

```py
OPERATION_PAYLOAD_MODELS = {
    "representative.authority_start": RepresentativeAuthorityPayload,
    "share.transfer": ShareTransferPayload,
    "capital.increase": CapitalIncreasePayload,
    "company.closure": CompanyClosurePayload,
}
```

`operation_requests.base_updated_at` gibi relational kolonlara yazilan alanlar
DB driver uyumlu Python tipleriyle gitmelidir.

## Date / Datetime / Timezone

- Kullanici girdisi olan `effective_date`, `decision_date`, `start_date`,
  `end_date` tarihleri `date` olarak ele alinir.
- Audit ve concurrency alanlari `datetime` olarak ele alinir.
- `timestamp with time zone` kolonlarina string verilmez.
- `Z` suffix'li ISO string backend tarafinda `+00:00` olarak normalize edilir.
- Audit alanlari backend tarafindan set edilir.

## UUID Standard

- Frontend UUID'leri string tasiyabilir.
- Zod format validation yapar.
- Backend Pydantic `UUID` tipine normalize eder.
- Bos string UUID sayilmaz.
- Nullable UUID ile required UUID ayrimi contract'ta gorunur.

## Enum Standard

- DB'ye Turkish label degil canonical enum value yazilir.
- Frontend option shape:

```ts
{
  label: "Munferiden Temsil",
  value: "sole_authority"
}
```

- Backend Pydantic enum veya Literal kullanir.
- Generated client veya shared constants enum kaynagi olarak kullanilir.

## Error Handling And Correlation

Her submit akisi correlation id tasir.

- Frontend request id uretir veya backend'den alir.
- Next BFF loglari correlation id icerir.
- FastAPI loglari correlation id icerir.
- Service/DB exception loglari endpoint, schema, failing field, expected type,
  received type, DB operation ve correlation id icerir.
- Kullaniciya kisa, guvenli mesaj ve gerekirse referans kodu gosterilir.

Example user message:

```text
Temsil yetkisi islemi tamamlanamadi. Lutfen bilgileri kontrol edip tekrar deneyin.
Hata kodu: OP-20260526-AB12
```

## Quality Gate

Yeni page/flow tamamlandi denmeden once en az su kontroller gecmelidir:

- `npm run page-flow:contract:check`
- TypeScript typecheck
- ESLint / Next build lint phase
- frontend unit tests, varsa
- backend unit tests
- backend schema tests
- OpenAPI generation
- generated client sync check
- migration check
- e2e happy path veya smoke test

Tek komut:

```bash
npm run eden:quality-gate
```

Full release profili:

```bash
npm run eden:quality-gate -- --full
```

## Delivery Checklist

Her yeni page, wizard veya lifecycle flow sonunda
`docs/templates/PageFlowDeliveryChecklist.md` checklist'i doldurulur ve final
cevapta ozetlenir.

## Existing Flow Audit

Mevcut akislara ait ilk audit raporu:

- `docs/audit/PageFlowContractAuditReport.md`

Bu rapor mevcut teknik borcu gosterir. Eski akislardaki gap'ler yeni standardi
engellemez, ancak ilgili flow'a dokunuldugunda kapatilmasi gerekir.
