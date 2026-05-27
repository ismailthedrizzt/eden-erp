# Company Official Changes FastAPI Migration

Bu fazda sirket resmi degisiklik ailesinin canonical backend'i FastAPI tarafina tasindi. Next.js route'lari `FASTAPI_BASE_URL` tanimliysa FastAPI'ye proxy eder; tanimli degilse gecici `proxy_to_fastapi_with_legacy_fallback` TS fallback calisir.

## Migrated Endpoints

| operation | FastAPI endpoint | Next BFF route |
| --- | --- | --- |
| Unvan Degisikligi precheck | `GET /api/v1/companies/{company_id}/official-changes/title-change/precheck` | `/api/companies/{company_id}/official-changes/title-change/precheck` |
| Unvan Degisikligi complete | `POST /api/v1/companies/{company_id}/official-changes/title-change` | `/api/companies/{company_id}/official-changes/title-change` |
| Adres Degisikligi precheck | `GET /api/v1/companies/{company_id}/official-changes/address-change/precheck` | `/api/companies/{company_id}/official-changes/address-change/precheck` |
| Adres Degisikligi complete | `POST /api/v1/companies/{company_id}/official-changes/address-change` | `/api/companies/{company_id}/official-changes/address-change` |
| Kamu/Tescil Guncelleme precheck | `GET /api/v1/companies/{company_id}/official-changes/public-registration-update/precheck` | `/api/companies/{company_id}/official-changes/public-registration-update/precheck` |
| Kamu/Tescil Guncelleme complete | `POST /api/v1/companies/{company_id}/official-changes/public-registration-update` | `/api/companies/{company_id}/official-changes/public-registration-update` |
| NACE Guncelleme precheck | `GET /api/v1/companies/{company_id}/official-changes/nace-change/precheck` | `/api/companies/{company_id}/official-changes/nace-change/precheck` |
| NACE Guncelleme complete | `POST /api/v1/companies/{company_id}/official-changes/nace-change` | `/api/companies/{company_id}/official-changes/nace-change` |
| Faaliyet Konusu Degisikligi precheck | `GET /api/v1/companies/{company_id}/official-changes/activity-subject-change/precheck` | `/api/companies/{company_id}/official-changes/activity-subject-change/precheck` |
| Faaliyet Konusu Degisikligi complete | `POST /api/v1/companies/{company_id}/official-changes/activity-subject-change` | `/api/companies/{company_id}/official-changes/activity-subject-change` |

## Python Components

- `backend/app/domains/company/schemas.py`: Pydantic v2 DTO ve validation sozlesmeleri.
- `backend/app/domains/company/service.py`: company context, lifecycle guard, version conflict, official field update ve public row sync.
- `backend/app/domains/company/official_changes.py`: precheck, transaction, lifecycle event, document/date/change helpers.
- `backend/app/domains/company/nace.py`: NACE reference resolution, primary/duplicate validation, company NACE sync ve SGK risk class sync.
- `backend/app/domains/company/operations.py`: title/address/public/NACE/activity subject operation orchestration.
- `backend/app/api/v1/companies.py`: FastAPI endpointleri.

## Rules Enforced

- Draft sirketlerde resmi degisiklik wizard'i zorunlu degildir; taslak edit akisi kullanilir.
- Tasfiye veya terkin durumundaki sirketlerde resmi degisiklik baslatilmaz.
- VKN bu operasyon ailesiyle degistirilmez.
- Aktif sirket resmi alanlari normal edit yerine operation/wizard ile degisir.
- NACE guncelleme faaliyet konusu degisikligi yapamaz; `ACTIVITY_SUBJECT_CHANGE_REQUIRED` ile faaliyet konusu wizard'ina yonlendirir.
- Faaliyet konusu degisikligi NACE secimini de dogrular ve primary NACE ister.
- `client_request_id`, operation request, audit best effort ve outbox best effort davranisi Python tarafinda hazirlandi.

## Next Proxy Behavior

Next.js route'lari frontend contract'ini korur. `FASTAPI_BASE_URL` varsa request FastAPI endpointine iletilir ve tenant/user header'lari `lib/backend/fastApiProxy.ts` uzerinden eklenir. FastAPI ayari yoksa legacy TS fallback yalnizca migration bridge olarak calisir; yeni business logic burada buyutulmaz.

## Known Gaps

- Python company PATCH endpointi henuz tasinmadi; resmi alan guard'i FastAPI PATCH tasimasinda uygulanacak.
- Public table sync ve official transaction insert icin DB integration testleri test database gerektirir.
- JWT/service-to-service auth hardening migration sonrasi P1 isidir.
- OpenAPI-generated frontend client henuz devreye alinmadi.
- TS `_shared.ts` fallback kaldirilana kadar deprecated wrapper olarak kalir.

## Validation Commands

- `python -m compileall backend/app`
- `cd backend && python -m pytest`
- `npm run typecheck`
- `npm run build`
