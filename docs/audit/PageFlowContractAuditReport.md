# Page / Flow Contract Audit Report

Date: 2026-06-09  
Scope: Eden ERP priority page, wizard, lifecycle and operation request flows  
Related standard: `docs/architecture/PageFlowDeliveryContract.md`  
Machine registry: `contracts/page-flow-contracts.json`

## Executive Summary

Temsil yetkisi hatasi tekil bir buton hatasi degildi. Pipeline su sekilde
calisiyordu:

```text
Frontend wizard -> Next BFF/proxy -> FastAPI endpoint -> operation service -> PostgreSQL
```

Frontend `base_updated_at` alanini ISO string olarak gonderdi. Backend bu alan
normalize edilmeden `operation_requests.base_updated_at` kolonuna aktarildiginde
`asyncpg` timestamp icin string degil `datetime` bekledi ve islem patladi.

Mevcut kodda temsil yetkisi icin backend tarafinda `_coerce_base_updated_at`
normalizer ve testler bulunuyor. Ancak genel mimari risk devam ediyor: bazi
frontend akislari payload'u component/service icinde `Record<string, any>` olarak
sekillendiriyor ve generated typed client henuz zorunlu teslim kriteri degil.

Bu rapor mevcut akislari P0/P1/P2 riskleriyle kayda alir. Yeni gelistirmelerde
bu gap'ler kabul edilmez; mevcut akislara dokunuldugunda ilgili gap kapatilmalidir.

## ORM Persistence Decision

Pipeline standardi artik backend-only SQLAlchemy 2.x async ORM ve Unit of Work
katmanini da icerir.

- Standart dokuman: `docs/architecture/BackendOrmPersistenceStandard.md`
- Kod giris noktalari:
  - `backend/app/persistence/orm.py`
  - `backend/app/persistence/repository.py`
  - `backend/app/persistence/unit_of_work.py`

Bu karar mevcut tum read projection SQL'lerini tek seferde yeniden yazmak
anlamina gelmez. Ancak yeni CRUD, wizard, submit ve lifecycle write flow'lari
frontend payload dict'lerini PostgreSQL'e indiremez. Pydantic normalization,
typed service command, repository siniri ve acik Unit of Work commit zorunludur.

## Audit Matrix

| Flow | Route | Status | Main risk | Required fix |
| --- | --- | --- | --- | --- |
| Sirket ekleme / kurulus wizard | `/app/sirket/companies` | preview | P1 raw payload / Zod gap | Zod + generated client + e2e |
| Temsilci ekleme | `/app/sirket/companies/representatives` | preview | P1 UUID/string and raw form payload | UUID Pydantic + frontend schema |
| Temsil Yetkisi | `/app/sirket/companies/representatives` | preview | P1 typed client and canonical enum gap | Zod + canonical operation enum + e2e |
| Ortak ekleme | `/app/sirket/companies/partners` | preview | P1 share/date validation drift | Zod + backend matrix tests |
| Ortaklik islemleri | `/app/sirket/companies/partners` | development | P1 operation payload model mapping | OPERATION_PAYLOAD_MODELS |
| Sube ekleme | `/app/sirket/companies/branches` | preview | P1 company UUID/date validation | Zod + backend schema tests |
| Belge yukleme | `/app/belgeler` | preview | P1 typed multipart metadata | Multipart metadata schema |
| Personel ekleme | `/app/ik/calisanlar` | preview | P1 date-only vs datetime drift | Typed wizard payload |
| Temalarimiz | `/app/development/temalarimiz` | development | P1 frontend/local lifecycle only | Backend persistence before release |
| Genel lifecycle operations | multiple | development | P1 generic JSON payload trust | Operation type schema mapping |

## Flow Details

### 1. Sirket ekleme / sirket kurulus wizard

- Flow: Sirket ekleme / kurulus wizard
- Route: `/app/sirket/companies`
- Frontend schema: P1, explicit Zod schema required.
- Backend schema: `CompanyCreateRequest` expected; verify all date/UUID fields.
- Generated client: OpenAPI types exist, page/service wrapper still shapes payload manually.
- BFF route: `POST /api/companies`
- Service command: `create_company`
- Repository method: company insert/update service methods
- DB tables: `companies`, `company_contacts`, `company_documents`
- Date/datetime risk: P1, concurrency timestamps must use shared normalizer.
- UUID risk: P1, empty string company/tenant IDs must be rejected.
- Enum risk: P1, Turkish labels must be separate from canonical values.
- Raw dict risk: P1, form state must not be persisted directly.
- Error handling: user-safe error exists in UI; correlation id must be confirmed.
- Tests: backend/frontend/e2e matrix required.
- Status: preview.
- Required fixes: frontend Zod schema, generated client call, e2e happy path.

### 2. Temsilci ekleme

- Flow: Temsilci ekleme
- Route: `/app/sirket/companies/representatives`
- Frontend schema: P1, representative form Zod schema required.
- Backend schema: `RepresentativeCreateDraftRequest`, `RepresentativeCardUpdateRequest`.
- Generated client: OpenAPI generated types exist; frontend still uses service wrapper and `Record<string, any>`.
- BFF route: `POST/PATCH /api/companies/representatives`.
- Service command: `create_representative_draft`, `update_representative_card`.
- Repository method: representative service SQL methods.
- DB tables: `company_representatives`, `person_master`, `organization_master`.
- Date/datetime risk: P1, `base_updated_at` is still string in some request models.
- UUID risk: P1, IDs should move from `str` to `UUID` where required.
- Enum risk: P1, `source_type` needs canonical enum.
- Raw dict risk: P1, frontend payload is assembled from generic object.
- Error handling: domain errors exist; correlation id must be end-to-end.
- Tests: representative card CRUD backend tests exist; frontend/e2e gaps remain.
- Status: preview.
- Required fixes: frontend Zod schema, UUID Pydantic fields, frontend payload tests.

### 3. Temsil Yetkisi wizard

- Flow: Temsil Yetkisi
- Route: `/app/sirket/companies/representatives`
- Frontend schema: P1, wizard local validation exists but Zod final payload schema required.
- Backend schema: `RepresentativeAuthorityTransactionRequest`, `RepresentativeAuthorityScope`.
- Generated client: OpenAPI types exist; frontend uses `companyService` helper wrappers.
- BFF route: `POST /api/companies/representatives/{representative_id}/authority-transactions`.
- Service command: `perform_authority_transaction_for_request`.
- Repository method: `insert_authority_transaction`, `create_or_get_operation_request`.
- DB tables: `operation_requests`, `company_representative_authority_transactions`, `company_representatives`.
- Date/datetime risk: P1 mitigated for `base_updated_at`; `_coerce_base_updated_at` accepts ISO and `Z` suffix strings.
- UUID risk: P1, route/scope IDs are still string typed in Pydantic.
- Enum risk: P1, `transaction_type` currently uses Turkish operation labels; canonical enum mapping required.
- Raw dict risk: P1, frontend wizard builds `Record<string, any>` payload in component.
- Error handling: `DomainError` maps to HTTP; operation failure logs must include correlation id consistently.
- Tests: backend tests exist for ISO timestamp normalization and request shape.
- Status: preview.
- Required fixes: Zod schema, canonical operation enum, generated client call, e2e happy path.

### 4. Ortak ekleme

- Flow: Ortak ekleme
- Route: `/app/sirket/companies/partners`
- Frontend schema: P1, partner form Zod schema required.
- Backend schema: partner create/update request models must be audited.
- Generated client: required before live lifecycle changes.
- BFF route: `POST/PATCH /api/companies/partners`.
- Service command: partner create/update command.
- Repository method: partner insert/update methods.
- DB tables: `company_partners`, `ownership_transactions`.
- Date/datetime risk: P1, ownership start/end dates must remain date-only.
- UUID risk: P1, empty string IDs must be rejected.
- Enum risk: P1, partner type label/value separation required.
- Raw dict risk: P1, verify no raw form state DB insert.
- Tests: backend/frontend/e2e required.
- Status: preview.
- Required fixes: schema audit, generated client, e2e happy path.

### 5. Ortaklik islemleri

- Flow: Ortaklik islemleri
- Route: `/app/sirket/companies/partners`
- Frontend schema: P1, operation-specific Zod schema required.
- Backend schema: operation-specific Pydantic model mapping required.
- Generated client: required.
- BFF route: `POST /api/companies/partners/ownership-transactions`.
- Service command: ownership transaction command.
- Repository method: ownership transaction repository.
- DB tables: `operation_requests`, `ownership_transactions`, `company_partners`.
- Date/datetime risk: P1, decision/effective dates must not be audit timestamps.
- UUID risk: P1, target IDs require validation.
- Enum risk: P1, operation type to payload model mapping required.
- Raw dict risk: P1, operation request JSON must be typed by operation type.
- Tests: operation payload validation matrix required.
- Status: development.
- Required fixes: `OPERATION_PAYLOAD_MODELS`, backend matrix tests, e2e.

### 6. Sube ekleme

- Flow: Sube ekleme
- Route: `/app/sirket/companies/branches`
- Frontend schema: P1, branch form Zod schema required.
- Backend schema: branch create/update request models.
- Generated client: required.
- BFF route: `POST/PATCH /api/companies/branches`.
- Service command: branch create/update command.
- Repository method: branch insert/update repository.
- DB tables: `company_branches`.
- Date/datetime risk: P1, opening/closing dates must stay date-only.
- UUID risk: P1, required `company_id` UUID.
- Enum risk: P1, branch type canonical enum needed.
- Raw dict risk: P1, verify repository typed command.
- Tests: backend/frontend/e2e required.
- Status: preview.
- Required fixes: frontend schema, backend schema tests, e2e.

### 7. Belge yukleme

- Flow: Belge yukleme
- Route: `/app/belgeler`
- Frontend schema: document upload validation exists but must be mapped to formal Zod payload.
- Backend schema: document create/upload request models.
- Generated client: multipart boundary contract required.
- BFF route: `POST /api/documents`.
- Service command: document upload command.
- Repository method: document/file insert methods.
- DB tables: `documents`, `document_files`, `document_requirements`.
- Date/datetime risk: P2, audit timestamps backend-owned.
- UUID risk: P1, `entity_id` nullable/required varies by slot.
- Enum risk: P1, document type canonical enum.
- Raw dict risk: P1, multipart metadata must be typed.
- Tests: upload valid metadata, invalid UUID, auth error rendering, e2e upload.
- Status: preview.
- Required fixes: typed multipart metadata and upload smoke.

### 8. Personel ekleme

- Flow: Personel ekleme
- Route: `/app/ik/calisanlar`
- Frontend schema: P1, employee wizard Zod schema required.
- Backend schema: employee create/update request models.
- Generated client: required.
- BFF route: `POST/PATCH /api/hr/employees`.
- Service command: employee create/update command.
- Repository method: employee insert/update methods.
- DB tables: `employees`, `employee_assignments`, `person_master`.
- Date/datetime risk: P1, birth/start/end dates are date-only.
- UUID risk: P1, organization assignment IDs require validation.
- Enum risk: P1, employment type canonical enum.
- Raw dict risk: P1, wizard payload should not be raw state.
- Tests: backend/frontend/e2e required.
- Status: preview.
- Required fixes: typed payload schema and e2e happy path.

### 9. Temalarimiz

- Flow: Temalarimiz
- Route: `/app/development/temalarimiz`
- Frontend schema: `workspaceThemeJsonSchema`, theme import validation.
- Backend schema: future `WorkspaceThemeRequest`.
- Generated client: not yet applicable; current implementation is local/frontend draft management.
- BFF route: future `/api/theme/*`.
- Service command: future theme lifecycle command.
- Repository method: future workspace theme repository.
- DB tables: future `workspace_themes`, `workspace_theme_assets`.
- Date/datetime risk: P2, local metadata timestamps are strings until backend exists.
- UUID risk: P2, local ids are slug-like; backend requires UUID IDs.
- Enum risk: P1, lifecycle status modeled in frontend, backend enum future.
- Raw dict risk: P1, import JSON validated but backend persistence future.
- Tests: frontend import/export validation and e2e create/activate needed.
- Status: development.
- Required fixes: backend persistence before release, tests, e2e smoke.

### 10. Genel lifecycle operations

- Flow: Genel lifecycle islemleri
- Route: multiple
- Frontend schema: P1, operation-specific Zod schemas required.
- Backend schema: P1, operation type to Pydantic payload mapping required.
- Generated client: target source of truth.
- BFF route: lifecycle proxies.
- Service command: `create_or_get_operation_request`, `mark_operation_completed`, `mark_operation_failed`.
- Repository method: operation request SQL.
- DB tables: `operation_requests`, `audit_events`, `outbox_events`.
- Date/datetime risk: P1 mitigated for `base_updated_at`; other payload fields need type-specific models.
- UUID risk: P1, generic `entity_id` must be validated by operation payload model.
- Enum risk: P1, `operation_type` must map to typed model.
- Raw dict risk: P1, generic JSON may persist only after typed validation.
- Tests: payload model mapping per operation type, generated client payload tests, lifecycle e2e.
- Status: development.
- Required fixes: `OPERATION_PAYLOAD_MODELS`, correlation id contract, lifecycle e2e matrix.

## Required Architecture Fixes

1. Add operation type to Pydantic payload model mapping for all generic operation requests.
2. Move frontend wizard/form validation to Zod schemas and keep final submit schemas next to service bindings.
3. Migrate Next service wrappers toward generated OpenAPI client calls.
4. Normalize all `base_updated_at` and audit datetime fields before repository/DB access.
5. Move required IDs to Pydantic `UUID` where possible.
6. Replace Turkish operation labels in payload values with canonical enum values plus label mapping.
7. Add e2e happy path for every wizard/lifecycle flow before release.
8. Require `npm run page-flow:contract:check` in quality gate.
