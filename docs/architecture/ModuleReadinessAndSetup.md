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
- accounting: Cari kartlar, cari hareketler, belge/mutabakat hazirligi ve sermaye odeme/tahsilat mutabakati.
- hr: Calisan kartlari, istihdam kayitlari, istihdam lifecycle transaction'lari ve ozluk belge referanslari.
- project_management: Proje kartlari, proje gorevleri, yorum/ek referanslari ve Action Center project task kaynagi.
- process: Surec, gorev, onay ve surec olay kayitlari.
- audit: Denetim izi kayitlari.
- outbox: Sistem olay kayitlari.

## Kullanici Dili

Kullaniciya "tenant" yerine "calisma alani", "table/view missing" yerine "modul kurulumu tamamlanmamis", "dependency missing" yerine "bu islem icin gerekli modul aktif degil", "setup required" yerine "kurulum gerekli" denir.

## FastAPI Canonical Layer

Module readiness registry ve checker Python backend'e tasinmaya basladi:
`backend/app/setup/readiness_registry.py` ve `readiness_checker.py` canonical
MVP'dir. Next.js `/api/setup/readiness/**` route'lari `FASTAPI_BASE_URL`
varsa `/api/v1/setup/readiness/**` endpointlerine proxy eder; TS fallback yalniz
migration bridge olarak kalir.

## Accounting Readiness

Accounting module icin zorunlu altyapi:

- `accounting_cari_accounts`
- `accounting_cari_transactions`

Opsiyonel altyapi:

- `accounting_transaction_attachments`
- `accounting_reconciliation_links`
- `bank_transactions`
- `invoices`
- `e_invoice_integration`

Bu altyapi eksikse Cari Kartlar ve Cari Hareketler teknik hata yerine
"Muhasebe modulu kurulumu tamamlanmamis" diline yonlenir. Yeni cari MVP
endpointleri FastAPI tarafinda readiness kontrolu yapar; Next route'lari sadece
proxy adapter olarak kalir.

## HR Readiness

HR module icin zorunlu altyapi:

- `hr_employees`
- `hr_employment_records`
- `hr_employment_transactions`

Opsiyonel altyapi ve bagimliliklar:

- `hr_employee_documents`
- `organization`
- `branches`
- `facilities`
- `accounting`

Bu altyapi eksikse Calisanlar, Ise Giris, Isten Cikis ve SGK manuel takip
akislarinda teknik tablo hatasi gosterilmez; kullanici "IK modulu kurulumu
tamamlanmamis" diline yonlendirilir. Yeni HR endpointleri FastAPI tarafinda
readiness kontrolu yapar; Next route'lari sadece proxy adapter olarak kalir.

## Project Management Readiness

Project Management module icin zorunlu altyapi:

- `project_projects`
- `project_tasks`

Opsiyonel altyapi ve bagimliliklar:

- `project_task_comments`
- `project_task_attachments`
- `project_task_history`
- `hr`
- `organization`
- `branches`
- `facilities`

Bu altyapi eksikse Projeler, Gorevler ve Kanban ekranlari teknik tablo hatasi
yerine "Proje/Gorev modulu kurulumu tamamlanmamis" diline yonlenir. Project
task Action Center'a `source_type=project_task` ile baglanir; process task
readiness ayridir.

## Product Services Readiness

Product Services module icin zorunlu altyapi:

- `product_catalog`

Opsiyonel altyapi ve bagimliliklar:

- `companies`
- `accounting`
- `inventory`

Bu altyapi eksikse Urun/Hizmet Katalogu teknik tablo hatasi yerine
"Urun/Hizmet modulu kurulumu tamamlanmamis" diline yonlenir. Katalog
servis verilebilirlik, seri no, garanti ve bakim varsayilanlarini saglar; satis,
stok veya muhasebe hareketi uretmez.

## After-Sales Readiness

After-Sales module icin zorunlu altyapi:

- `product_catalog`
- `after_sales_installed_assets`
- `after_sales_service_requests`
- `after_sales_service_records`

Opsiyonel altyapi ve bagimliliklar:

- `project_management`
- `hr`
- `facilities`
- `branches`
- `accounting`

Bu altyapi eksikse Kurulu Urunler, Servis Talepleri, Servis Kayitlari ve Bakimi
Gelenler ekranlari teknik tablo hatasi yerine "Satis sonrasi modulu kurulumu
tamamlanmamis" diline yonlenir. Project task entegrasyonu opsiyoneldir ve
servis talebi lifecycle'inin yerine gecmez; Accounting entegrasyonu future
fatura/cari mutabakati hazirligidir.

## CRM Readiness

CRM / Paydaslar module icin zorunlu altyapi:

- `master_persons`
- `master_organizations`
- `crm_stakeholders`

Opsiyonel altyapi ve bagimliliklar:

- `crm_interactions`
- `accounting`
- `project_management`
- `after_sales`
- `hr`
- `partners`
- `representatives`

Bu altyapi eksikse Paydaslar, master lookup, cari kart olusturma ve follow-up
task aksiyonlari teknik tablo hatasi yerine "CRM backend servisi
yapilandirilmamis" veya "CRM modulu kurulumu tamamlanmamis" diline yonlenir.
Next route'lari proxy-only adapter olarak kalir; duplicate role ve company
scope kararlarini FastAPI CRM domain servisleri verir.

## Reporting Readiness

Reporting module icin zorunlu tablo yoktur; dashboard enabled modullerin
summary/projection kaynaklarini okur.

Zorunlu bagimlilik:

- `companies`

Opsiyonel bagimliliklar:

- `partners`
- `representatives`
- `branches`
- `accounting`
- `hr`
- `project_management`
- `after_sales`
- `crm`
- `audit`
- `actionCenter`

Bir modul kapali, yetkisiz veya projection kaynagi eksikse dashboard tamamen
kirilmamalidir. Ilgili kart gizlenir/disabled olur veya warning dondurulur.
Export icin tarih araligi, row limit ve `reporting.export` izni gerekir.
