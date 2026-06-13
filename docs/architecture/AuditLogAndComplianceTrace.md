# Audit Log and Compliance Trace

<!-- source-of-truth-standard: contract overrides markdown -->

Audit Log, Eden ERP'de kim, ne zaman, hangi kayit uzerinde, hangi yetki veya islem kapsaminda hareket etti sorusunun teknik-denetim cevabidir. Kullaniciya gosterilen is gecmisinin yerine gecmez; onu tamamlar.

## Ayrim

- History: Is kaydinin kullaniciya gosterilen alan degisikligi gecmisidir.
- Transaction: Resmi veya operasyonel islem kaydidir.
- Lifecycle Event: Kaydin durum gecisidir.
- Outbox Event: Sistem ici olay yayini icin kuyruk kaydidir.
- Audit Log: Kullanici, zaman, kapsam, yetki, islem, surec ve sonuc izidir.

## Auditlenen Olaylar

- Kayit goruntuleme, olusturma, guncelleme ve silme aksiyonlari.
- Operation baslama, tamamlanma ve basarisizliklari.
- Process baslama, adim tamamlama, onay, red, iptal ve hata olaylari.
- Gercek API/action denemelerinde permission veya policy redleri.
- Outbox failed/skipped durumlari ve audit zorunlu eventler.
- Belge yukleme, silme ve versiyon guncelleme olaylari icin servis fonksiyonlari.

UI tarafinda sadece butonun disabled gorunmesi audit uretmez. Audit, kullanicinin gercek bir API/action denemesi yaptigi noktada yazilir.

## Veri Modeli

`audit_logs` tenant scope ile izole edilir. Ana alanlar:

- `tenant_id`, `company_id`, `branch_id`
- `module_key`, `entity_type`, `entity_id`
- `action_type`, `action_key`
- `operation_id`, `process_instance_id`, `task_id`, `approval_id`, `outbox_event_id`
- `user_id`, `user_label`, request/session/ip/user-agent bilgileri
- `old_values`, `new_values`, `changed_fields`
- `summary`, `reason`, `result_status`, `severity`

Eski `instance_id/module_code/resource/record_id/action/before_json/after_json` alanlari kalici uyumluluk hedefi degildir; canli veri tasinana kadar acik deprecation planiyla okunabilir kalir.

## Hassas Veri Maskeleme

Audit log raw hassas veri tutmaz. Asagidaki alan desenleri maskelenir:

- password, token, secret, api key ve credential alanlari tamamen maskelenir.
- IBAN, hesap no, kimlik no, vergi no ve pasaport no alanlarinda sadece son 4 karakter acik kalir.
- Telefon ve e-posta kismi maskelenir.
- Signed URL ve belge URL degerleri maskelenir.

## Best Effort Yazim

Audit yazimi cogu is akisi icin best effort calisir. Audit insert hatasi normal kullanici islemini kirmamalidir; hata sistem loguna duser. Ileride kritik compliance politikasi belirli islemlerde audit yazimi zorunlu hale getirebilir.

## Okuma API'leri

Audit read API'leri read-only calisir:

- `GET /api/audit`
- `GET /api/audit/[id]`
- `GET /api/audit/by-record`
- `GET /api/audit/by-operation`
- `GET /api/audit/by-process`

FastAPI migration sonrasi canonical endpointler:

- `GET /api/v1/audit`
- `GET /api/v1/audit/{audit_id}`
- `GET /api/v1/audit/by-record`
- `GET /api/v1/audit/by-operation`
- `GET /api/v1/audit/by-process`

Next.js audit route'lari `FASTAPI_BASE_URL` varsa Python Audit Service'e proxy eder. TS audit service gecici fallback'tir.

Erisim `audit.view`, `settings.view` veya `settings.edit` yetkileriyle sinirlanir. Tenant scope her sorguda korunur.

## UI Hazirligi

`AuditTimeline`, audit kayitlarini teknik JSON yerine okunabilir ozet, kullanici ve zaman bilgisiyle gostermek icin hazir bileşendir. Detay ekranlarinda ileride "Denetim Izi" tabina baglanabilir.
