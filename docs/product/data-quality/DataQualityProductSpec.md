# Data Quality / Duplicate Merge / Master Data Governance Product Spec

## Amac

Eden ERP master kisi/kurum, paydas, cari kart, ortak, temsilci, calisan, kurulu urun ve belge verilerinde duplicate, eksik, celiskili ve dusuk kaliteli kayitlari tespit eder; yetkili kullanici onayi olmadan kayitlari sessizce birlestirmez.

## Kapsam

- Kalite kurallari ve kalite skoru
- Duplicate detection ve review queue
- Merge preview, relation impact ve guvenli merge guard
- Master person / master organization governance
- Eksik veri ve tutarsizlik bulgulari
- Import sirasinda duplicate warning
- Action Center kalite uyarilari
- Audit ve outbox event hazirligi

Data Quality domain normal CRUD sahibi degildir. Merge ve duzeltme islemleri kontrollu adapter ve ilgili domain servisleri uzerinden ilerlemelidir; resmi/lifecycle/transaction kayitlari otomatik merge edilmez.

## Entity Kapsami

Ilk fazda izlenen entity tipleri:

- `master_person`
- `master_organization`
- `stakeholder`
- `cari_account`
- `company`
- `partner`
- `representative`
- `employee`
- `installed_asset`
- `document`
- `product`

## Veri Modeli

Yeni tablolar:

- `data_quality_rules`
- `data_quality_scores`
- `duplicate_candidate_groups`
- `duplicate_candidate_items`
- `merge_operations`
- `merge_operation_relations`
- `data_quality_findings`

## Duplicate Detection

Kesin eslesmeler:

- Gercek kisi: `tenant_id + nationality + identity_number`, `tenant_id + nationality + passport_no`
- Tuzel kisi: `tenant_id + country + tax_number`, `tenant_id + mersis_number`
- Cari kart: `company_id + account_code`, `linked_entity_type + linked_entity_id`
- Kurulu urun: `product_id + serial_no`

Guclu/zayif eslesmeler review queue'ya dusurulur. Sistem otomatik update veya merge yapmaz.

## Kalite Skoru

`data_quality_scores` her kayit icin 0-100 arasi skor tutar.

Durumlar:

- `good`
- `warning`
- `poor`
- `critical`

Skor kaynaklari:

- zorunlu kimlik/vergi alanlari
- iletisim/adres alanlari
- master link
- cari link
- duplicate risk
- relation warning

## Merge Guvenligi

Merge oncesi zorunlu adimlar:

1. Duplicate grup secilir.
2. Target/source kayitlar gorulur.
3. Alan cakismalari gosterilir.
4. Iliskili kayit etkileri listelenir.
5. Kullanici etki onay kutusunu isaretler.
6. Yetki ve entity guard gecerse merge tamamlanir.

Merge edilebilir MVP entity tipleri:

- `master_person`
- `master_organization`
- `stakeholder`
- `document`

Merge engellenen veya ozel operation isteyen kayitlar:

- resmi `company`
- ownership transaction gecmisi olan `partner`
- authority transaction gecmisi olan `representative`
- aktif employment kaydi olan `employee`
- accounting transaction
- audit log

Bu kayitlarda link correction veya domain-specific cleanup operation onerilir.

## Import Entegrasyonu

Import validation mevcut duplicate buldugunda row warning dondurur:

- mevcut kayit id
- Data Quality warning tipi
- onerilen aksiyon: skip duplicate veya merge review

Import otomatik merge veya update yapmaz.

## Action Center

`data_quality_findings` ve acik duplicate gruplari yetkili kullanicilara Action Center item olarak gosterilebilir.

Source type: `data_quality`

Ornek aksiyonlar:

- Incele
- Merge Incele
- Yok Say
- Ilgili Kaydi Ac

## Permissions

- `dataQuality.view`
- `dataQuality.runChecks`
- `dataQuality.reviewDuplicates`
- `dataQuality.merge`
- `dataQuality.dismissFinding`
- `dataQuality.admin`

Merge icin ayrica entity-specific edit yetkisi gerekebilir.

## API Endpoints

- `GET /api/v1/data-quality/summary`
- `GET /api/v1/data-quality/by-entity/{entity_type}/{entity_id}`
- `POST /api/v1/data-quality/check`
- `POST /api/v1/data-quality/check/{entity_type}/{entity_id}`
- `GET /api/v1/data-quality/duplicates`
- `GET /api/v1/data-quality/duplicates/{group_id}`
- `POST /api/v1/data-quality/duplicates/detect`
- `POST /api/v1/data-quality/duplicates/{group_id}/dismiss`
- `POST /api/v1/data-quality/duplicates/{group_id}/false-positive`
- `POST /api/v1/data-quality/merge/preview`
- `POST /api/v1/data-quality/merge/confirm`
- `GET /api/v1/data-quality/merge/{merge_id}`
- `GET /api/v1/data-quality/rules`
- `PATCH /api/v1/data-quality/rules/{rule_key}`

## Acceptance Criteria

- Data Quality domain ve migration mevcut.
- Duplicate detection review queue'ya yazar.
- Merge preview relation impact ve riskleri gosterir.
- Riskli resmi/transaction kayitlari merge edilmez.
- Kalite skoru ve finding uretilir.
- Import duplicate warning Data Quality dilini kullanir.
- Action Center data quality uyarilarini gosterebilir.
- Next proxy ve frontend servis canonical FastAPI contract'a baglidir.


## Known Gaps

Known gaps are tracked in [DataQualityKnownGaps.md](./DataQualityKnownGaps.md) and summarized in the final release gate risk list.
