# Backend API Migration

Eden ERP veri erisim akisi su standarttadir:

```text
Frontend -> Backend API -> Supabase/PostgreSQL
```

Frontend tarafinda bulunan her eski Supabase sorgusu modul endpointine tasinir. Endpoint yoksa once backend tarafinda olusturulur, sonra frontend API client'a cevrilir.

## Genel endpoint sekli

```text
GET    /api/{module}
GET    /api/{module}/{id}
POST   /api/{module}
PATCH  /api/{module}/{id}
POST   /api/{module}/{id}/passivate
GET    /api/{module}/{id}/history
```

## Liste endpointleri

Liste endpointleri pagination, search, filters, sort, permission filtering ve `is_deleted = false` davranisini backend tarafinda uygulamalidir.

## Write endpointleri

Create/update/delete islemleri backend tarafinda validation, permission, audit, history ve optimistic locking kontrollerinden gecmelidir. Version uyusmazliginda `409 Conflict` donulur.

Frontend `409` durumunda su mesaji gosterir:

```text
Bu kayıt başka bir kullanıcı tarafından güncellendi. Lütfen kaydı yenileyin.
```

## Mevcut tasima notlari

- `hooks/useSirketler.ts` artik `/api/sirketler` ve alt sirket endpointlerini kullanir.
- `hooks/usePersonel.ts` artik `/api/ik/personel` endpointlerini kullanir.
- `hooks/useTeskilat.ts` artik `/api/ik/teskilat` endpointini kullanir.
- `hooks/useNakitIslemler.ts` artik `/api/muhasebe/islemler` endpointlerini kullanir.
