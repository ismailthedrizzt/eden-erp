# Supabase Usage Policy

Supabase, Eden ERP'de is verisi icin backend tarafindan erisilen veri katmanidir. Frontend tarafinda Supabase sadece Auth amacli kullanilabilir.

## Frontend'de izinli Supabase kullanimi

- Login.
- Logout.
- `getSession`.
- `onAuthStateChange`.
- Access token alma.

## Frontend'de yasak Supabase kullanimi

- `supabase.from(...)`.
- `supabase.rpc(...)`.
- `supabase.storage`.
- Dogrudan tablo adiyla select/insert/update/delete/upsert.
- Service role key veya database secret kullanimi.

## Storage politikasi

Dosya akisi backend kontrollu olmalidir:

```text
Frontend dosya secer
Backend upload izni veya signed URL uretir
Frontend dosyayi yukler
Backend metadata kaydini yapar
Backend yetki kontrolu ve audit uygular
```

Private bucket ve signed URL modeli tercih edilir. Document metadata database'e frontend tarafindan dogrudan yazilmaz.
