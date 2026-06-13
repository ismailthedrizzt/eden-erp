# Identity Model

## Amaç

Eden ERP'de gerçek kişiler ve tüzel kişiler tekil master kayıtlarda tutulur. Çalışan, ortak, temsilci, paydaş, yönetim kurulu üyesi ve şirket kayıtları artık kimlik bilgisini tekrar üretmez; ilgili master kayda referans verir.

```text
persons = gerçek kişi master kaydı
organizations = tüzel kişi / kurum master kaydı
role tables = iş ilişkisi ve rol detayları
```

## Tekillik Kuralları

Gerçek kişi için kesin eşleşmeler:

- `nationality + national_id`
- `nationality + passport_no`

Zayıf uyarı:

- `full_name + birth_date + nationality`

Tüzel kişi / kurum için kesin eşleşmeler:

- `country + tax_number`
- `country + registration_number`, yalnızca `tax_number` yoksa

Zayıf uyarı:

- `legal_name + country`

Zayıf uyarılar kayıt oluşturmayı teknik olarak engellemez; UI kullanıcıya mevcut kayıtla ilişkilendirme önerir.

## Oluşturma Akışı

Yeni çalışan, ortak, temsilci, paydaş veya yönetim kurulu üyesi eklenirken akış şudur:

1. Kişi/Kurum Tipi
2. Kimlik Bilgileri
3. Mevcut Kayıt Eşleştirme
4. Rol Detayları

`Kaynak Türü` ilk create akışında sorulmaz. Kullanıcıya şu karar gösterilir:

```text
Bu kişi mevcut kayıtlarda bulundu. Mevcut kişiyle ilişkilendirilsin mi?
```

## Rol Referansları

Rol tabloları master kimlik kaydına bağlanır:

- `employees.person_id`
- `sirket_ortaklar.person_id` veya `sirket_ortaklar.organization_id`
- `sirket_temsilciler.person_id` veya `sirket_temsilciler.organization_id`
- `stakeholders.person_id` veya `stakeholders.organization_id`
- `sirketler.organization_id`

Mevcut eski alanlar geçiş süresince korunur ve sadece görüntü/geriye uyumluluk için kullanılır.

## Güvenlik

Kimlik verisi hassastır. Bu nedenle:

- Fiziksel silme yoktur; `is_deleted`, `deleted_at`, `deleted_by` kullanılır.
- Güncellemelerde `version` ile optimistic locking gerekir.
- Kimlik değişiklikleri `audit_logs` ve `record_history` ile izlenmelidir.
- Duplicate merge doğrudan yapılmaz; `identity_merge_requests` üzerinden onaylı ve denetlenebilir ilerler.

## Backend Yüzeyi

FastAPI identity uçları:

- `POST /identity/persons/search`
- `POST /identity/persons`
- `POST /identity/organizations/search`
- `POST /identity/organizations`

Bu uçlar Supabase JWT, modül ve permission guard'ları arkasında çalışır.
