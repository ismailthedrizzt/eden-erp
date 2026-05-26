# Module Readiness and Setup

Module Readiness, bir modulun acik olmasindan daha ileri bir kontrol yapar. Modul lisansli ve aktif olabilir; ancak gerekli kayit alanlari, read model gorunumleri, ayarlar veya bagli moduller hazir degilse kullanici teknik hata gormeden kurulum ekranina yonlendirilir.

## Kavramlar

- Module Contract: Modulun sisteme hangi entity, route, action, permission, projection ve event sozlesmesini getirdigini tanimlar.
- Module Runtime Status: Modulun bu calisma alaninda aktif, lisansli ve temel olarak kullanilabilir olup olmadigini belirler.
- Module Readiness: Modulun gerekli altyapisi, ayarlari ve bagimli modulleri hazir mi sorusunu cevaplar.
- Setup Wizard: Eksikleri is diliyle gosterir ve kullaniciyi dogru kurulum adimina yonlendirir.
- Module Guard: Route veya action baslamadan once modul runtime ve readiness durumunu birlikte kontrol eder.

## Readiness Contract

Her modul `lib/setup/moduleReadinessRegistry.ts` icinde su sozlesmeyle tanimlanabilir:

- requiredTables: Modulun calismasi icin zorunlu kayit alanlari.
- optionalTables: Eksikse ana akisi bozmayacak ek alanlar.
- requiredViews: Liste, ozet veya karar akisi icin zorunlu read model gorunumleri.
- optionalViews: Eksikse fallback ile calisabilecek gorunumler.
- requiredRpcs: Atomik operasyon icin zorunlu islem altyapilari.
- optionalRpcs: Varsa kullanilacak, yoksa application fallback'e dusecek islem altyapilari.
- requiredSettings: Modulun baslangic ayarlari.
- requiredDependencies: Modulun calismasi icin acik ve hazir olmasi gereken moduller.
- optionalDependencies: Eksikse kullaniciya uyari verilecek baglantili moduller.
- setupSteps: Kullaniciya gosterilecek kurulum adimlari.

## Status Modeli

- ready: Modul kullanima hazir.
- setup_required: Modul acik ama ayar veya kurulum adimi gerekli.
- dependency_missing: Gerekli modul aktif veya hazir degil.
- infrastructure_missing: Modul kurulumu tamamlanmamis.
- disabled: Modul bu calisma alaninda aktif degil.
- unlicensed: Modul icin lisans aktif degil.

Kullanici arayuzunde teknik tablo, SQL, RPC veya migration ifadeleri gosterilmez. Ornegin `company_branches` eksikse mesaj "Subelerimiz modulunun kurulumu tamamlanmamis." olur.

## Entegrasyon Noktalari

- Session bootstrap `setup` ozeti dondurur.
- Module Guard setup eksiginde `MODULE_SETUP_REQUIRED` veya `MODULE_DEPENDENCY_MISSING` dondurur.
- Action Guide, modul hazir degilse action'i baslatilabilir gostermez ve kurulum ekranina yonlendirir.
- Setup page, calisma alani hazirlik paneliyle modul kartlarini, uyarilari ve onerilen aksiyonlari gosterir.
- Missing infrastructure mapper teknik hatalari kurulum durumuna cevirir.

## Baslangic Modulleri

- companies: Sirket kayitlari ve varsayilan para birimi/dil ayarlari.
- partners: Ortak kartlari, ortaklik islemleri ve guncel ortaklik dagilimi.
- representatives: Temsilci kartlari ve temsil yetkisi islemleri.
- branches: Sube kayitlari, resmi degisiklik islem kayitlari ve branch list read modeli.
- organization: Organizasyon birimleri ve tipleri.
- facilities: Tesis/lokasyon kayitlari.
- process: Surec, gorev, onay ve surec olay kayitlari.
- audit: Denetim izi kayitlari.
- outbox: Sistem olay kayitlari.

## Kullanici Dili

Kullaniciya "tenant" yerine "calisma alani", "table/view missing" yerine "modul kurulumu tamamlanmamis", "dependency missing" yerine "bu islem icin gerekli modul aktif degil", "setup required" yerine "kurulum gerekli" denir.
