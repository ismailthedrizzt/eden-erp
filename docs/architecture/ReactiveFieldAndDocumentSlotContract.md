# Reactive Field and Document Slot Contract

Eden ERP'de otomatik alan doldurma davranisi component icinde gizli bir yan etki olarak yazilmaz.
Bu davranis sadece ilgili form contract'i `reactiveFields` ile tanimliyorsa calisir.

## Kurallar

- Normal input, select, uploader ve belge slotlari kendi standart davranisini korur.
- Bir alan veya dokuman slotu baska alanlari dolduracaksa `EdenReactiveFieldContract` kaydi zorunludur.
- Contract; kaynak alan/slot, tetikleyici olay, doldurulacak alanlar, tamamlama kurali ve badge davranisini tanimlar.
- Zorunlu alanlar `validationUi.className = "eden-required-field"` ile kirmizi bos / yesil dolu standardina baglanir.
- Reactive alanlar `validationBadge` ile kullaniciya "Otomatik", "Alanlari Doldurur" gibi kontrollu badge gosterebilir.
- Sayfa kodu reactive davranis icin contract'i okumali; slot id veya alan listesini lokal hard-code etmemelidir.

## Ornek

`Temalarimiz` formunda `theme-json-export` belge slotu:

- tema JSON dosyasini otomatik uretir,
- gecerli Eden Theme JSON yuklenirse formun tema alanlarini hydrate eder,
- generated export belgelerini yeniden uretir,
- bu davranisi `themeManagementFormContract.reactiveFields` uzerinden ilan eder.

Bu standardin amaci, otomasyonlu alanlar ile normal alanlarin davranisini ayirmak ve frontend standardizasyonunun guard seviyesinde korunmasidir.
