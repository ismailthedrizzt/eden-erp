# Transaction Boundary and RPC Preparation

<!-- source-of-truth-standard: contract overrides markdown -->

Transaction Boundary, Operation Orchestrator altinda calisan mutation guvenlik katmanidir. Orchestrator is kurali, precheck ve idempotency akisini yonetir; Transaction Boundary ise mutation zincirinin RPC ile atomic yapilmasini veya RPC yoksa application fallback'in standart calismasini saglar.

## Sorumluluk Ayrimi

- Process Engine: Islemin adimlarini, gorevlerini ve onaylarini yonetir.
- Operation Orchestrator: Is kurali, precheck, idempotency ve mutation akisini yonetir.
- Transaction Boundary: Mutation zincirinin atomic yapilmasini veya guvenli fallback uygulanmasini saglar.
- RPC: Mumkunse DB transaction icinde mutation yapan nihai katmandir.
- Outbox: Basarili mutation sonucunda event kaydi olusturur.
- Audit: Baslama, tamamlanma ve hata denetim izini tutar.

## Runner Davranisi

`runTransactionBoundary` varsayilan olarak RPC denemeye hazirdir:

- RPC basariliysa `mode: "rpc"` doner.
- RPC yoksa veya `RPC_NOT_IMPLEMENTED` donerse, fallback izinliyse application fallback calisir.
- `requireRpc: true` ise RPC yoklugunda fallback calismaz.
- Fallback hata verirse compensation denenir.
- Sonuc her zaman standart `TransactionBoundaryResult` formatinda doner.

## RPC Contracts

Baslangic contractlari:

- `company_branch_opening` -> `perform_company_branch_opening`
- `company_branch_closing` -> `perform_company_branch_closing`
- `capital_increase` -> `perform_capital_increase`
- `representative_authority_transaction` -> `perform_representative_authority_transaction`
- `ownership_transaction` -> `perform_ownership_transaction`

Ilk migration bu RPC fonksiyonlarini `RPC_NOT_IMPLEMENTED` donecek sekilde hazirlar. Bu sayede `EDEN_USE_OPERATION_RPC=true` olsa bile runner application fallback'e dusebilir.

## Critical Operation Contracts

### Sube Acilisi

Atomic mutation set:

- `organization_unit` create
- `facility/location` create
- `company_branch` create
- official change transaction create
- lifecycle event create
- outbox event create

Fallback mevcut application akisini calistirir. Hata durumunda olusan branch biliniyorsa partial failure olarak isaretlenir ve operation failed olur.

### Sube Kapanisi

Atomic mutation set:

- organization unit action
- facility action
- `company_branch` close
- official change transaction create
- lifecycle event create
- outbox event create

Fallback mevcut application akisini calistirir. Hata durumunda branch metadata uzerinde closing_failed/partial_failure bilgisi tutulur.

### Sermaye Artirimi

Atomic mutation set:

- capital increase transaction
- company capital update
- ownership transaction/current ownership refresh
- official/lifecycle event
- outbox event

Bu fazda contract hazirdir; tam atomic RPC sonraki fazda derinlestirilebilir.

### Temsilci Yetkisi

Atomic mutation set:

- authority transaction
- current authority refresh
- representative status update
- outbox event

### Ortaklik Islemi

Atomic mutation set:

- ownership transaction
- partner status update
- current ownership refresh
- outbox event

## Compensation Strategy

Application fallback gercek DB transaction garantisi veremez. Agresif silme yerine guvenli isaretleme tercih edilir:

- partial failure metadata yazilir
- ilgili operation failed olur
- audit operation_fail kaydi olusur
- kullaniciya "islem tamamlanamadi, kayitlar guvenli duruma alindi" mesaji doner

Gercek rollback gerektiren operasyonlar RPC implementasyonu ile DB transaction icine alinacaktir.
