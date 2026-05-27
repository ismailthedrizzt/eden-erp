# Projection / Read Model FastAPI Migration

Bu dokuman Python/FastAPI core backend gecisinin 10. adiminda eklenen
projection/read model katmanini ozetler.

## Migrated Projection Layer

- `backend/app/projections/registry.py`: projection contract registry.
- `backend/app/projections/company.py`: company list/detail read model.
- `backend/app/projections/branch.py`: branch list/detail ve branch summary.
- `backend/app/projections/partner.py`: partner list + current ownership hydrate.
- `backend/app/projections/representative.py`: representative list + current authority hydrate.
- `backend/app/projections/current_ownership.py`: current ownership projection wrapper.

## Endpoint Coverage

- `GET /api/v1/companies`
- `GET /api/v1/companies/{company_id}`
- `GET /api/v1/companies/{company_id}/current-ownership`
- `GET /api/v1/branches`
- `GET /api/v1/branches/{branch_id}`
- `GET /api/v1/partners`
- `GET /api/v1/representatives`
- `GET /api/v1/projections/{projection_key}` for dev/admin inspection

Next.js list/detail route'lari `FASTAPI_BASE_URL` varsa bu endpointlere proxy
eder; yoksa legacy TS fallback migration bridge olarak kalir.

## Read Model Rules

- Tenant scope her query icin zorunludur.
- Company scoped projectionlarda `company_id` filtrelenir.
- Main card status ile current state status karistirilmaz.
- Representative `record_status` ve `authority_status` ayri alanlar olarak kalir.
- Partner ownership haklari current ownership hydrate ile gelir; partner karti statusu
  main kayittan okunur.

## Fallback Warnings

Projection yoksa veya optional relation eksikse teknik hata kullaniciya ana mesaj
olarak tasinmaz. Warning kodlari:

- `BRANCH_VIEW_MISSING_FALLBACK_USED`
- `CURRENT_OWNERSHIP_VIEW_MISSING_FALLBACK_USED`
- `REPRESENTATIVE_AUTHORITY_VIEW_MISSING_SCOPE_FIELDS`
- `FACILITY_RELATION_MISSING_METADATA_FALLBACK_USED`

## Known Gaps

- High traffic listeler icin DB view/index optimizasyonu P1 olarak kalir.
- Current ownership aggregation fallback performansi P2 olarak optimize edilecek.
- Representative current authority view scope field completeness P1 takip maddesidir.
- Frontend wrapper'lar henuz tamamen generated OpenAPI client'a gecmedi.
