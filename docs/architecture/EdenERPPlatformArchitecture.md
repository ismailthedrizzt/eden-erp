# Eden ERP Platform Architecture

Eden ERP, modul sozlesmeleri, projection read model'lari ve operation orchestrator'lari uzerinden asamali olarak modular ERP platformuna donusur.

## Sorumluluk Ayrimi

- Module Registry: Modulun sistemde ne getirdigini tanimlar. Entity, route, menu, permission, action, projection ve event sozlesmesi statiktir.
- Feature Resolver: Modulun bu tenant/user icin aktif olup olmadigini belirler. Lisans, kurulum ve dependency durumlari burada cozulur.
- Permission Registry: Kullanici izinlerini degerlendirir. Modul aktif olsa bile action baslatma yetkisi ayrica kontrol edilir.
- Process Engine: Islemin adimlarini, durum gecislerini ve onay akisini yonetecek katmandir.
- Operation Orchestrator: Kritik veri degisikligini tek is mantigi noktasi olarak guvenli yapar.
- Projection Registry: Liste, detay ve ozet ekranlari icin read model sozlesmesini saglar.
- Action Guide Registry: Kullanici niyetini dogru modul/action/route/wizard yoluna baglar.

## Mevcut Akis

Frontend dogrudan Supabase cagirmadan service ve API katmanina gider. API tenant scope, permission check, concurrency ve idempotency kurallarini korur. Kritik resmi islemler operation/wizard akisi ve orchestrator katmaniyla calisir.

## Registry Iliskisi

Module Registry, Projection Registry ve Action Guide arasinda ortak sozlesme kaynagi olacak sekilde tasarlanmistir.

- Module contract action key'leri Action Guide adaylarini filtreler.
- Module contract projection key'leri read model sozlesmesiyle eslenir.
- Module contract route/menu bilgileri ileride Sidebar ve navigation uretiminde kullanilir.
- Module contract event bilgisi ileride Outbox Dispatcher ve projection refresh surecleriyle baglanabilir.

## Runtime Karar

Runtime modul durumu `ModuleFeatureResolver` tarafindan belirlenir:

- `available`: Modul kullanilabilir.
- `disabled`: Modul bu calisma alaninda aktif degil.
- `unlicensed`: Modul icin lisans aktif degil.
- `setup_required`: Modul acik ancak kurulum tamamlanmamis.
- `dependency_missing`: Zorunlu bagimli modul eksik.

Bu durum API guard, session bootstrap, Sidebar ve Action Guide tarafinda ayni is diliyle kullanilir.

## Sonraki Fazlar

Process Engine, Policy Engine ve Outbox Dispatcher sonraki fazlarda bu foundation uzerine baglanacak. Bu fazda registry ve resolver yapisi statik contract'lari, runtime module bilgisini ve mevcut lisans altyapisiyla uyumlulugu saglar.
