# Modular Navigation

<!-- source-of-truth-standard: contract overrides markdown -->

Modular Navigation, Eden ERP menulerinin Module Registry ve runtime visibility kararlarina baglanmasi icin hazirlanan merkezi sozlesmedir.

## Navigation Registry

`lib/navigation/navigationRegistry.ts` ana menu itemlarini `NavigationItem` olarak tanimlar:

- `key`
- `label`
- `path`
- `moduleKey`
- `permission`
- `fallbackPermission`
- `featureFlag`
- `parentKey`

Mevcut Sidebar hardcoded menuyu korur, ancak route ve modul eslesmelerini Navigation Registry ile zenginlestirir. Bu gecis, mevcut route'lari bozmadan asamali merkezi navigasyona gecmeyi saglar.

## Sidebar Davranisi

Sidebar artik modulu sadece gizlemek yerine runtime karariyla sunar:

- Hazir modul aktif gorunur.
- Kurulumu eksik modul disabled gorunur ve kurulum ekranina yonlendirebilir.
- Lisanssiz modul disabled gorunur ve modul lisanslari ekranina yonlendirebilir.
- Bagimli modul eksikse kullaniciya gerekli modulun aktif olmadigi aciklanir.
- Yetki yoksa menu veya aksiyon aciklayici sekilde disabled kalabilir.

## Ortak Ilke

Menu, operation button, field helper ve AI Islem Rehberi farkli karar motorlari gibi davranmamalidir. Ortak visibility resolver ayni module/license/setup/permission/status bilgisini kullanir.

## Kullanici Dili

Navigasyon katmani teknik terim gostermez. "Tablo eksik", "migration yok", "runtime disabled" gibi mesajlar kullaniciya cikmaz. Bunun yerine "Bu modulun kurulumu tamamlanmamis" veya "Bu modul lisansinizda bulunmuyor" gibi is dili kullanilir.
