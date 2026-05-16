# Backend API Migration

Eden ERP veri erisim akisi su standarttadir:

```text
Frontend -> Backend API -> Supabase/PostgreSQL
```

Frontend tarafinda bulunan her eski Supabase sorgusu modul endpointine tasinir. Endpoint yoksa once backend tarafinda olusturulur, sonra frontend API client'a cevrilir.

## Pipeline naming contract

Yeni islerde frontend, backend ve veritabani ayni canonical Ingilizce kavram adini kullanir. UI'da gorunen Turkce metinler `lib/projectGlossary.ts` icindeki sozlukten gelir.

- Frontend form state ve API payload key'leri canonical Ingilizce adlari kullanir.
- Backend validation schema ve service tipleri ayni canonical adlari kullanir.
- Yeni migration'larda tablo, kolon, index ve constraint adlari Ingilizce `snake_case` olur.
- Legacy veritabani adlari sadece explicit persistence mapper veya rename/backfill migration'i icinde ele alinir.
- Compatibility alias veya ayni kavram icin ikinci payload/kolon adi eklenmez.

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

Standart liste response'u:

```ts
{
  data: Row[],
  meta: {
    page: number,
    pageSize: number,
    total: number,
    totalPages: number,
  }
}
```

Yeni ana liste endpointleri `@/lib/api/listEndpoint` icindeki `parseListQuery`, `listRange` ve `listMeta` yardimcilarini kullanir. Supabase sorgusunda liste kolonlari sabit bir `*_LIST_SELECT` sabitiyle acik listelenir, `select('*')` kullanilmaz, `select(..., { count: 'exact' })` ve `range(from, to)` uygulanir. Agir form alanlari, JSON history/media ve referans kataloglari detay veya referans endpointlerine birakilir.

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
