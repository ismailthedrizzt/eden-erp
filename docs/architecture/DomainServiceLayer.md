# Domain Service Layer

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

### Ownership Domain Service

Ilk gercek fonksiyonlar:

- `getCurrentOwnershipForCompany`
- `assertCurrentOwnershipReadable`
- `assertHasActivePartners`
- `validateOwnershipDistribution`
- `getPartnerById`
- `listPartnersForCompany`
- `buildOwnershipSnapshot`

Sermaye Artirimi ve ownership integrity kontrolleri guncel ortaklik dagilimini bu service uzerinden okuyabilir.

### Company Domain Service

Ilk hazirlik fonksiyonlari:

- `getCompanyById`
- `assertCompanyActive`
- `assertCompanyNotDeregistered`
- `updateOfficialCompanyFields`
- `getCompanyLifecycle`
- `getCompanyDetailReadModel`

Company route'larinin tamamen tasinmasi sonraki domain service migration fazina birakilmistir.

## Cross-Domain Mutation Kurali

Orchestrator cross-domain mutation yapacaksa dogrudan tablo update etmez:

- Sube acilisi: Organization Domain Service, Facility Domain Service, Branch Domain Service.
- Sube kapanisi: Organization aksiyonu, Facility aksiyonu, Branch close mutation.
- Temsilci scope: Representative Authority Service, Branch/Organization/Facility assert helperlari.
- Sermaye artirimi: Ownership current-state helperlari.

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

Bu faz buyuk route tasima fazi degildir. Mevcut API davranisi korunur. En riskli cross-domain akislarda servis katmani kullanilmaya baslanir; kalan eski helperlar wrapper veya compatibility export olarak kalabilir.

Eski wrapper'lar yeni kod icin canonical kaynak degildir. Yeni route/orchestrator kodu once ilgili domain service'i kullanmali; wrapper'lar yalnizca geriye uyumluluk ve kademeli migration icin tutulur. Kalan migration borclari [Technical Debt and Migration Plan](./TechnicalDebtAndMigrationPlan.md) dokumaninda izlenir.
