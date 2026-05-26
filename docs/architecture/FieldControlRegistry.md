# Field Control Registry

Field Control Registry, Eden ERP'de bir alanin normal kart formundan mi, taslak editinden mi, resmi operasyon/wizard akisi ile mi, yoksa sistem/projection tarafindan mi yonetilecegini tanimlayan merkezi sozlesmedir.

## Control Types

- `free_edit`: Normal kart formunda duzenlenebilir alanlar. Ornek: `company_branch.phone`.
- `draft_edit`: Yalnizca taslak kayitta dogrudan duzenlenebilir alanlar.
- `operation_controlled`: Aktif/lifecycle'a girmis kayitta ilgili operasyonla degisir. Ornek: `company.trade_name -> Unvan Degisikligi`.
- `system_controlled`: Sistem, projection veya entegrasyon tarafindan yazilir. Normal PATCH ile degismez.
- `relation_controlled`: Ana kart PATCH'i ile degil, iliski/operation endpointi ile guncellenir. Ornek: `company.partners`.
- `read_only`: Sadece okunur alanlar.
- `module_blocked`: Alanin ilgili islemi gerekli modul, lisans veya kurulum eksigi nedeniyle baslatilamaz.

## Registry Files

- `lib/field-controls/fieldControl.types.ts`: Ortak tipler.
- `lib/field-controls/fieldControlRegistry.ts`: Sirket, ortak, temsilci ve sube alan sozlesmeleri.
- `lib/field-controls/fieldControlResolver.ts`: Form alanlarina `readOnly`, `controlledByOperation`, `helpText`, `lockReason`, `suggestedOperation` uygular.
- `lib/field-controls/fieldControlMessages.ts`: Kullaniciya gosterilecek is dili mesajlarini uretir.
- `lib/field-controls/fieldControlGuards.ts`: Backend PATCH guard ve strip helper'larini saglar.
- `lib/field-controls/fieldActionEligibility.server.ts`: Backend/AI tarafinda alanin onerilen operation'larini Policy Engine `evaluateActionEligibility` sonucu ile esler.

## Examples

- `company.trade_name` -> `title_change` / Unvan Degisikligi
- `company.address` -> `address_change` / Adres Degisikligi
- `company_partner.share_ratio` -> `ownership_transaction` / Ortaklik Islemleri
- `company_representative.authority_types` -> `representative_authority_scope_change` / Temsil Yetkisi Islemleri
- `company_branch.opening_registration_date` -> `branch_opening` / Sube Acilisi
- `company_branch.document_files` -> `branch_document_update` / Sube Belge Guncelleme

## Backend Standard

Normal kart PATCH istekleri registry uzerinden kontrol edilir. Operation-controlled alan gonderildiginde standart hata doner:

```json
{
  "error": "Bu alanlar resmi islem kontrolludur. Ilgili sihirbaz/API route uzerinden degistirilmelidir.",
  "code": "OPERATION_CONTROLLED_FIELDS",
  "details": {
    "fields": [
      {
        "field": "opening_registration_date",
        "label": "Acilis tescil tarihi",
        "operation": "Sube Acilisi",
        "wizardKey": "branch_opening"
      }
    ]
  }
}
```

Relation-controlled alanlarda:

```json
{
  "error": "Bu iliskiler ana kart PATCH ile guncellenemez. Ilgili islem endpointini kullanin.",
  "code": "RELATION_PATCH_NOT_ALLOWED"
}
```

## Frontend Standard

`applyFieldControlsToFields` ve `applyFieldControlsToTabs` helper'lari EntityForm alanlarina registry bilgisini uygular. EntityForm kilitli alanlarda label yaninda bilgi ikonunu gosterir.

Popover standardi:

- Alanin neden kapali oldugunu is diliyle aciklar.
- Varsa ilgili wizard/operation butonunu gosterir.
- Kullanici yetkisizse, modul kapaliysa, kurulum eksikse veya kayit durumu uygun degilse butonu disabled tutar ve sebebi yazar.
- Opsiyonel modul eksiklerinde islem baslatilabilir olsa bile uyarilari gosterir.

Ornekler:

- `company.trade_name`: "Bu alan aktif sirketlerde dogrudan degistirilemez. Ticari unvan degisiklikleri Unvan Degisikligi sihirbazi ile yapilir."
- `company.committed_capital_amount`: "Sermaye bilgisi formdan dogrudan degistirilemez. Sermaye Artirimi veya Sermaye Azaltimi islemi kullanilmalidir."
- `company_branch.document_files`: "Sube belgeleri normal kart guncellemesiyle degistirilemez. Sube Belgeleri Guncelleme islemi kullanilmalidir."

Ilk entegrasyon:

- Sirket form alanlari
- Sube form alanlari

Ortak ve temsilci formlarindaki mevcut explicit `controlledByOperation` davranisi korunur; backend guard tarafinda registry kullanilir. Registry bu formlar icin de `fieldControl`, `lockReason`, `suggestedOperation` ve `suggestedOperations` alanlarini uretebilir.

## Module / Permission Eligibility

Field Control Registry, Module Registry ve Action Eligibility ile uyumlu calisacak sekilde gereksinim metadata'si tasir:

- `requiredModules` / `optionalModules`
- `requiredPermissions` / `fallbackPermissions`
- `requiredRecordStatuses` / `blockedRecordStatuses`
- `lockExplanation` / `helperText`
- `suggestedOperations`

Bu metadata hem frontend helper popover'inda hem de backend precheck/policy katmaninda ayni is kurallarinin uygulanmasi icin kullanilir.

Sermaye Artirimi ornegi:

- `companies` ve `partners` modulleri gerekir.
- `currentOwnership` read model/projection okunabilmelidir.
- Aktif ortak ve gecerli pay dagilimi olmalidir.
- Eksik durumda backend `MODULE_DEPENDENCY_MISSING` ile durur.

## AI / Action Guide

`suggestOperationForField(entityType, field)` fonksiyonu alan -> operasyon eslemesini dondurur. Action Guide ileride kullanicinin "bu alani neden degistiremiyorum?" sorusunu bu registry'den yanitlayabilir.
