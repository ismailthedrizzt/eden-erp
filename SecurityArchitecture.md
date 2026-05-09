# Security Architecture

Backend API, frontend'den gelen hicbir istege dogrudan guvenmez. Frontend access token tasir; kararlar ve veri butunlugu backend tarafinda uygulanir.

## Frontend sorumluluklari

- UI ve form state yonetimi.
- Supabase Auth session/access token alma.
- Merkezi API client ile backend cagirmak.
- API hata mesajlarini kullaniciya uygun sekilde gostermek.

## Backend sorumluluklari

- JWT dogrulama.
- Kullanici yetki kontrolu.
- Modul lisansi veya modul acik/kapali kontrolu.
- Input validation.
- Transaction yonetimi.
- Optimistic locking ve version kontrolu.
- Audit log ve history log.
- Soft delete ve permission filtering.
- Workflow hook tetikleme.

## Secret yonetimi

Frontend ortaminda yalnizca public degerler bulunabilir:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_BASE_URL
```

Backend veya server-only ortam disinda su degerler kullanilmaz:

```text
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
JWT_SECRET
PRIVATE_KEY
VAULT_SECRET
```
