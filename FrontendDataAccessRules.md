# Frontend Data Access Rules

Eden ERP frontend katmani sadece UI, form state, route state ve backend API cagrisindan sorumludur. Is verisi icin dogrudan Supabase tablo sorgusu kullanilmaz.

## Izin verilenler

- `apiClient.get()`, `apiClient.post()`, `apiClient.patch()`, `apiClient.delete()` ile backend API cagirmak.
- Supabase Auth ile login, logout, session alma ve access token alma.
- Form verisini client tarafinda gecici olarak tutmak.
- Liste filtrelerini, arama metnini ve siralama bilgisini backend API query parametresi olarak gondermek.

## Yasaklananlar

- `supabase.from(...)`, `supabase.rpc(...)` veya `supabase.storage` ile is verisine erismek.
- Frontend ortaminda service role key, database URL, JWT secret veya private key kullanmak.
- Tablo adlariyla dogrudan veri cekmek veya kaydetmek.
- Yetki kararini yalnizca frontend state ile vermek.
- Business logic iceren select, insert, update, delete veya upsert zincirleri yazmak.

## Yeni modul gelistirme

Yeni bir modulde once backend endpoint tasarlanir. Frontend service veya hook dosyasi yalnizca merkezi `apiClient` uzerinden bu endpointleri cagirir.

Ornek:

```ts
await apiClient.get('/api/employees', { query: { page, pageSize, search } })
await apiClient.post('/api/companies', payload)
await apiClient.patch(`/api/partners/${id}`, { version, data })
```
