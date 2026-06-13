# Domain Service Layer

<!-- source-of-truth-standard: contract overrides markdown -->

Domain Service Layer, Operation Orchestrator ile database arasinda domain is kurallarini ve veri erisimini standartlastirir. Baska domain'e ait veriye dogrudan yazmak yerine ilgili domain service cagrilir.

## Sorumluluk Ayrimi

- Route: request/response adaptorudur; NextResponse uretir.
- Process Engine: asama, gorev ve onay yonetir.
- Operation Orchestrator: operation flow, policy, readiness, integrity, transaction boundary, audit ve outbox koordinasyonunu yapar.
- Transaction Boundary: RPC veya fallback mutation sinirini yonetir.
- Domain Service: domain'e ait veri ve is kurali islemlerini yapar.
- Projection: read model uretir.
- Outbox/Audit: yan etki ve denetim izi kaydeder.

Domain service NextResponse dondurmez. Tum servisler `DomainServiceResult<T>` dondurur:

```ts
{
  ok: boolean
  data?: T
  status?: number
  code?: string
  error?: string
  warnings?: string[]
  details?: any
}
```

## Context

`DomainServiceContext` her servis cagrisi icin su bilgileri tasir:

- `supabase`
- `tenantContext`
- `userId`
- `companyId`
- `operationId`
- `processInstanceId`
- `requestId`

Tenant scope uygulanmadan domain query veya mutation yapilmaz.

## Ilk Standart Servisler

### Branch Domain Service

Ilk gercek fonksiyonlar:

- `getBranchById`
- `listBranches`
- `createBranch`
- `closeBranch`
- `updateBranchCard`
- `getBranchSummaryForCompany`
- `getBranchesForCompany`
- `assertBranchBelongsToCompany`
- `assertBranchActive`
- `buildBranchDisplayLabel`
- `getBranchRepresentativeSummary`

Sube Acilisi fallback akisi `createBranch`, Sube Kapanisi fallback akisi `closeBranch` kullanmaya baslar.

### Organization Domain Service

Ilk gercek fonksiyonlar:

- `getOrganizationUnitById`
- `listOrganizationUnitsForCompany`
- `createBranchOrganizationUnit`
- `setOrganizationUnitPassive`
- `reassignOrganizationUnit`
- `keepOrganizationUnitOpenAfterBranchClosing`
- `assertOrganizationUnitBelongsToCompany`
- `assertOrganizationUnitActive`
- `wouldCreateOrganizationCycle`
- `getCompanyRootUnitId`

Sube acilisi organization unit olustururken ve sube kapanisi birim aksiyonlarini uygularken bu service'i kullanir.

### Facility / Location Domain Service

Ilk gercek fonksiyonlar:

- `getFacilityById`
- `listFacilitiesForCompany`
- `createFacilityForBranch`
- `linkFacilityToBranch`
- `setFacilityPassive`
- `keepFacilityOpenAfterBranchClosing`
- `markFacilityReusable`
- `assertFacilityBelongsToCompany`
- `assertFacilityActive`
- `buildFacilityDisplayLabel`

Facility altyapisi eksikse servis `FACILITY_INFRASTRUCTURE_MISSING` gibi structured failure dondurur.

### Representative Authority Domain Service

Ilk gercek fonksiyonlar:

- `getRepresentativeById`
- `findRepresentativeByMasterForCompany`
- `assertUniqueRepresentativeCard`
- `validateAuthorityScope`
- `createAuthorityTransaction`
- `applyAuthorityTransactionFallback`
- `getCurrentAuthority`
- `listRepresentativeAuthoritiesForBranch`
- `listRepresentativeAuthoritiesForCompany`
- `normalizeAuthorityScopeLabel`

Yetki scope'u temsilci kartinda degil authority transaction/current authority read modelinde tutulur.

### Card CRUD Domain Services

Step 13 ile Company, Partner ve Representative kart CRUD islemleri FastAPI domain service katmanina alindi.

Company card service:

- `create_company_draft`
- `update_company_card`
- `delete_company_draft`
- `reject_operation_controlled_company_patch`

Partner card service:

- `create_partner_draft`
- `update_partner_card`
- `delete_partner_draft`
- `reject_operation_controlled_partner_patch`

Representative card service:

- `create_representative_draft`
- `update_representative_card`
- `delete_representative_draft`
- `reject_operation_controlled_representative_patch`

Bu servislerde kart CRUD; official change, ownership transaction ve representative authority transaction endpointlerinden ayridir.

### Ownership Domain Service

Ilk gercek fonksiyonlar:

- `getCurrentOwnershipForCompany`
- `assertCurrentOwnershipReadable`
- `assertHasActivePartners`
- `validateOwnershipDistribution`
- `getPartnerById`
- `listPartnersForCompany`
- `buildOwnershipSnapshot`
- `performOwnershipTransaction`
- `initialPartnershipEntry`
- `shareTransfer`
- `ownershipExit`
- `correctionEntry`
- `reversalEntry`

Sermaye Artirimi ve ownership integrity kontrolleri guncel ortaklik dagilimini bu service uzerinden okuyabilir.

FastAPI migration fazinda Ownership Domain Service Python tarafinda `POST /api/v1/ownership/transactions` endpointiyle transaction kaydi, partner card status update, current ownership read/fallback, outbox ve audit best-effort davranisini uygulamaya baslamistir. Partner card update ownership hak alanlarini reddeder; pay/oy/kar/sermaye haklari sadece ownership transaction ile degisir.

### Company Domain Service

Ilk hazirlik fonksiyonlari:

- `getCompanyById`
- `assertCompanyActive`
- `assertCompanyNotDeregistered`
- `updateOfficialCompanyFields`
- `getCompanyLifecycle`
- `getCompanyDetailReadModel`

Company route'larinin tamamen tasinmasi FastAPI migration fazina birakilmistir. TypeScript Company Domain Service kalici hedef degil, Python domain service sozlesmesi icin gecis prototipidir.

## Cross-Domain Mutation Kurali

Orchestrator cross-domain mutation yapacaksa dogrudan tablo update etmez:

- Sube acilisi: Organization Domain Service, Facility Domain Service, Branch Domain Service.
- Sube kapanisi: Organization aksiyonu, Facility aksiyonu, Branch close mutation.
- Temsilci scope: Representative Authority Service, Branch/Organization/Facility assert helperlari.
- Sermaye artirimi: Ownership current-state helperlari.
- Ortaklik islemleri: Partner karti sadece kart/profil alanlarini gunceller; ownership rights mutation Ownership Domain Service ve transaction endpointinden gecer.

## Hata Standardi

Servis hatalari structured dondurulur:

```json
{
  "ok": false,
  "code": "BRANCH_NOT_FOUND",
  "error": "Sube kaydi bulunamadi.",
  "status": 404
}
```

Route ve orchestrator bu sonucu kullaniciya uygun is diline cevirebilir. Domain service teknik tablo hatasini kullanici response'una dogrudan tasimaz; setup/readiness ile uyumlu kod dondurur.

## Gecis Stratejisi

Bu faz buyuk route tasima fazi degildir. En riskli cross-domain akislarda servis katmani kullanilmaya baslanir; kalan eski helperlar yalnizca canli migration bridge olarak acik status ile kalabilir.

Eski wrapper'lar yeni kod icin canonical kaynak degildir. Yeni route/orchestrator kodu once ilgili domain service'i kullanmali; obsolete wrapper'lar korunmaz, ya Python migration hedefiyle `deprecated_wrapper` olarak planlanir ya da silinir. Kalan migration borclari [Technical Debt and Migration Plan](./TechnicalDebtAndMigrationPlan.md) ve [Legacy Obsolete Code Audit](./LegacyObsoleteCodeAudit.md) dokumanlarinda izlenir.

Projection/read model query'leri de domain mutation servislerinden ayridir. Python
projection katmani liste/detay okumalari icin canonical backend read API rolunu
ustlenir; detaylar [Projection / Read Model FastAPI Migration](./ProjectionReadModelFastAPIMigration.md)
dokumanindadir.
