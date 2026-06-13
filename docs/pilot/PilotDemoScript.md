# Pilot Demo Script

<!-- source-of-truth-standard: contract overrides markdown -->

Hedef sure: 30-45 dakika.

## 1. Giris ve Sistem Felsefesi

Mesaj:
- Eden ERP taslak kayit ile resmi islem sonucunu ayirir.
- Wizard/operation modeli audit, approval ve rollback riskini yonetir.
- Action Center yapilacak isleri, Notification ise bilgilendirmeleri tasir.

Gosterilecek ekran:
- Dashboard
- Action Guide
- Action Center

Fallback:
- Dashboard bos gelirse `/app/onboarding` ve `/app/sistem` ekranlariyla basla.

## 2. Sirketlerimiz

Mesaj:
- Aktif sirket resmi alanlari dogrudan editlenmez.
- Adres, unvan, NACE, tasfiye gibi degisiklikler operasyon olarak ilerler.

Gosterilecek veri:
- EDEN Teknoloji
- Quattro taslak sirket
- Eski Operasyon tasfiye senaryosu

Fallback:
- Liste gec yuklenirse global aramada "EDEN Teknoloji" ara.

## 3. Ortaklik ve Sermaye

Mesaj:
- Ortak karti role-based kayittir; current ownership approved transactionlardan okunur.
- Sermaye artirimi %100 ownership ve precheck ister.

Gosterilecek veri:
- Aylin Kaya %60
- Mert Demir %40
- Sermaye artirimi bekleyen onay

## 4. Temsilci Yetkileri

Mesaj:
- Temsilci karti kisi/kurum bilgisidir; yetki ayri lifecycle kaydidir.
- Yetki scope sirket geneli veya sube bazli olabilir.

Gosterilecek veri:
- Aylin Kaya sirket geneli imza yetkisi
- Mert Demir Ankara Subesi banka yetkisi

## 5. Subeler / Teskilat / Tesis

Mesaj:
- Sube ayri bir legal company degildir.
- Tesis fiziksel lokasyonu, unit organizasyonel karsiligi temsil eder.

Gosterilecek veri:
- Ankara Subesi
- Ankara Sube Organizasyonu
- Ankara Sube Lokasyonu

## 6. Action Center / Process

Mesaj:
- Onay, gorev, failed operation, belge ve data quality uyarilari ayni is merkezinden izlenir.

Gosterilecek veri:
- Sermaye artirimi onayi
- Geciken belge gorevi
- Failed address change operation

## 7. Muhasebe / Cari

Mesaj:
- Cari kart ve cari hareketler domain kurallarindan gecmeden toplu degistirilemez.
- Belge aranacak hareket is uyarisi olarak gorunur.

Gosterilecek veri:
- GlassTech cari kart
- Muhtelif Tedarikciler
- Belge aranacak kurulum gideri

## 8. Satis Sonrasi

Mesaj:
- Urun katalog, kurulu urun, servis talebi ve servis kaydi birbirine baglidir.
- PlaneGuard senaryosu seri no arama ve servis takibini gosterir.

Gosterilecek veri:
- PlaneGuard Edge Gateway
- PG-2026-0001
- SR-2026-001

## 9. Reporting / Audit / Admin

Mesaj:
- Pilot ortam yalnizca is ekranlari degil, saglik, audit ve admin izlenebilirligiyle hazirdir.
- Secretlar maskelenir; failed worker/outbox durumlari admin aksiyonuna doner.

Gosterilecek ekran:
- Dashboard
- Audit
- Admin Console / Saglik
- Admin Console / Outbox

## 10. Kapanis

Mesaj:
- Pilot kapsami: sirket, ortak, temsilci, sube, belge, gorev, bildirim, arama, veri kalitesi ve admin.
- Sonraki adim: pilot feedback projesinde bug/UX/data issue takibi.

Musteri sorulari icin kisa cevaplar:
- "Excel yukleme var mi?" Evet, dry-run ve validation ile kontrollu.
- "Belge nerede duruyor?" Metadata merkezi documents tablosunda, dosya storage'da.
- "Yetkisiz kayit aranir mi?" Hayir, search permission/scope filtreli.

