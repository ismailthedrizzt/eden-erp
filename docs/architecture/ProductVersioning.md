# Product Versioning

<!-- source-of-truth-standard: contract overrides markdown -->

Eden ERP'de eski `Geliştirilmekte / Yakında` rozetleri, ürün takibi için fazla statikti. Yeni yapı ürün, modül ve sayfa olgunluğunu tek merkezden yönetir ve menüde görünen bilgiyi ürün manifestine bağlar.

Merkezi dosya:

```txt
lib/product/versionManifest.ts
```

## Versiyon Seviyeleri

Product, module ve page seviyeleri ayrı anlam taşır:

- Product version: ERP ürününün roadmap aşamasını gösterir.
- Module version: Modül altındaki çekirdek sayfaların toplam olgunluğunu temsil eder.
- Page version: Bir sayfanın CRUD, lifecycle, işlem, bağlı modül dayanıklılığı ve küçük firma kullanımına hazır olma seviyesini gösterir.

Modül versiyonu ilk aşamada manifest içinde elle tanımlanır. İleride sayfa versiyonlarından hesaplama yapılabilir; bu karar lisans, tenant veya CRUD davranışını değiştirmez.

## Maturity Değerleri

- `planned`: Planlandı
- `dev`: Geliştiriliyor
- `alpha`: Temel ekran var, eksikler var
- `beta`: Kullanılabilir, test ediliyor
- `stable`: Kullanıma hazır
- `deprecated`: Kaldırılacak / değiştirilecek

## Roadmap Stage Değerleri

- `small_business_core`: Küçük Firma Çekirdeği
- `medium_business`: Orta Ölçekli Firma
- `large_business`: Büyük Firma
- `enterprise`: Enterprise

## Ürün Sürüm Mantığı

- `v0.x.x`: Küçük firma çekirdeği geliştirme dönemi
- `v1.0.0`: Küçük firma stable sürümü
- `v2.0.0`: Orta ölçekli firma stable sürümü
- `v3.0.0`: Büyük firma stable sürümü
- `v4.0.0`: Enterprise stable sürümü

## Gösterim Prensibi

Sidebar modül başlıklarında manifestten gelen kompakt versiyon rozeti gösterilir. Örnek: `v0.4-alpha`, `v0.2-dev`, `planned`.

Sidebar alt sayfalarında aynı manifestteki sayfa bilgisi küçük rozet olarak gösterilir. Collapsed durumda modül versiyonu `title`/tooltip metninde yer alır.

Üst layout üzerinde `ProductVersionBadge` bileşeni genel ERP sürümünü gösterir. Başlık metni ürün adı, sürüm, maturity ve roadmap stage bilgisini taşır.

## Kapsam

Bu sistem yalnızca görünürlük ve ürün olgunluğu bilgisini yönetir. Sayfa CRUD akışları, lifecycle kuralları, yetki kontrolleri, tenant seçimi, modül lisansları ve production ortamında inactive module hide mantığı bu manifest tarafından değiştirilmez.
