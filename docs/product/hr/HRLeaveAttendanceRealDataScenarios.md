# HR Leave Attendance Real Data Scenarios

<!-- source-of-truth-standard: contract overrides markdown -->

## Scenario 1 - Yillik Izin Talebi

1. Aktif calisan icin yillik izin bakiyesi bulunur.
2. Calisan yillik izin talebi olusturur.
3. Talep onay bekler.
4. Yonetici onaylar.
5. Bakiye `used_days` artisi ve `remaining_days` dususuyle guncellenir.

## Scenario 2 - Belge Gerektiren Hastalik Izni

1. Hastalik izni `requires_document = true` olarak tanimlidir.
2. Belgesiz talep gonderim/onay asamasinda uyari veya blok alir.
3. Belge yuklenir ve `document_id` baglanir.
4. Talep onaylanir ve attendance `sick_leave` olur.

## Scenario 3 - Cakisan Izin

1. Calisan 10-12 Haziran icin izin talebi gonderir.
2. Ayni tarih araligina ikinci active/pending talep denenir.
3. Sistem `LEAVE_REQUEST_OVERLAP` ile engeller.

## Scenario 4 - Devamsizlik Kaydi

1. Aktif calisan icin `absent` attendance kaydi girilir.
2. Kayit dashboard'da devamsizlik KPI'ina yansir.
3. Puantaj hesaplandiginda absent day satira aktarilir.

## Scenario 5 - Fazla Mesai

1. Calisma planinda gunluk 7.5 saat planlanir.
2. Attendance fiili saat 9.0 olarak girilir.
3. `overtime_hours = 1.5` hesaplanir.
4. Puantajda fazla mesai toplaminda gorunur.

## Scenario 6 - Puantaj Donemi

1. Mayis 2026 donemi olusturulur.
2. Attendance ve approved leave verisi hesaplanir.
3. HR donemi onaylar.
4. Donem `locked` yapilir.

## Scenario 7 - Bordro Hazirlik

1. Approved veya locked puantaj donemi secilir.
2. Payroll prep satirlari uretilir.
3. Ekran calisilan gun, izin, ucretsiz izin, devamsizlik ve fazla mesaiyi gosterir.
4. Bordro tutari, vergi, SGK ve banka odemesi uretilmez.

## Scenario 8 - Isten Cikmis Calisan

1. `employment_status = terminated` calisan icin izin talebi denenir.
2. Sistem talebi `HR_EMPLOYEE_NOT_ACTIVE` ile engeller.

## Scenario 9 - Locked Puantaj Uyarisi

1. Puantaj donemi locked durumdadir.
2. Ayni tarih araligina attendance veya approved leave etkisi yaratacak degisiklik denenir.
3. Sistem sessiz mutasyon yapmak yerine conflict/uyari dondurur.
