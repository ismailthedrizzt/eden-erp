# Supabase Usage Policy

Supabase, Eden ERP'de is verisi icin backend tarafindan erisilen veri katmanidir. Frontend tarafinda Supabase sadece Auth amacli kullanilabilir.

## Veritabani adlandirma kontrati

Yeni Supabase/PostgreSQL migration'lari frontend ve backend ile ayni canonical Ingilizce domain adlarini kullanir. Tablo, kolon, index ve constraint adlari Ingilizce `snake_case` olmalidir. Turkce yalnizca UI label, yardim metni, dokuman basligi veya resmi dis kaynak adinda kullanilir.

Mevcut legacy tablo/kolon adlari geriye donuk uyumluluk borcudur. Yeni alias kolon eklenmez; gecis gerekiyorsa explicit mapper, rename migration'i veya backfill migration'i yazilir.

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
