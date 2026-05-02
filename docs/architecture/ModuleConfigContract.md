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
