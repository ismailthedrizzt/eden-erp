# Process Engine MVP

Process Engine, Eden ERP'de resmi islemlerin adimlarini, gorevlerini, onaylarini ve durum gecislerini yoneten katmandir. Kritik veri degisikligi yapmaz; mutation sorumlulugu Operation Orchestrator'da kalir.

## Sorumluluk Ayrimi

- Wizard: Kullanicidan islem verisini toplar.
- Process Engine: Sureci, adimlari, gorevleri, onaylari ve durum gecislerini yonetir.
- Operation Orchestrator: Kritik veri degisikligini transaction/history/lifecycle/outbox ile uygular.
- Policy Engine: Kimin hangi adimi yapabilecegini belirler.
- Outbox: Sonuclari sisteme yayar.
- Projection: Guncel liste ve ozet gorunumlerini uretir.

## Temel Kavramlar

- `ProcessDefinition`: Surecin statik sozlesmesi.
- `ProcessInstance`: Tenant bazli calisan surec kaydi.
- `ProcessStepDefinition`: Form, review, approval, operation, notification veya system adimi.
- `ProcessTask`: Kullaniciya/role/permission'a atanabilen is adimi.
- `ProcessApproval`: Onay karari ve karar notu.
- `ProcessEvent`: Surec audit/event izi.

## MVP Tablolari

Migration: `supabase/migrations/20260526_process_engine_mvp.sql`

- `process_instances`
- `process_tasks`
- `process_approvals`
- `process_events`

Tum tablolar `tenant_id` tasir ve tenant scope helper'lari tarafindan filtrelenebilir. API katmani service client uzerinden calisir; frontend dogrudan Supabase cagirma kuralini bozmaz.

## Registry

Process definitions `lib/process/processRegistry.ts` uzerinden okunur.

FastAPI migration sonrasi canonical Python registry `backend/app/domains/process/definitions.py` altinda baslamistir. TypeScript registry UI ve migration fallback icin gecici olarak tutulur.

Pilot surecler:

- `company_branch_opening_process`
- `company_branch_closing_process`

Hazir placeholder surecler:

- `company_opening_process`
- `capital_increase_process`
- `representative_authority_process`
- `ownership_transaction_process`

## Pilot: Sube Acilisi

Adimlar:

1. `draft_request`: Wizard verisi hazirlanir.
2. `document_check`: Resmi belge kontrolu gorevi olusturulabilir.
3. `approval`: Onay politikasi varsa onay bekler.
4. `execute_operation`: `companyBranchOpening.orchestrator` calisir.
5. `completed`: Surec tamamlanir.

Mevcut Sube Acilisi wizard'i direkt orchestrator calistirmaya devam eder. Process instance olusturulursa `process_instance_id` ileride response/toast metadata'sina eklenebilir.

## Pilot: Sube Kapanisi

Adimlar:

1. `draft_request`
2. `impact_review`
3. `approval`
4. `execute_operation`
5. `completed`

`impact_review`, subeye bagli acik personel/kadro/facility/gorev/proje etkisini gorev veya onay akisi olarak modellemek icin hazirdir.

## API MVP

- `GET /api/processes`
- `POST /api/processes`
- `GET /api/processes/:id`
- `POST /api/processes/:id/start`
- `POST /api/processes/:id/steps/:step_id/complete`

## FastAPI Canonical MVP

Yeni canonical endpointler:

- `GET/POST /api/v1/processes`
- `GET /api/v1/processes/{process_id}`
- `POST /api/v1/processes/{process_id}/start`
- `POST /api/v1/processes/{process_id}/steps/{step_key}/complete`
- `POST /api/v1/processes/{process_id}/cancel`
- `GET/POST /api/v1/tasks`
- `GET /api/v1/tasks/{task_id}`
- `POST /api/v1/tasks/{task_id}/assign`
- `POST /api/v1/tasks/{task_id}/complete`
- `GET/POST /api/v1/approvals`
- `POST /api/v1/approvals/{approval_id}/approve`
- `POST /api/v1/approvals/{approval_id}/reject`

Next.js route'lari `FASTAPI_BASE_URL` varsa bu endpointlere proxy eder; yoksa `keep_bff_proxy_with_legacy_fallback` olarak TS fallback calisir.
- `POST /api/processes/:id/cancel`
- `GET /api/tasks`
- `GET /api/tasks/:id`
- `POST /api/tasks/:id/complete`
- `POST /api/tasks/:id/assign`
- `POST /api/tasks/:id/comment`
- `GET /api/approvals`
- `POST /api/approvals`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/reject`

Missing infrastructure durumunda teknik stack trace yerine is diliyle `PROCESS_INFRASTRUCTURE_MISSING` doner.

## Pending Actions

`/api/notifications/pending-actions`, `process_tasks` tablosundan acik surec gorevlerini okuyabilecek hale getirildi. Mevcut taslak/onay bildirimleri korunur; process task altyapisi yoksa liste bozulmaz.
