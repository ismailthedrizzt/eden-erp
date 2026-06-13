# Data Import / Export / Bulk Operations Product Spec

<!-- source-of-truth-standard: contract overrides markdown -->

## Amac

Eden ERP'de ana verilerin toplu alinmasi, disa aktarilmasi ve kontrollu bulk operation ile yonetilmesi icin urun seviyesi altyapi saglanir. Toplu veri islemleri tekil domain kurallarini bypass etmez; import ve bulk action dogrudan tabloya keyfi yazmaz, ilgili domain servislerini cagirir.

## Kapsam

Import/export domain su kavramlari sahiplenir:

- Import job, template, file, field mapping, validation result, duplicate detection, dry-run, confirmation ve error report.
- Export job, export template, file reference ve download audit.
- Bulk update job, bulk operation result ve operation log.

Bu domain sirket acilisi, pay devri, temsil yetkisi verme, sube acilisi/kapanisi, muhasebe transaction mutation veya process approval logic sahiplenmez. Bu isler ilgili operation/wizard uzerinden yurutulur.

## Import Job Lifecycle

1. Kullanici veri seti sablonunu secer ve CSV/XLSX dosyasini yukler.
2. Backend dosyayi parse eder, job durumunu `mapping_required` yapar ve otomatik mapping onerir.
3. Kullanici mapping'i duzeltir.
4. Validation required alan, enum, tarih, sayi, para birimi, e-posta, telefon normalize, scope, permission, readiness, duplicate ve field-control kurallarini uygular.
5. Dry-run create/skip/invalid etkisini gosterir.
6. Kullanici onaylamadan kayit yazilmaz.
7. Confirm sadece `valid` ve `warning` satirlari domain servisleri ile import eder; duplicate satirlar MVP'de otomatik update edilmez.

## MVP Import Veri Setleri

- Cari Kartlar
- Paydaslar / Musteriler / Tedarikciler
- Urun/Hizmet Katalogu
- Calisan Kartlari
- Proje Gorevleri
- Tesis/Lokasyonlar
- Organizasyon Birimleri
- Sirket Taslak Kartlari
- Ortak Taslak Kartlari
- Temsilci Taslak Kartlari

Resmi/lifecycle islem doguran alanlar importla yazilamaz. Kullanici mesaji: "Bu veri seti resmi islem dogurdugu icin toplu import ile olusturulamaz. Ilgili islem sihirbazi kullanilmalidir."

## Validation ve Duplicate

Genel validation required field, enum, tarih, sayi, para birimi, e-posta, telefon, TCKN/VKN format uyumlulugu, company scope, permission ve module readiness kontrollerini kapsar. Field-control validation operation-controlled, system-controlled ve read-only alanlari engeller.

Duplicate kurallari entity bazlidir:

- Gercek kisi: nationality + identity_number, nationality + passport_no.
- Tuzel kisi: country + tax_number, trade_name + city warning.
- Cari kart: company_id + account_code, linked_entity, tax_number warning.
- Urun: product_code, brand + model warning.
- Calisan: company_id + employee_no, identity_number warning.
- Facility: company_id + name, company_id + address warning.
- Organization unit: company_id + parent_unit_id + name.

MVP duplicate stratejisi `skip duplicates` veya `create only valid new rows` ile sinirlidir; otomatik update/merge yoktur.

## Export

MVP CSV export desteklenen veri setleri: sirket, ortak, temsilci, sube, cari kart, cari hareket, calisan, urun katalogu, kurulu urun, servis talebi, paydas, gorev ve audit report.

Kurallar:

- Permission ve company scope uygulanir.
- Filtreler ve kolon secimi uygulanir.
- Maksimum satir limiti vardir.
- Hassas alanlar ek yetki yoksa maskelenir.
- Export olusturma ve indirme auditlenir.
- Buyuk export async job olarak modellenmistir.

## Bulk Actions

MVP bulk actions:

- Secili kayitlari pasife alma.
- Secili tasklari atama veya status degistirme.
- Cari kartlara etiket ekleme.
- Paydaslara sorumlu atama.
- Urunleri aktif/pasif yapma.
- Facility tag/status update; lifecycle controlled ise engelleme.
- Calisan kartlarina notes/tag update.

Bulk action guard permission, scope, field control, record status, integrity ve max batch size kontrol eder. Sonuc total, success, failed, skipped ve per-row result olarak raporlanir.

## API Endpoints

- `GET /api/v1/import/templates`
- `GET /api/v1/import/templates/{template_key}`
- `GET /api/v1/import/templates/{template_key}/download`
- `POST /api/v1/import/jobs`
- `POST /api/v1/import/jobs/{job_id}/upload`
- `GET /api/v1/import/jobs/{job_id}`
- `POST /api/v1/import/jobs/{job_id}/mapping`
- `POST /api/v1/import/jobs/{job_id}/validate`
- `POST /api/v1/import/jobs/{job_id}/confirm`
- `POST /api/v1/import/jobs/{job_id}/cancel`
- `GET /api/v1/import/jobs/{job_id}/error-report`
- `POST /api/v1/export/jobs`
- `GET /api/v1/export/jobs/{job_id}`
- `GET /api/v1/export/jobs/{job_id}/download`
- `POST /api/v1/bulk/actions`
- `GET /api/v1/bulk/actions/{job_id}`
- `POST /api/v1/bulk/actions/{job_id}/confirm`
- `GET /api/v1/bulk/actions/{job_id}/report`

## Permissions, Audit, Action Center

Permissions: `import.view`, `import.create`, `import.confirm`, `import.cancel`, `export.create`, `export.download`, `bulk.create`, `bulk.confirm`, `bulk.admin`.

Audit events: import job created/validated/confirmed/completed/failed, export created/downloaded, bulk action confirmed/completed.

Action Center uzun suren import, validation error, export ready ve bulk completed/failed durumlarini ilgili kullanici veya admin icin gorunur kilar.

## Security

- CSV/XLSX file size ve row count limitlidir.
- Uploaded file raw URL loglanmaz.
- Signed URL veya content reference auditte maskelenir.
- CSV/Excel formula injection exportta escape edilir.
- Direct DB bypass yasaktir; import domain adapterleri domain servislerini cagirir.

## Acceptance Criteria

- Import job lifecycle upload -> mapping -> validation -> dry-run -> confirm olarak calisir.
- 10 MVP import template tanimlidir ve indirilebilir.
- CSV/XLSX parse, mapping, validation ve duplicate detection vardir.
- Operation-controlled alan import ve bulk update ile engellenir.
- Export MVP CSV uretir, scope/masking/audit uygular.
- Bulk action MVP dry-run ve confirm ile calisir.
- Audit, Action Center ve outbox entegrasyonlari hazirdir.
- Next proxy FastAPI sozlesmesine baglidir ve legacy fallback kullanmaz.
- Product spec, real-data scenarios, E2E checklist ve known gaps dokumante edilmistir.
