# Person Model

## Master Tablo

`persons` tablosu Eden ERP'deki tüm gerçek kişilerin tekil kimlik kaydıdır. Bir kişi aynı anda çalışan, ortak, temsilci, paydaş veya yönetim kurulu üyesi olabilir; bu roller yeni kişi kaydı açmaz.

## Ana Alanlar

- `id`
- `first_name`
- `last_name`
- `full_name`
- `nationality`
- `national_id`
- `passport_no`
- `birth_date`
- `birth_place`
- `gender`
- `phone`
- `email`
- `address`
- `metadata_json`
- `version`
- `workflow_status`
- `is_deleted`

## Eşleşme

Kesin eşleşme:

- `nationality + national_id`
- `nationality + passport_no`

Zayıf uyarı:

- `full_name + birth_date + nationality`

Zayıf uyarı duplicate riskini gösterir, ama kayıt oluşturmayı tek başına engellemez.

## Bağlı Roller

Kişi detayında şu roller gösterilir:

- Çalışan
- Ortak
- Temsilci
- Paydaş
- Yönetim Kurulu Üyesi

Bu liste rol tablolarındaki `person_id` referanslarından hesaplanır.
