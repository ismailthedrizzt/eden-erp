# Advanced Reporting Real Data Scenarios

## Scenario 1 - Saved View

1. Cari Hareketler raporunda `document_status=document_needed` filtresi uygulanir.
2. Kolonlar `company_id`, `account_id`, `amount`, `document_status` olarak secilir.
3. Gorunum `Belge Takip Gorunumu` adi ile kaydedilir.
4. Kullanici raporu tekrar actiginda saved view'i uygular.
5. Veri sadece kullanicinin scope'undaki sirketlerle sinirli kalir.

## Scenario 2 - Shared View

1. Operasyon yoneticisi sube kapanis uyarilari icin view olusturur.
2. Visibility `shared_with_role` yapilir.
3. Operasyon rolundeki kullanici view'i gorur.
4. Kullanici sadece kendi scope'undaki subeleri gorur.

## Scenario 3 - Scheduled Report

1. `operations_risk_report` haftalik olarak zamanlanir.
2. Alici olarak operasyon rolu veya email verilir.
3. Worker due schedule'i bulur.
4. Runtime permission check gecen aliciya notification/email kuyruğu olusur.
5. Run log tamamlandi olarak kaydedilir.

## Scenario 4 - Export Permission

1. Kullanici finansal belge eksikligi raporunu export etmek ister.
2. `reporting.export` veya finansal rapor izni yoksa islem engellenir.
3. Permission denied audit/log olusur.
4. Export dosyasi veya signed URL uretilmez.

## Scenario 5 - Dashboard Personalization

1. Kullanici HR hassas kartlarini gizler.
2. Operasyon risk ve sirket 360 raporlarini pinler.
3. Tercihler `reporting_dashboard_preferences` tablosuna yazilir.
4. Sonraki giriste ayni layout kullanilir.

## Scenario 6 - Cross-Module Risk Report

1. Operasyon Risk Raporu acilir.
2. Failed operations, overdue tasks, missing documents ve data quality warnings birlikte listelenir.
3. Eksik kaynak tablo varsa rapor warning ile calismaya devam eder.

## Scenario 7 - Recipient Permission Check

1. Scheduled audit report alicisi `audit.view` yetkisine sahip degildir.
2. Worker bu aliciyi atlar.
3. Owner'a skipped recipient notification olusur.
4. Run log metadata alaninda skipped listesi tutulur.

