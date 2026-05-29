# Pilot Acceptance Criteria

## 1. Fonksiyonel Kabul

- Aktif sirket resmi alanlari normal edit ile degistirilemez.
- Sube serbest company create ile olusturulamaz.
- Sermaye artirimi current ownership olmadan baslatilamaz.
- Temsilci karti ve temsil yetkisi ayri gosterilir.
- Belge yukleme merkezi Document domain metadata'si olusturur.
- Import dry-run sonucu kullanici onayi olmadan kayit yazmaz.
- Global Search kayit, belge, gorev ve action sonucu dondurur.

## 2. Guvenlik / Yetki Kabul

- Kullanici scope disi sirketi goremez.
- Audit export ayrica audit permission gerektirir.
- Admin Console teknik sayfasi yalnizca system/admin rolune aciktir.
- Signed URL audit veya log icinde yazilmaz.
- Demo mode secret veya gercek credential gostermez.

## 3. Veri Tutarliligi Kabul

- Demo tenant icinde en az iki aktif sirket, bir taslak sirket vardir.
- EDEN Teknoloji ortaklik dagilimi %100 tamamdir.
- Ankara Subesi company, organization unit ve facility ile iliskilidir.
- PlaneGuard kurulu urun, musteri cari kart ve servis talebi ile iliskilidir.
- Data Quality duplicate ve eksik belge uyarisi uretir.

## 4. UX Kabul

- Ilk giris bos sistem hissi vermez.
- Action Guide "nasil baslayacagim" sorusuna is cevabi verir.
- Action Center bekleyen onay, gorev ve failed operation gosterir.
- Teknik hata mesajlari kullaniciya dogrudan gosterilmez.
- Mobilde global arama ve temel navigasyon kullanilabilir.

## 5. Performans Kabul

- Dashboard demo veriyle hizli acilir.
- Global Search 2-3 karakterden sonra debounce ile sonuc verir.
- Action Center counts kullaniciya beklenebilir surede doner.
- Admin health dashboard uzun bekleme olmadan temel durumu gosterir.

## 6. Raporlama Kabul

- Dashboard KPI'lari demo veriyle bos gelmez.
- Export job demo kaydi tamamlanmis durumdadir.
- Audit timeline kritik demo olaylarini gosterir.

## 7. Dokumantasyon Kabul

- PilotScenarioPack hazirdir.
- PilotDemoScript hazirdir.
- PilotEnvironmentChecklist hazirdir.
- DemoDataResetGuide hazirdir.
- PilotKnownRisks gunceldir.

## 8. Hata Yonetimi Kabul

- Failed email/outbox admin ekraninda gorulur.
- Validation script eksik demo verisini pass/fail olarak raporlar.
- Production ortamda demo seed mutating operation calismaz.

## 9. Teknik Kabul

- `npm run typecheck` basarili.
- `npm run build` basarili.
- `npm run migration:status` kritik hata vermez.
- `npm run boundaries:check` kritik hata vermez.
- `cd backend && ruff check .` basarili.
- `cd backend && mypy app` basarili.
- `cd backend && pytest` basarili.

