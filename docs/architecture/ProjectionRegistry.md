# Projection Registry

<!-- source-of-truth-standard: contract overrides markdown -->

Projection Registry, read-heavy liste ve detay modellerinin canonical contract
kaynagidir. Python/FastAPI tarafindaki registry:

- `companyList`
- `companyDetail`
- `branchList`
- `branchSummary`
- `partnerList`
- `representativeList`
- `currentOwnership`
- `currentRepresentativeAuthorities`

anahtarlarini tanimlar.

Her projection:

- source name/type
- source tables
- searchable fields
- sortable fields
- status field
- tenant/company scope gereksinimi
- fallback strategy

bilgilerini tasir.

Detayli migration notlari:
[Projection / Read Model FastAPI Migration](./ProjectionReadModelFastAPIMigration.md).
