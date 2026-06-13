# Data Import / Export Real Data Scenarios

<!-- source-of-truth-standard: contract overrides markdown -->

## Scenario 1 - Cari Kart Import

1. Kullanici Cari Kart sablonunu indirir.
2. CSV veya XLSX dosyasini doldurur.
3. Dosyayi Data Import sayfasina yukler.
4. Sistem kolonlari parse eder ve mapping onerir.
5. Duplicate VKN veya account_code warning gorunur.
6. Kullanici valid rows import secenegiyle onaylar.
7. Cari Kartlar listesinde yeni kartlar gorunur.

## Scenario 2 - Paydas Import

1. Kullanici musteri/tedarikci listesini yukler.
2. Master person/organization lookup duplicate uyarisini uretir.
3. Kullanici cari kart olusturma opsiyonunu payload ile secer.
4. Import tamamlanir ve paydas kartlari olusur.

## Scenario 3 - Urun Katalogu Import

1. Product catalog template indirilir.
2. `serial_required`, `warranty_months`, `sale_enabled` ve `after_sales_enabled` alanlari doldurulur.
3. Dosya validate edilir.
4. Duplicate `product_code` satirlari skipped olur.
5. Urun/Hizmet Katalogu kayitlari olusur.

## Scenario 4 - Calisan Taslak Import

1. Employee draft template yuklenir.
2. TCKN duplicate warning gorunur.
3. Taslak calisan kartlari domain servisiyle olusur.
4. Ise giris import ile yapilmaz; ilgili HR employment operation kullanilir.

## Scenario 5 - Hatali Dosya

1. Required kolon eksik dosya yuklenir.
2. Validation `validation_failed` veya invalid rows sonucu uretir.
3. Error report indirilebilir.
4. Kullanici dosyayi duzeltip yeni job baslatir.

## Scenario 6 - Export

1. Kullanici sirket listesini filtreler.
2. CSV export job olusturur.
3. Hassas alanlar yetkiye gore maskelenir.
4. Export created ve downloaded audit kayitlari olusur.

## Scenario 7 - Bulk Task Assignment

1. Kullanici gorevleri secer.
2. `task.assign` bulk action dry-run calisir.
3. Scope ve permission guard gecer.
4. Kullanici onaylar.
5. Result report success/failed/skipped satirlarini gosterir.

## Scenario 8 - Operation-Controlled Field Engeli

1. Ortak import dosyasinda `share_ratio` kolonu bulunur.
2. Validation `OPERATION_CONTROLLED_FIELD` hatasi uretir.
3. Sistem Ilk Ortaklik Girisi wizard yolunu onerir.
4. Satir import edilmez.
