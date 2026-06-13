# Representative Authority Scope

<!-- source-of-truth-standard: contract overrides markdown -->

Bu fazda temsilci karti ile temsil yetkisi kapsami teknik olarak ayrilir.

## Ilke

- Temsilci karti cogaltilmaz.
- Ayni kisi veya kurum ayni sirket icinde tek `company_representatives` karti olarak kalir.
- Sube, organizasyon birimi veya tesis/lokasyon bazli farkliliklar temsilci kartinda degil, yetki islemi ve guncel yetki read modelinde tutulur.
- `company_wide` yetki sirket genelinde gecerlidir.
- `branch` yetki yalnizca secili aktif sube icin gecerlidir.
- `organization_unit` yetki yalnizca secili aktif organizasyon birimi icin gecerlidir.
- `facility` yetki yalnizca secili aktif tesis/lokasyon icin gecerlidir.
- Kapali veya pasif sube, organizasyon birimi ya da tesis/lokasyon icin yeni aktif yetki verilemez.

## Scope Alanlari

Yetki kapsami `company_representative_authority_transactions` ve current authority read model seviyesinde tutulur:

- `scope_type`
- `branch_id`
- `organization_unit_id`
- `facility_id`
- `scope_label`
- `scope_notes`

Temsilci kartina kalici `branch_id` veya benzeri scope alanlari eklenmez. Liste/detail response bu alanlari current authority projection/hydration sonucu olarak gosterebilir.

## Validasyon

TypeScript gecis katmaninda `validateRepresentativeAuthorityScopePolicy`, FastAPI core backend'de `backend/app/domains/representatives/scope.py` ayni kurallari uygular:

- `company_wide` icin sube, organizasyon birimi ve tesis/lokasyon secilmez.
- `branch` icin aktif ve ayni sirkete bagli sube zorunludur.
- `organization_unit` icin aktif ve ayni sirkete bagli organizasyon birimi zorunludur.
- `facility` icin aktif ve ayni sirkete bagli tesis/lokasyon zorunludur.

Normal temsilci PATCH istekleri scope ve authority alanlarini reddeder. Scope degisikligi yalnizca temsil yetkisi islemleriyle yapilir.

## Read Model

`v_current_representative_authorities` mevcut read model korunarak scope alanlariyla genisletilir. Liste API'si branch/organization/facility filtrelerinde transaction tablosundan scope eslesmesini tercih eder; boylece tek temsilci karti farkli kapsam yetkileri tasiyabilir.

## UI

- Temsilcilik wizardinda "Yetki Kapsami" adimi vardir.
- Temsilcilerimiz listesinde sirket, sube ve kapsam turu filtreleri hazirdir.
- Subelerimiz detayinda "Temsilciler / Yetkililer" paneli read-only olarak ilgili sube ve sirket geneli yetkileri gosterir.
