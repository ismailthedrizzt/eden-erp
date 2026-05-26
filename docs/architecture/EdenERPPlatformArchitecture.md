# Eden ERP Platform Architecture

Eden ERP, modul sozlesmeleri, projection read model'lari ve operation orchestrator'lari uzerinden asamali olarak modular ERP platformuna donusur.

## Sorumluluk Ayrimi

- Module Registry: Modulun sistemde ne getirdigini tanimlar. Entity, route, menu, permission, action, projection ve event sozlesmesi statiktir.
- Feature Resolver: Modulun bu tenant/user icin aktif olup olmadigini belirler. Lisans, kurulum ve dependency durumlari burada cozulur.
- Permission Registry: Hangi permission anahtarlarinin var oldugunu ve fallback iliskilerini tanimlar.
- Permission Guard: `requirePermission` ile mevcut basit kontrolu, `requireAnyPermission` ile fallback destekli kontrolu saglar.
- Policy Engine: Permission, scope, modul durumu, kayit durumu ve is kuralini tek karar modelinde birlestirir.
- Scope Policy: Company, branch, organization unit ve facility erisim/yazma kapsamlarini merkezi kontrol eder.
- Process Engine: Islemin adimlarini, gorevlerini, onaylarini ve durum gecislerini yoneten katmandir.
- Operation Orchestrator: Kritik veri degisikligini tek is mantigi noktasi olarak guvenli yapar.
- Event Contract Registry: Event tiplerinin version, modul, aggregate, projection, audit, notification ve AI context etkisini tanimlar.
- OutboxEventService: Operation ve process sonuclarini standart outbox event kaydi olarak uretir.
- Outbox Dispatcher: Pending eventleri lock/retry/idempotency kurallariyla isler ve handler katmanina aktarir.
- Event Handler: Projection invalidation, notification, audit ve AI context refresh gibi yan etkileri uygular.
- Projection Registry: Liste, detay ve ozet ekranlari icin read model sozlesmesini saglar.
- Field Control Registry: Alanlarin normal form edit, taslak edit, resmi operation, sistem/projection veya iliski endpointi ile mi degisecegini tanimlar.
- Action Guide Registry: Kullanici niyetini dogru modul/action/route/wizard yoluna baglar; yeni islem uydurmaz.

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

## Process Engine MVP

Process Engine MVP, `ProcessDefinition`, `ProcessInstance`, `ProcessTask`, `ProcessApproval` ve `ProcessEvent` kavramlarini platforma ekler. Wizard kullanicidan veriyi toplar; Process Engine adimi ve gorevi yonetir; Operation Orchestrator gercek veri degisikligini yapar.

Pilot surecler `company_branch_opening_process` ve `company_branch_closing_process` olarak tanimlandi. Bu surecler mevcut Sube Acilisi/Kapanisi wizard'larini bozmaz; istenirse process instance olusturup form, inceleme, onay ve operation adimlarini takip edebilir.

Pending Actions altyapisi `process_tasks` kayitlarini okuyabilecek hale gelir. Boylece surec gorevleri mevcut bildirim alanina asamali olarak eklenebilir.

## Event ve Outbox

Event Contract Registry `lib/events` altinda event sozlesmelerini merkezi hale getirir. `company.branch_opened`, `company.branch_closed`, `ownership.transaction_completed`, `representative.authority_updated` ve `process.task_created` gibi eventler projection, notification, audit ve AI context etkilerini contract uzerinden tasir.

OutboxEventService eski enqueue imzasini korur; eksik `event_version`, `module_key`, `aggregate_type` gibi alanlari registry'den tamamlar. Dispatcher `outbox_events` kayitlarini `pending -> processing -> completed/failed/skipped` akisi ile isler. Handlerlar idempotent calisir ve `outbox_event_handler_runs` tablosu tekrar calistirma guvenligi icin hazirdir.

Cron endpoint `CRON_SECRET` olmadan calismaz. Projection/cache altyapisi eksikse invalidation handler no-op doner; event dispatch kullanici akisini kirmaz.

## AI Islem Rehberi

Action Guide Registry, kullanicinin "Ne yapmak istiyorsunuz?" sorusuna verdigi dogal dil cevabini tanimli action sozlesmelerine esler. MVP deterministik matcher kullanir; Module Registry ve Action Guide Registry disinda action uretmez.

Rehber veri degistirmez. Sadece dogru sayfa, kayit ve wizard yolunu onerir. Veri degistiren her adim yine ilgili wizard icinde kullanici onayiyla tamamlanir.

Eligibility sonucu modul, permission, kayit statusu, optional modul uyarilari ve Policy Engine kararini kullanir. Field Control Registry ile "bu alan neden kapali?" sorulari ilgili resmi isleme baglanabilir.

## Sonraki Fazlar

Outbox Dispatcher ileride notification UI, server cache invalidation, audit gorunumleri ve AI context refresh kuyruklariyla derinlestirilecek. Action Guide ileride LLM destekli aciklama uretebilir; ancak secim yine registry actionlariyla sinirli kalir. Registry, resolver, policy, field-control, process ve event yapilari statik contract'lari, runtime module bilgisini ve mevcut lisans altyapisiyla uyumlulugu saglar.
