# Eden ERP Platform Architecture

Eden ERP, modul sozlesmeleri, projection read model'lari ve operation orchestrator'lari uzerinden asamali olarak modular ERP platformuna donusur.

## Sorumluluk Ayrimi

- Module Registry: Modulun sistemde ne getirdigini tanimlar. Entity, route, menu, permission, action, projection ve event sozlesmesi statiktir.
- Feature Resolver: Modulun bu tenant/user icin aktif olup olmadigini belirler. Lisans, kurulum ve dependency durumlari burada cozulur.
- Permission Registry: Hangi permission anahtarlarinin var oldugunu ve fallback iliskilerini tanimlar.
- Permission Guard: `requirePermission` ile mevcut basit kontrolu, `requireAnyPermission` ile fallback destekli kontrolu saglar.
- Policy Engine: Permission, scope, modul durumu, kayit durumu ve is kuralini tek karar modelinde birlestirir.
- Scope Policy: Company, branch, organization unit ve facility erisim/yazma kapsamlarini merkezi kontrol eder.
- Process Engine: Islemin adimlarini, durum gecislerini ve onay akisini yonetecek katmandir.
- Operation Orchestrator: Kritik veri degisikligini tek is mantigi noktasi olarak guvenli yapar.
- Projection Registry: Liste, detay ve ozet ekranlari icin read model sozlesmesini saglar.
- Field Control Registry: Alanlarin normal form edit, taslak edit, resmi operation, sistem/projection veya iliski endpointi ile mi degisecegini tanimlar.
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

## Permission ve Policy

Permission katmani iki seviyeli calisir. `requirePermission` mevcut basit izin kontrolunu korur. `requireAnyPermission`, Permission Registry fallbacklerini degerlendirerek `branches.opening.start` yoksa `companies.edit` gibi uyumlu izinlerle gecis saglayabilir.

Policy Engine sadece permission'a bakmaz. Access Context uzerinden tenant, company, branch, organization unit, facility, module, action ve record status bilgisini birlikte degerlendirir. Bu sayede Process Engine ileride "bu adimi kim yapabilir?" sorusunu ayni karar modeliyle cevaplayabilir.

## Field Control

Field Control Registry, kart formu ile resmi islem/wizard ayrimini alan seviyesinde standartlastirir. Aktif veya lifecycle'a girmis kayitlarda `company.trade_name`, `company.address`, `company_partner.share_ratio`, `company_representative.authority_types` ve `company_branch.opening_registration_date` gibi alanlar normal PATCH ile degil ilgili operasyonla degisir.

Backend PATCH guard'lari ve frontend EntityForm lock aciklamalari ayni registry'den beslenmeye baslar. EntityForm kilitli alanlari sessizce kapatmaz; bilgi ikonu ile nedeni, dogru wizard/operation yolunu, yetki/modul/kayit durumu engelini ve opsiyonel modul uyarilarini gosterir. `suggestOperationForField` fonksiyonu Action Guide'in ileride "bu alan hangi islemle degisir?" sorusunu cevaplamasi icin alan -> operasyon eslemesini saglar.

Modul bagimli operasyonlar backend'de de enforce edilir. Ornegin Sermaye Artirimi, Ortaklarimiz modulu ve `currentOwnership` dagilimi olmadan baslatilamaz; precheck bu durumda `MODULE_DEPENDENCY_MISSING` ile is diliyle hata dondurur.

## Sonraki Fazlar

Process Engine ve Outbox Dispatcher sonraki fazlarda bu foundation uzerine baglanacak. Registry, resolver, policy ve field-control yapilari statik contract'lari, runtime module bilgisini ve mevcut lisans altyapisiyla uyumlulugu saglar.
