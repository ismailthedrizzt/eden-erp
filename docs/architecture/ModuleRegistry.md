# Module Registry

Module Registry, Eden ERP icindeki modullerin statik sozlesmesini tutar. Bir modulun hangi entity, route, menu, permission, action, projection ve event sozlesmelerini getirdigi burada tanimlanir.

Registry runtime karar vermez. Runtime kararlar `ModuleFeatureResolver` tarafindadir.

## Katmanlar

- Module Registry: Modulun sistemde ne getirdigini tanimlar.
- Feature Resolver: Modulun bu tenant/user icin aktif, lisansli ve kurulumu tamam olup olmadigini belirler.
- Permission Registry: Kullanicinin ne yapabilecegini belirler.
- Process Engine: Islemin adimlarini ve surec durumlarini yonetecek katmandir.
- Operation Orchestrator: Kritik veri degisikligini guvenli ve idempotent sekilde yapar.
- Projection Registry: Liste ve ozetler icin read model sozlesmesini saglar.
- Action Guide Registry: Kullanici niyetini dogru islem yoluna baglar.

## Ilk Contract Seti

Ilk fazda statik contract dosyalari `lib/modules/contracts` altinda tutulur:

- `companies`
- `partners`
- `representatives`
- `branches`
- `organization`
- `facilities`
- `accounting`
- `hr`
- `project_management`
- `product_services`
- `after_sales`
- `settings`

Bu contract'lar `lib/modules/moduleRegistry.ts` tarafindan tek registry listesine baglanir.

## Dependency Resolver

`lib/modules/moduleDependencyResolver.ts` required ve optional bagimliliklari cozer.

Ornek:

- `branches`, `companies` modulu olmadan calisamaz.
- `branches`, `organization` ve `facilities` olmadan calisabilir; fakat sube acilisinda otomatik organizasyon/tesis baglantisi icin uyari uretir.
- `representatives`, `branches` olmadan kapanmaz; branch scoped authority icin uyari uretir.

## Feature Resolver

`lib/modules/moduleFeatureResolver.ts` mevcut lisans/ayar verisiyle uyumlu calisir. Runtime sonuc:

```ts
{
  moduleKey: string
  enabled: boolean
  licensed: boolean
  setupComplete: boolean
  status: 'available' | 'disabled' | 'unlicensed' | 'setup_required' | 'dependency_missing'
  blocking_reasons: string[]
  warnings: string[]
}
```

Runtime veri bulunamazsa `defaultEnabled` kullanilir. Setup bilgisi yoksa mevcut akisi bozmamak icin kurulum tamam kabul edilir.

## Guard Stratejisi

`lib/modules/moduleGuards.ts` API route'lari icin standart is dili response'u uretir. Teknik hata yerine modul durumu aciklanir:

```json
{
  "error": "Subelerimiz modulu bu calisma alaninda aktif degil.",
  "code": "MODULE_DISABLED",
  "details": {
    "moduleKey": "branches",
    "status": "disabled"
  }
}
```

Ilk entegrasyon branch list/card ve branch opening/closing resmi islem route'larinda yapildi.

## Session ve UI

`/api/session/bootstrap` response'una `modules` alani eklendi. Client `ModuleProvider` bu veriyi legacy `moduleStore` davranisini bozmadan runtime module bilgisine donusturur.

Sidebar simdilik compatibility mapping kullanir. Menu item'lari `moduleKey` ile contract module key'e eslenebilir; ileride menu tamamen `ModuleContract.menus` alanindan uretilebilir.

## Action Guide Hazirligi

Action Guide, `findActionContract` ile action'in hangi module ait oldugunu bulabilir. Modul disabled veya unlicensed ise action onerilmez. Setup veya dependency eksigi varsa action gorunebilir, ancak `can_start_now` false doner ve blocking reason verir.

## Projection Hazirligi

`ModuleContract.projections` alanlari Projection Registry key'leriyle uyumlu olacak sekilde tutulur. Eksik projection key build'i kirmadan warning uretir; boylece registry asamali genisletilebilir.
