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

## Liste ve detay performans kontrati

Ana ERP liste ekranlari icin hedef, ilk liste gorunumunun kullaniciya 0.2 saniye civarinda, satir tiklama sonrasi formun 0.5 saniye icinde gorunmesidir. Bu hedefi korumak icin yeni liste/detay ekranlari asagidaki kurallara uyar.

- Liste ve detay GET cagrisini sayfadan ham `fetch` ile yapmak yerine `lib/services/*Service.ts` icinden `apiClient.get()` ile yap.
- Yetki karari API tarafinda service client veya endpoint guard ile veriliyorsa liste/detay servisinde `skipAuth: true` kullan; her liste acilisinda Supabase `getSession()` bekletme.
- Liste GET servislerinde varsayilan `staleTime` en az `120_000` olmalidir. Mutasyonlardan sonra ilgili prefix `apiClient.invalidate(...)` ile temizlenir.
- Satira tiklaninca once secili kaydi liste satiri verisiyle state'e koy ve form modunu `view` yap; detay verisini arka planda cek.
- Satir detay fetch'lerinde `?t=${Date.now()}` ve `cache: 'no-store'` kullanma. Gercek zamanli tazelik gerekiyorsa servis cagrisina bilincli `useCache: false` ver ve bunu yorumla acikla.
- Liste API'lerinde `select('*')` kullanma. Tablo icin gereken kolonlari acik listele; buyuk JSON/media/history kolonlarini detay endpointine birak.
- Liste sort/filter alanlari icin migration ile indeks ekle. Soft delete kullanan ana listelerde indeksin ilk bolumu `is_deleted` filtresini desteklemelidir.
- Tabloya verilen turetilmis data ve dashboard ozetleri `useMemo` ile hesaplanir.

Bu kontratin ana sirket/personel ekranlarinda bozulmamasi icin `npm run perf:guard` calistirilir. Yeni ana liste ekranlari eklenirken ayni kontrat script'e eklenmelidir.
