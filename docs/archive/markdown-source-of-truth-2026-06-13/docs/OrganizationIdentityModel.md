# Organization Identity Model

## Master Tablo

`organizations` tablosu tüm tüzel kişi, kurum ve şirket kimliklerini tekil tutar. ERP'deki `sirketler` tablosu artık şirket rolünü ve ERP şirket ayarlarını taşır; tüzel kimlik `organization_id` ile master kayda bağlanır.

## Ana Alanlar

- `id`
- `legal_name`
- `short_name`
- `country`
- `tax_number`
- `registration_number`
- `tax_office`
- `organization_type`
- `phone`
- `email`
- `address`
- `city`
- `district`
- `metadata_json`
- `version`
- `workflow_status`
- `is_deleted`

## Eşleşme

Kesin eşleşme:

- `country + tax_number`
- `country + registration_number`, vergi numarası yoksa

Zayıf uyarı:

- `legal_name + country`

## Bağlı Roller

Kurum detayında şu roller gösterilir:

- Şirket
- Ortak
- Paydaş
- Cari
- Temsilci

Bu liste `organization_id` referanslarından hesaplanır.
