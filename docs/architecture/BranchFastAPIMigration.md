# Branch FastAPI Migration

Bu dokuman Python/FastAPI core backend gecisinin ilk gercek domain tasimasini kaydeder: Sube Acilisi ve Sube Kapanisi.

## Migrated Endpoints

FastAPI tarafinda eklenen canonical endpointler:

| endpoint | purpose |
| --- | --- |
| `POST /api/v1/companies/{company_id}/branch-openings` | Sube Acilisi resmi operasyonunu yurutur. |
| `GET /api/v1/companies/{company_id}/branch-openings/precheck` | Sube Acilisi on kontrolunu dondurur. |
| `POST /api/v1/companies/{company_id}/branch-closings` | Sube Kapanisi resmi operasyonunu yurutur. |
| `GET /api/v1/companies/{company_id}/branch-closings/precheck` | Sube Kapanisi on kontrol ve impact bilgisini dondurur. |
| `GET /api/v1/branches` | Minimum branch list endpointi. |
| `GET /api/v1/branches/{branch_id}` | Minimum branch detail endpointi. |
| `PATCH /api/v1/branches/{branch_id}` | Sadece kart seviyesindeki serbest alanlari gunceller. |

## Python Domain Services

Ilk gercek servisler:

- `backend/app/domains/branches/service.py`
- `backend/app/domains/branches/operations.py`
- `backend/app/domains/organization/service.py`
- `backend/app/domains/facilities/service.py`
- `backend/app/domains/company/service.py`
- `backend/app/domains/company/official_changes.py`
- `backend/app/domains/operations/service.py`
- `backend/app/domains/audit/service.py`
- `backend/app/domains/outbox/service.py`

Sube acilisi `company_branches`, opsiyonel `organization_units`, opsiyonel `company_facilities`, official change transaction, lifecycle event, outbox event ve audit trace zincirini SQLAlchemy async transaction icinde yurutur.

Sube kapanisi `organization_unit_action` ve `facility_action` secimlerini uygular:

- organization unit: `deactivate`, `reassign`, `keep_open`
- facility/location: `deactivate`, `keep_open`, `reuse`

## Next Proxy Behavior

Asagidaki Next route'lari artik FastAPI proxy onceliklidir:

- `app/api/companies/[company_id]/official-changes/branch-opening/route.ts`
- `app/api/companies/[company_id]/official-changes/branch-opening/precheck/route.ts`
- `app/api/companies/[company_id]/official-changes/branch-closing/route.ts`
- `app/api/companies/[company_id]/official-changes/branch-closing/precheck/route.ts`

`FASTAPI_BASE_URL` tanimliysa route FastAPI endpointine proxy eder. Tanimli degilse TS fallback calisir ve route `keep_bff_proxy_with_legacy_fallback` olarak isaretlidir. Bu fallback kalici backend degildir.

Proxy helper:

- `lib/backend/fastApiProxy.ts`

Forward edilen basliklar:

- `X-Tenant-Id`
- `X-User-Id`
- `X-Company-Scope`
- `Authorization: Bearer INTERNAL_BACKEND_TOKEN` optional

## Environment

FastAPI:

- `DATABASE_URL` veya `SUPABASE_DB_URL`
- `APP_ENV`
- `LOG_LEVEL`
- `CORS_ORIGINS`

Next proxy:

- `FASTAPI_BASE_URL`
- `INTERNAL_BACKEND_TOKEN` optional

Database URL yoksa FastAPI import kirilmaz; DB kullanan endpointler kontrollu `BACKEND_DATABASE_NOT_CONFIGURED` cevabi dondurur.

## Contract

Mevcut frontend wizard metodlari degismedi:

- `branchOpeningPrecheck`
- `completeBranchOpening`
- `branchClosingPrecheck`
- `completeBranchClosing`

Frontend halen Next API route'a gider. Next route, FastAPI aktifse canonical backend'e proxy eder.

Success shape:

```json
{
  "data": {},
  "operation_id": "uuid-or-null",
  "operation_status": "completed",
  "warnings": [],
  "message": "Şube açılışı tamamlandı."
}
```

Error shape:

```json
{
  "error": "İş diliyle hata",
  "code": "ERROR_CODE",
  "details": {},
  "message": "İş diliyle hata"
}
```

## Known Gaps

- FastAPI JWT/Supabase Auth verification henuz migration-stage header context ile temsil ediliyor.
- Branch operation DB integration testleri gercek Supabase/PostgreSQL test database gerektirir.
- TS fallback hala mevcut; FastAPI staging dogrulamasindan sonra silinecek.
- Policy Engine ve Integrity Guard tam Python portu P1 olarak devam eder.
- OpenAPI generated TypeScript client henuz devreye alinmadi.

## Test Commands

Calistirilan / hedeflenen kontroller:

- `npm run typecheck`
- `npm run build`
- `python -m compileall backend/app`
- `cd backend && python -m pytest` (local Python ortaminda `pytest` kurulu olmalidir)
- `cd backend && python -m ruff check .` (local Python ortaminda `ruff` kurulu olmalidir)
- `cd backend && python -m mypy app` (local Python ortaminda `mypy` kurulu olmalidir)
