# Runtime Feature Visibility

Runtime Feature Visibility, Eden ERP'de bir modulun, sayfanin veya islemin kullaniciya nasil gosterilecegini tek yerden kararlastirir.

## Kanonik Model

Environment-based development/release visibility modeli deprecated durumdadir.
Ortam degiskenleri, Node runtime modu veya database target kullaniciya modul ya
da ozellik acmak icin ana karar kaynagi olamaz.

Kullaniciya gorunen runtime karar sirasi:

1. Release registry readiness.
2. Tenant license / plan entitlement.
3. Feature flag.
4. Permission / role.
5. Company / branch scope.

Development/internal yuzeyler sadece deployment environment ile acilmaz. Tenant
`development` plani veya ilgili lisans entitlement'i tasimali, kullanici da
gerekli role/permission kosullarini saglamalidir. Normal musteri tenant'lari
sadece release-ready ve lisans kapsamindaki modul/ozellikleri gorur.

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
