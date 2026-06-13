# HR Employee Real Data Scenarios

<!-- source-of-truth-standard: contract overrides markdown -->

## Scenario 1 - Calisan karti taslagi

1. Kullanici Calisanlar sayfasinda `Calisan Ekle` aksiyonunu acacaktir.
2. Aktif sirket, ad, soyad, TCKN/iletisim bilgileri girilir.
3. Kayit `record_status = draft`, `employment_status = draft` kalir.
4. Detayda `Ise Giris Baslat` aksiyonu gorunur.

## Scenario 2 - Ise giris

1. Draft calisan karti acilir.
2. Aktif sirket, aktif organizasyon birimi ve aktif pozisyon secilir.
3. `employment_type`, `start_date`, SGK isyeri sicil no ve calisma yeri girilir.
4. Ise giris tamamlanir.
5. Calisan `active`, istihdam kaydi `active`, SGK durumu `pending` veya
   secilen deger olur.

## Scenario 3 - SGK manuel tamamlandi

1. Ise girisi yapilmis calisanin SGK durumu `pending`dir.
2. Kullanici `SGK Girisi Yapildi` aksiyonunu acar.
3. Tamamlanma tarihi, belge/referans no girilir.
4. `sgk_status = completed` olur ve transaction gecmisi olusur.

## Scenario 4 - Pozisyon degisikligi

1. Aktif calisan detayinda `Pozisyon Degisikligi` acilir.
2. Yeni organizasyon birimi ve pozisyon secilir.
3. `effective_date` ve gerekce girilir.
4. Current employment assignment guncellenir.
5. Eski/yeni degerler transaction olarak saklanir.

## Scenario 5 - Isten cikis

1. Aktif calisan detayinda `Isten Cikis` wizard'i baslatilir.
2. Cikis tarihi, ayrilis nedeni ve SGK cikis bilgisi girilir.
3. Cikis tarihi ise giris tarihinden onceyse sistem engeller.
4. Completion sonrasi calisan karti passive, istihdam kaydi terminated olur.

## Scenario 6 - Temsilci olan calisan uyarisi

1. Calisanin `person_id` degeri aktif temsilci kartiyla aynidir.
2. Isten cikis completion sonrasi sistem uyari dondurur.
3. Kullanici Temsilcilerimiz modulunden temsil yetkisini kontrol etmeye
   yonlendirilir.

## Scenario 7 - Belge eksikleri

1. Calisan detayinda zorunlu belge `missing` veya `expired` durumdadir.
2. Hero altinda belge eksigi uyarisi gorunur.
3. Belge yüklendiginde status `uploaded` veya `verified` olur.

## Scenario 8 - Sube bazli calisan listesi

1. Calisan listesinde aktif sube filtresi secilir.
2. Liste yalnizca o subeye bagli current employment kayitlarini gosterir.
3. Summary widget'lari filtrelenen listeyle uyumlu okunabilir kalir.
