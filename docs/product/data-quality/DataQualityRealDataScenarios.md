# Data Quality Real Data Scenarios

<!-- source-of-truth-standard: contract overrides markdown -->

## Scenario 1 - Duplicate kurum

1. Ayni VKN ile iki master organization vardir.
2. Duplicate detection calisir.
3. Review queue'da exact match gorunur.
4. Merge preview alan farklarini ve iliskili kayitlari gosterir.
5. Yetkili kullanici onaylarsa merge operation auditlenir.

## Scenario 2 - Duplicate kisi

1. Ayni TCKN ile employee ve representative tarafinda iki master person olusur.
2. Data Quality exact duplicate grubu uretir.
3. Master kisi merge onerilir.
4. Representative/employee role kayitlari otomatik resmi merge edilmez; link etkisi gosterilir.

## Scenario 3 - Musteri cari baglantisi eksik

1. Active customer stakeholder vardir.
2. `related_cari_account_id` yoktur.
3. Data Quality warning uretir.
4. Kullanici ilgili kayda veya cari kart olusturma aksiyonuna yonlendirilir.

## Scenario 4 - Sube relation eksik

1. Active branch kaydinda facility baglantisi yoktur.
2. Data Quality warning olusur.
3. Action Center'da yetkili kullaniciya "tesis baglantisi eksik" isi gosterilebilir.

## Scenario 5 - Kurulu urun serial duplicate

1. Ayni serial no ile iki installed asset vardir.
2. Duplicate candidate olusur.
3. Sistem otomatik merge yapmaz.
4. Manuel inceleme onerilir.

## Scenario 6 - Import duplicate

1. CSV ile ayni VKN tekrar yuklenir.
2. Import validation existing duplicate warning dondurur.
3. Kullanici valid rows import eder, duplicate satiri skip eder veya Data Quality review baslatir.

## Scenario 7 - Merge edilemeyen resmi kayit

1. Iki company duplicate gibi gorunur.
2. Merge preview "Resmi sirket kayitlari merge edilemez" mesajini gosterir.
3. Kullanici link correction veya resmi duzeltme akisina yonlendirilir.

## Scenario 8 - Action Center quality warning

1. Employee required document missing finding olusur.
2. Action Center data_quality item gosterir.
3. Kullanici employee detail belge alanina veya Veri Kalitesi sayfasina gider.

