# Event Contract Registry

<!-- source-of-truth-standard: contract overrides markdown -->

Event Contract Registry, Eden ERP'de domain event tiplerinin merkezi sozlesmesini tutar. Operation Orchestrator ve Process Engine event urettiginde event tipi, versiyon, modul, aggregate, projection etkisi, bildirim tipi, audit ve AI context ilgisi bu registry'den okunur.

## Sorumluluk

- `EventContract`: Event tipinin statik sozlesmesidir.
- `EventEnvelope`: Outbox'a yazilan standart event zarfi formatidir.
- `EventVersioning`: Event version defaultlarini ve deprecated bilgisini saglar.
- `EventValidation`: Payload icin temel required field kontrolu yapar.

Registry dosyalari:

- `lib/events/eventContract.types.ts`
- `lib/events/eventRegistry.ts`
- `lib/events/eventVersioning.ts`
- `lib/events/eventEnvelope.ts`
- `lib/events/eventValidation.ts`

## Baslangic Event Gruplari

- Company: `company.created`, `company.updated`, `company.title_changed`, `company.address_changed`, `company.capital_increased`, `company.nace_changed`
- Branch: `company.branch_opened`, `company.branch_closed`, `company.branch_documents_updated`, `company.branch_updated`
- Ownership: `ownership.transaction_created`, `ownership.transaction_completed`, `ownership.transaction_reversed`
- Representative: `representative.created`, `representative.authority_updated`, `representative.authority_terminated`
- Process: `process.started`, `process.task_created`, `process.approval_requested`, `process.completed`, `process.failed`
- System: `projection.refresh_requested`, `notification.created`, `audit.recorded`, `ai_context.refresh_requested`

Mevcut eski event isimleri icin uyumluluk contract'lari da bulunur. Ornegin `representative.authority.updated` ve `ownership_transaction.created` deprecated olarak islenebilir.

## Projection Iliskisi

Event contract `projectionKeys` alanini tasir. Ornek:

- `company.branch_opened` -> `branchList`, `branchSummary`, `companyDetail`
- `company.nace_changed` -> `companyDetail`, `companyList`
- `ownership.transaction_completed` -> `partnerList`, `currentOwnership`, `companyDetail`
- `representative.authority_updated` -> `representativeList`, `companyDetail`

Bu bilgi Outbox Dispatcher icindeki projection invalidation handler tarafindan okunur. Server cache altyapisi yoksa handler guvenli no-op olarak calisir.

## Hata Davranisi

Event contract yoksa event uretimi eski davranisi bozmaz; outbox kaydi metadata icinde contract uyarisi tasiyabilir. Dispatcher asamasinda contract bulunamazsa event `skipped` olarak isaretlenir. Bu karar, bilinmeyen eventin yan etkilerinin tahmin edilmeden calistirilmamasi icindir.
