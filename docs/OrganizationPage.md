# Teşkilat ve Kadro Sayfası

## Amaç

Teşkilat ve Kadro sayfası şirketin iç organizasyon yapısını, birim hiyerarşisini ve norm kadro yönetimini tek ekranda toplar.

Bu modül yalnızca iç şirket yapısı içindir. Bayiler, distribütörler, dış partnerler ve harici şirketler Paydaşlar modülünde yönetilir.

## Sayfa Mimarisi

Sayfa Eden ERP global desenini kullanır:

- `PageBanner`
- Hiyerarşik `SmartDataTable`
- Hero + Tabs form
- Sağ taraf Kadro overlay
- SmartList aksiyonları
- History tracking
- Soft delete

Liste görünümü navigasyon katmanıdır. Sağ overlay hızlı operasyon içindir. Form tam yönetim içindir.

## Ana Aksiyonlar

PageBanner ve üst işlem çubuğu:

- Yeni Birim Ekle
- Yeni Kadro Ekle
- Şema Görünümü
- Excel Aktar
- Filtreler / arama

## Hiyerarşik Liste

Liste birimleri tree grid mantığıyla gösterir:

```text
Şirket
 ├── Genel Müdürlük
 ├── Finans Direktörlüğü
 │    ├── Muhasebe Müdürlüğü
 │    └── Finansal Kontrol
 └── Operasyon
```

Expand/collapse desteklenir. Arama birim adı, kod, tip, üst birim ve yerleşke üzerinden çalışır.

## SmartList Kolonları

- Birim Adı
- Tip
- Üst Birim
- Kadro
- Çalışan
- Boş
- Yerleşke
- Durum
- İşlemler

İşlemler:

- Görüntüle
- Düzenle
- Kadro
- Alt Birim Ekle
- Pasifleştir
- Geçmiş

## Kadro Overlay

`Kadro` aksiyonu sağ panel açar. Kullanıcı tree içinde hızlı gezip birimin kadrosunu açıp kapatabilir.

Overlay içeriği:

- Birim adı
- Açık pozisyon sayısı
- Dolu pozisyon sayısı
- Norm istatistikleri
- Quick Add Position
- Pozisyon listesi
- İstatistik kartları

Bu desen operasyonel hız için önerilen ana UX’tir.

## Form Sekmeleri

Birim formu Hero + Tabs tasarımını kullanır.

Hero alanları:

- Birim Adı
- Birim Kısa Adı
- Birim Tipi
- Üst Birim
- Bağlı Şirket
- Durum
- Kuruluş Tarihi
- Kod
- Yerleşke

Sekmeler:

- Genel
- Kadro
- Yetkiler
- Lokasyon
- Bütçe
- Belgeler
- Notlar
- Geçmiş

## Soft Delete

Birim ve kadro kayıtları fiziksel silinmez. Kullanılan durumlar:

- Pasifleştir
- Kapatıldı
- Birleştirildi
- Taşındı

Kayıt üzerinde `is_deleted`, `deleted_at`, `deleted_by` tutulur.
