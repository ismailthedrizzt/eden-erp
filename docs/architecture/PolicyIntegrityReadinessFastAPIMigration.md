# Policy / Integrity / Readiness FastAPI Migration

Bu dokuman Python/FastAPI core backend gecisinin 9. adiminda eklenen canonical
guard katmanlarini tanimlar.

## Migrated Services

- `backend/app/policies/permissions.py`: permission registry ve fallback zinciri.
- `backend/app/policies/policy_engine.py`: permission, record status ve scope karari.
- `backend/app/policies/scope_policy.py`: company/branch/organization/facility scope yardimcilari.
- `backend/app/setup/readiness_checker.py`: module ve tenant readiness kontrolu.
- `backend/app/integrity/checker.py`: operation bazli blocking/warning integrity ozetleri.
- `backend/app/policies/action_eligibility.py`: UI ve Action Guide tarafinin tuketecegi action eligibility karari.

## Endpoint Contracts

- `GET /api/v1/setup/readiness`
- `GET /api/v1/setup/readiness/{module_key}`
- `POST /api/v1/policy/evaluate`
- `POST /api/v1/policy/action-eligibility`
- `POST /api/v1/action-eligibility/evaluate`
- `POST /api/v1/integrity/check`
- `POST /api/v1/integrity/operation/{operation_key}`

Response standardi:

```json
{
  "data": {},
  "warnings": []
}
```

Hata response'u teknik tablo/RPC adlarini ana mesaja tasimaz; gelistirici detaylari
`details` altinda kalir.

## Guard Order

Mutation baslamadan once Python operasyonlari su sirayi uygular:

1. Module readiness
2. Permission / policy
3. Data integrity
4. Domain validation
5. Transactional mutation

Bu sira branch opening/closing, capital increase, representative authority ve
ownership transaction operasyonlarinda baslatildi.

## Readiness Language

Missing table/view/RPC durumlari kullaniciya "Bu modulun kurulumu tamamlanmamis."
seklinde doner. Teknik altyapi isimleri yalnizca `details` alaninda gorunebilir.

## Policy vs Readiness vs Integrity

- Policy: kullanici bu aksiyonu yapabilir mi?
- Readiness: modul ve tenant altyapisi hazir mi?
- Integrity: mevcut veri bu operasyon icin tutarli mi?

Frontend bu kararlari buton gorunurlugu ve wizard precheck icin tuketir; canonical
enforcement backend tarafindadir.

## Next Proxy Behavior

Next.js setup/policy/integrity route'lari `FASTAPI_BASE_URL` varsa FastAPI'ye proxy
eder. Yoksa mevcut setup readiness TS fallback'i migration bridge olarak kalir;
policy/integrity proxy endpointleri ise FastAPI gerektigini is diliyle doner.

## Known Gaps

- JWT tabanli permission loading henuz MVP seviyesindedir.
- Module settings DB-backed tenant config olarak tamamlanacak.
- Action Guide intent resolver'i henuz tamamen Python'a tasinmadi.
- Continuous integrity scan ve Action Center bridge sonraki fazda derinlestirilecek.
- Advanced ABAC kurallari P2 olarak planlandi.
