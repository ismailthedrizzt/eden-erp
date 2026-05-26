# Module Config Contract

ERP ekranlari varsayilan olarak bir ana entity etrafinda calisan standart liste ve standart form sablonlarini kullanir. Bu bire bir "her sayfa tek tablo" kurali degildir; ana tablo, iliskili tablolar, detay sekmeleri, uploader slotlari, aksiyonlar ve lifecycle kararlarini tek bir module config sozlesmesinde toplar.

## Ana Ilke

Her alt modul icin bir `ModuleConfig` tanimlanir:

- `entity`: Ana tabloyu, primary key'i, API path'ini ve iliskili tablolari tanimlar.
- `list`: `SmartDataTable` kolonlarini, arama/siralama varsayimlarini, bos durum metnini ve liste davranisini tanimlar.
- `form`: Standart `EntityForm` sablonunun hero alanini, medya slotlarini, detay tablarini, aksiyonlarini ve save lifecycle'ini tanimlar.
- `permissions`: Modulu goruntuleme, ekleme, guncelleme ve silme izin anahtarlarini tanimlar.
- `workflows`: Ileride onay sureci veya taslak akisina baglanacak workflow anahtarini tutar.

## Form Sablonu

Standart form sabittir:

1. Ustte hero section vardir.
2. Hero solunda image/document slot uploader alani vardir.
3. Hero saginda zorunlu ve temel alanlar vardir.
4. Hero altinda standart form aksiyonlari vardir.
5. Alt bolumde opsiyonel detay tablari vardir.
6. Veritabani hata, bilgi, loading ve basari mesajlari lifecycle sozlesmesinden beslenir.

Modul ozel ihtiyaclari sablonu degistirmez; config uzerinden alan, relation tab, custom tab, custom action veya lifecycle hook olarak eklenir.

## Form Islem Gruplari

Form uzerindeki islem aksiyonlari standart olarak is amacina gore gruplanir:

- `lifecycle`: Kaydin yasam durumunu degistiren islemler. Ornek: sirket acilisi, tasfiye, terkin, ise giris, isten cikis.
- `update`: Aktif kaydin resmi/tescil verilerini degistiren islemler. Ornek: sermaye artirimi, adres degisikligi, unvan degisikligi, ortaklik degisikligi.
- `other`: Bagli sayfa, gecmis, hareket goruntuleme gibi lifecycle veya kontrollu guncelleme olmayan islemler.

`FormActionConfig.category` bu ayrimi tasir. Sayfa seviyesinde dinamik uretilen aksiyonlar `EntityForm.operationActions` ile ayni kategori modeline baglanir.

Bu islemlere tabi alanlar `FormField.controlledByOperation` ile isaretlenir. Standart form bu alanlari edit modunda manuel degisiklige kapatir ve alan etiketinde "Bu alan tescil islemleriyle degistirilebilir. Islemler: ..." aciklamasini gosteren bilgi ikonunu basar.

## Ilk Uygulama

Personel modulunun config'i:

```txt
lib/modules/personel.config.tsx
```

Sozlesme tipleri ve adapter yardimcilari:

```txt
types/module-config.ts
```

Yeni modul eklerken once ilgili modul config'i olusturulacak, sonra liste ve form sayfasi bu config'i okuyacak. Boylece standart sayfa davranisi korunurken tablo/iliski farklari config seviyesinde cozulecek.

## Module Registry ile Iliski

`ModuleConfig`, bir entity ekraninin liste/form davranisini tanimlar. `ModuleContract` ise daha ust seviyede modulun platforma ne getirdigini tanimlar:

- entity ve lifecycle sozlesmesi
- page/api route sozlesmesi
- menu sozlesmesi
- permission ve fallback permission sozlesmesi
- action/wizard sozlesmesi
- projection ve event sozlesmesi
- module dependency sozlesmesi

Bu ayrim korunur. `ModuleConfig` SmartDataTable/EntityForm detaylarini tasirken, `ModuleRegistry` modulun lisans, kurulum, dependency, permission, projection ve action guide baglantilarina kaynak olur.

Runtime durum `ModuleFeatureResolver` ile cozulur. Bir modul kapali, lisanssiz veya kurulumu eksikse API guard ve UI teknik hata yerine is diliyle aciklama gosterir.
