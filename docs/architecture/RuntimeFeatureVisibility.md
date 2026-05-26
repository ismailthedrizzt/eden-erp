# Runtime Feature Visibility

Runtime Feature Visibility, Eden ERP'de bir modulun, sayfanin veya islemin kullaniciya nasil gosterilecegini tek yerden kararlastirir.

## Sorumluluklar

- Modul aktif mi?
- Modul lisans kapsaminda mi?
- Modul kurulumu tamam mi?
- Gerekli bagimli moduller aktif mi?
- Ozellik bayragi acik mi?
- Kullanicinin gerekli yetkisi var mi?
- Kayit durumu isleme uygun mu?

Bu kontrollerin sonucunda UI icin `VisibilityDecision` uretilir: `visible`, `enabled`, `status`, `reason`, `warnings` ve gerekiyorsa setup/lisans yonlendirmesi.

## Kullanici Dili

Teknik durumlar kullaniciya is diliyle anlatilir:

- `disabled`: "Bu modul calisma alaninizda aktif degil."
- `unlicensed`: "Bu modul lisansinizda bulunmuyor."
- `setup_required`: "Bu modulun kurulumu tamamlanmamis."
- `dependency_missing`: "Bu islem icin gerekli modul aktif degil."
- `permission_denied`: "Bu islem icin yetkiniz bulunmuyor."
- `record_status_blocked`: "Bu islem mevcut kayit durumunda baslatilamaz."

## Iliski

- Module Contract, modulun sistemde ne getirdigini tanimlar.
- Module Runtime Status, modulun aktif/lisansli/kuruluma hazir olup olmadigini belirtir.
- Visibility Resolver, UI'da gorunsun mu ve aktif mi kararini verir.
- Action Eligibility, bir islemin gercekten baslatilip baslatilamayacagini daha ayrintili policy ile degerlendirir.
- Feature Flags, modul icindeki ozelliklerin acilip kapatilmasini standartlastirir.

## Ortak Kullanim

`resolveActionRuntimeAvailability` ayni karari Action Guide, operation button'lari, field helper'lari ve ileride quick action alanlari icin paylastirir. Bu sayede ayni islem bir yerde aktif, baska yerde baslatilamaz gorunmez.
