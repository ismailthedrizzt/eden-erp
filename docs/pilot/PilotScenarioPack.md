# Pilot Scenario Pack

<!-- source-of-truth-standard: contract overrides markdown -->

Bu paket Eden ERP demo/pilot ortaminda uctan uca anlatilacak ve kabul testinde
dogrulanacak ana akislarin ortak referansidir. Demo verileri gercek kisi veya
ticari sir icermez; tum kayitlar `metadata_json.demo_data = true` veya
deterministic demo ID ile izlenebilir olmalidir.

## A. Ilk Kullanici / Onboarding

Amac: Yeni kullanici bos sistem yerine baslangic adimlarini gorur.

Rol: Sistem Yoneticisi

Baslangic verisi:
- Eden Demo Workspace
- Demo moduller enabled
- Taslak Quattro sirketi

Adimlar:
1. Kullanici ilk giris deneyimini acar.
2. Workspace checklist gorunur.
3. "Ilk sirket taslagi" ve "Sirket acilisi" ayrimi anlatilir.
4. Action Guide'a "nasil baslayacagim" sorulur.

Beklenen sonuc:
- Kurulum checklist'i teknik olmayan dille ilerler.
- Action Guide ilk sirket veya sirket acilisi aksiyonunu onerir.

Demo notu: "+ Ekle taslak olusturur; resmi sonuc doguran islem wizard ile ilerler."

## B. Sirketlerimiz

Rol: Sirket Yoneticisi

Adimlar:
1. EDEN Teknoloji aktif sirket detayini ac.
2. Kilitli resmi alan helper'ini goster.
3. Adres degisikligi operasyonunu anlat.
4. Ankara Subesi ve tesis/unit baglantisini goster.

Beklenen sonuc:
- Aktif sirket normal edit ile resmi alan degistirmez.
- Sube, tesis ve organizasyon baglantilari okunabilir.

## C. Ortaklarimiz

Rol: Sirket Yoneticisi

Adimlar:
1. EDEN ortaklarini ac.
2. %60 + %40 ownership ozetini goster.
3. Sermaye artirimi precheck'ini anlat.
4. Pay devri senaryosunun wizard gerektirdigini goster.

Beklenen sonuc:
- Current ownership %100 gorunur.
- Eksik ownership sirketi data quality uyarisi olarak anlatilabilir.

## D. Temsilcilerimiz

Rol: Sirket Yoneticisi

Adimlar:
1. Aylin Kaya sirket geneli yetkiyi ac.
2. Mert Demir Ankara Subesi banka yetkisini ac.
3. Suresi yaklasan yetki uyarisini goster.
4. Limit degisikligi wizard mantigini anlat.

Beklenen sonuc:
- Temsilci karti ile yetki durumu ayridir.
- Sube bazli scope kullaniciya acik gorunur.

## E. Subeler / Teskilat / Tesis

Rol: Operasyon Kullanicisi

Adimlar:
1. Ankara Subesi detayini ac.
2. Ankara Sube Organizasyonu unit baglantisini goster.
3. Ankara Sube Lokasyonu facility baglantisini goster.
4. Kapali Eski Sube senaryosunu goster.

Beklenen sonuc:
- Sube ayri sirket gibi gorunmez.
- Kapanis etki analizi icin bagli kayitlar anlatilabilir.

## F. Muhasebe / Cari

Rol: Muhasebe Kullanicisi

Adimlar:
1. GlassTech cari kartini ac.
2. Muhtelif Tedarikciler cari kartini ac.
3. Belge aranacak gider hareketini goster.
4. Export/audit davranisini anlat.

Beklenen sonuc:
- Cari bakiye ve belge durumu gorunur.
- Eksik belge teknik hata degil is uyarisi olarak gorunur.

## G. HR

Rol: IK Kullanicisi

Adimlar:
1. Aktif calisan Selin Arman kartini ac.
2. SGK pending Can Yildiz kaydini ac.
3. Eksik/zamani yaklasan belge uyarisini goster.
4. Ise giris/isten cikis import ile degil lifecycle ile anlatilir.

Beklenen sonuc:
- Calisan karti ile istihdam lifecycle ayridir.
- Belge gereksinimi Document domain ile iliskilidir.

## H. Proje / Gorev

Rol: Operasyon Kullanicisi

Adimlar:
1. Eden ERP Pilot Feedback projesini ac.
2. PILOT-1 ve PILOT-2 gorevlerini goster.
3. Action Center'da acik/geciken gorevleri goster.
4. Durum degisikligini rol yetkisiyle anlat.

Beklenen sonuc:
- Gorevler Action Center ve bildirimlerle tutarlidir.

## I. Satis Sonrasi

Rol: Operasyon Kullanicisi

Adimlar:
1. PlaneGuard Edge Gateway urununu ac.
2. PG-2026-0001 kurulu urunu ac.
3. SR-2026-001 servis talebini goster.
4. Tamamlanmis servis kaydi ve foto dokuman iliskisini anlat.

Beklenen sonuc:
- Seri numarali urun global aramada bulunur.
- Servis talebi gorev ve bildirimle baglidir.

## J. CRM / Paydaslar

Rol: Company Manager

Adimlar:
1. GlassTech musteri paydasini ac.
2. Cari kart baglantisini goster.
3. Lead takip gorevini goster.
4. Duplicate kurum adayini Data Quality ekraninda goster.

Beklenen sonuc:
- Master organization ile paydas rolu ayridir.

## K. Belgeler

Rol: IK Kullanicisi veya Sirket Yoneticisi

Adimlar:
1. EDEN ticaret sicil belgesini ac.
2. Ankara sube acilis belgesini pending olarak goster.
3. Can Yildiz sertifika expiry uyarisini goster.
4. Download/preview signed URL mantigini anlat.

Beklenen sonuc:
- Raw storage path kullaniciya sizmaz.
- Belge audit/access log anlatilabilir.

## L. Audit / Reporting / Admin

Rol: Denetci veya Sistem Yoneticisi

Adimlar:
1. Audit timeline'da adres degisikligi ve permission denied kayitlarini ac.
2. Dashboard KPI'larini kontrol et.
3. Admin Console health/outbox ekranini ac.
4. Failed email/outbox retry senaryosunu anlat.

Beklenen sonuc:
- Sistem sagligi ve denetim izleri tek yerden okunur.
- Secret veya raw connection bilgisi gorunmez.

