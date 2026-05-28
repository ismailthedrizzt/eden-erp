# Domain Boundaries

Eden ERP'de domain sinirlari, hangi verinin hangi bounded context tarafindan sahiplenildigini ve domainlerin birbirine hangi yollarla temas edecegini tanimlar. Buyuk refactor yapmadan once bu sozlesme, route, orchestrator, process, projection, audit, action guide ve integrity katmanlarinin ayni dili konusmasini saglar.

Ana ilke:

> Eden ERP'de entity sahipligi domain bazinda belirlenir. Baska domain'in sahip oldugu veri dogrudan guncellenmez; domain service, operation orchestrator veya event/projection yoluyla etkilesim kurulur.

## Ortak Kurallar

- Frontend business verisine dogrudan Supabase ile yazmaz.
- Domainler birbirinin tablolarina keyfi yazmaz.
- Kritik veri degisikligi Operation Orchestrator ve ilgili Domain Service uzerinden yurur.
- Process Engine adim, gorev ve onay yonetir; business entity mutation yapmaz.
- Projection read modeldir; baska domain'in sahip oldugu veriyi kolay okunur hale getirir ama source-of-truth degildir.
- Outbox event, domainler arasi yan etkilerin ana yayilma yoludur.
- Data Integrity Guard cross-domain tutarlilik kontrolu yapar; permission karari vermez.
- Audit Log is gecmisinin yerine gecmez; denetim izidir.

## Company Domain

### Amac

Sirket tuzel kisiligi, lifecycle durumlari ve resmi sirket degisikliklerinin ana kaydini yonetir.

### Sahip Oldugu Entity'ler

- `company`
- `company_lifecycle_events`
- `company_opening_details`
- `company_liquidation_details`
- `company_deregistration_details`
- `company_official_change_transactions`

### Sahip Olmadigi Entity'ler

- Ortaklik haklarinin detay hesaplamasi
- Temsilci yetki kapsami
- Sube ici organizasyon/kadro yapisi
- Fiziksel tesis/lokasyon lifecycle'i
- Muhasebe tahsilat, odeme ve banka hareketleri

### Baslattigi Operasyonlar

- `company_opening`
- `company_liquidation`
- `company_deregistration`
- `title_change`
- `address_change`
- `public_registration_update`
- `nace_change`
- `activity_subject_change`
- `capital_increase` orchestration baslangici
- `branch_opening` orchestration baslangici

### Dinledigi Eventler

- `ownership.transaction_completed`
- `representative.authority_updated`
- `company.branch_opened`
- `company.branch_closed`

### Yayinladigi Eventler

- `company.created`
- `company.opened`
- `company.title_changed`
- `company.address_changed`
- `company.public_registration_updated`
- `company.capital_increased`
- `company.nace_changed`
- `company.activity_subject_changed`

### Diger Domainlerle Iliskisi

Ownership, sermaye ve pay etkilerini uretir; Company bu sonucu sirket detay projection'inda kullanir. Branch, sube acilisi/kapanisi sonucu company detail ve branch summary projection'larini etkiler. Representative Authority, sirket adina hareket eden yetkileri ayri domain olarak tutar.

### Sinir Ihlali Ornekleri

- Company PATCH ile `company_partners.share_ratio` guncellemek.
- Company route icinden `representative_authority_transactions` yazmak.
- Sirket acilisi disinda aktif sirket resmi alanlarini normal form edit ile degistirmek.

### Dogru Kullanim Ornekleri

- Unvan degisikligi wizard'i `title_change` operation orchestrator'ini cagirir.
- Sermaye artirimi Company tarafindan baslatilir, ownership etkisi Ownership Domain Service'e verilir.
- Sube acilisi Company kaydindan baslatilir, gercek sube mutation'i Branch Domain tarafinda yurutulur.

## Ownership Domain

### Amac

Ortak kartlarini, ortaklik islem tarihcesini ve guncel ortaklik dagilimini yonetir. Ortak karti ile ortaklik haklari ayri kavramlardir; pay/oy/kar/sermaye haklari normal kart PATCH ile degil ownership transaction ile olusur veya degisir.

### Sahip Oldugu Entity'ler

- `company_partners`
- `ownership_transactions`
- `v_current_ownership`
- `partner_ownership_lifecycle_events`

### Sahip Olmadigi Entity'ler

- Company base record
- Muhasebe tahsilat/odeme kaydi
- Temsilci yetkileri

### Baslattigi Operasyonlar

- `create_partner_draft`
- `initial_partnership_entry`
- `share_transfer`
- `ownership_exit`
- `share_ratio_change`
- `voting_ratio_change`
- `profit_ratio_change`
- `privilege_change`
- `control_right_change`
- `ownership_correction`
- `reversal_entry`
- `capital_increase_ownership_impact`

### Dinledigi Eventler

- `company.opened`
- `company.capital_increased`
- `company.deregistered`

### Yayinladigi Eventler

- `partner.created`
- `partner.updated`
- `ownership.transaction_created`
- `ownership.transaction_approved`
- `ownership.transaction_completed`
- `ownership.transaction_cancelled`
- `ownership.transaction_reversed`

### Diger Domainlerle Iliskisi

Company sermaye operasyonunu baslatabilir, ancak pay dagilimi ve ortaklik etkisi Ownership Domain'e aittir. Accounting sermaye odemesini mutabakatlar; ortaklik hakkini olusturmaz.

### Sinir Ihlali Ornekleri

- Accounting Domain'in `share_ratio` guncellemesi.
- Company PATCH ile ortaklik cikisi yapmak.
- Partner kart PATCH ile pay, oy, kar payi veya sermaye tutari degistirmek.

### Dogru Kullanim Ornekleri

- Pay devri ownership transaction ile kaydedilir.
- Sermaye artirimi ownership impact adimi guncel pay dagilimini kullanir.
- Ilk Ortaklik Girisi taslak partner kartini aktif ortak haline getirir; kart bilgisi ve ortaklik hakki ayni form PATCH'inde karistirilmaz.

## Representative Authority Domain

### Amac

Temsilci kartini ve bu temsilcinin sirket geneli, sube, organizasyon birimi veya tesis/lokasyon kapsamindaki yetkilerini yonetir.

### Sahip Oldugu Entity'ler

- `company_representatives`
- `representative_authority_transactions`
- `v_current_representative_authorities`

### Sahip Olmadigi Entity'ler

- Person/organization master identity
- Sube acilisi
- Organization unit hiyerarsisi
- Facility lifecycle

### Baslattigi Operasyonlar

- `create_representative_draft`
- `representative_start`
- `representative_authority_scope_change`
- `representative_limit_change`
- `representative_suspend`
- `representative_terminate`
- `representative_correction`

### Dinledigi Eventler

- `company.opened`
- `company.branch_closed`
- `organization.unit_closed`
- `facility.deactivated`

### Yayinladigi Eventler

- `representative.created`
- `representative.updated`
- `representative.authority_started`
- `representative.authority_updated`
- `representative.authority_suspended`
- `representative.authority_terminated`

### Diger Domainlerle Iliskisi

Scope validity icin Branch, Organization ve Facility durumunu okur; bu domainlerin lifecycle'ini degistirmez. Sube detayindaki "Temsilciler / Yetkililer" paneli representative current authority read modelini okur.

### Sinir Ihlali Ornekleri

- Sube bazli yetki icin ikinci temsilci karti acmak.
- Representative route icinden `organization_units` hiyerarsisi degistirmek.

### Dogru Kullanim Ornekleri

- Ayni temsilci karti uzerinde birden fazla authority transaction ile farkli scope tanimlamak.
- Kapali sube icin yeni aktif yetkiyi policy/integrity ile engellemek.

## Branch Domain

### Amac

Sirketlere bagli sube kayitlarini, sube acilisi/kapanisi ve sube belge guncelleme islemlerini yonetir.

### Sahip Oldugu Entity'ler

- `company_branches`
- Branch official change baglantilari

### Sahip Olmadigi Entity'ler

- Sirket tuzel kisiligi
- Organization unit hiyerarsisi
- Facility lifecycle detaylari
- Personel atamalari
- Temsilci yetkileri

### Baslattigi Operasyonlar

- `branch_opening`
- `branch_closing`
- `branch_document_update`

### Dinledigi Eventler

- `company.opened`
- `company.deregistered`
- `representative.authority_updated`

### Yayinladigi Eventler

- `company.branch_opened`
- `company.branch_closed`
- `company.branch_documents_updated`
- `company.branch_updated`

### Diger Domainlerle Iliskisi

Sube acilisi Organization Domain'e organization unit olusturma, Facility Domain'e facility/lokasyon olusturma talebi iletebilir. Bu istekler domain service veya orchestrator uzerinden yurur.

### Sinir Ihlali Ornekleri

- Sube kapanisi route'unun HR employees kayitlarini dogrudan degistirmesi.
- Branch Domain'in facility lifecycle status'unu direkt yazmasi.

### Dogru Kullanim Ornekleri

- Branch opening orchestrator, Organization Domain Service'e organization unit olustur der.
- Branch closing impact review, aktif temsilci yetkilerini Integrity Guard ile listeler.

## Organization Domain

### Amac

Organizasyon birimleri, organizasyon birimi tipleri, pozisyon/kadro ve hiyerarsi kurallarini yonetir.

### Sahip Oldugu Entity'ler

- `organization_units`
- `organization_unit_types`
- `positions`
- Organization hierarchy

### Sahip Olmadigi Entity'ler

- Resmi sube acilisi
- Sirket tescil islemi
- Facility physical lifecycle

### Baslattigi Operasyonlar

- `create_organization_unit`
- `update_organization_structure`
- `manage_positions`
- `assign_staff_to_unit`

### Dinledigi Eventler

- `company.branch_opened`
- `company.branch_closed`

### Yayinladigi Eventler

- `organization.unit_created`
- `organization.unit_updated`
- `organization.unit_closed`

### Diger Domainlerle Iliskisi

Branch opening sonucunda organization unit olusturabilir, ancak bu kayit branch'in kendisi degildir. HR atama ve pozisyon etkilerini Organization Domain uzerinden okur.

### Sinir Ihlali Ornekleri

- Organization Domain'in `company_branches.status` yazmasi.

### Dogru Kullanim Ornekleri

- Sube acilisinda organization unit olusturma talebi domain service uzerinden yapilir.

## Facility / Location Domain

### Amac

Fiziksel lokasyon, tesis, adres/varlik baglantilari ve facility lifecycle'ini yonetir.

### Sahip Oldugu Entity'ler

- `facilities`
- `locations`
- Physical address/location assets
- Facility lifecycle records

### Sahip Olmadigi Entity'ler

- Resmi sube acilisi
- Organization hierarchy
- Sirket tuzel kisiligi

### Baslattigi Operasyonlar

- `create_facility`
- `link_facility_to_branch`
- `deactivate_facility`
- `reuse_facility`

### Dinledigi Eventler

- `company.branch_opened`
- `company.branch_closed`

### Yayinladigi Eventler

- `facility.created`
- `facility.linked_to_branch`
- `facility.deactivated`

### Diger Domainlerle Iliskisi

Branch bir facility ile iliskilenebilir. Organization fiziksel lokasyon degil, hiyerarsik birimdir.

### Sinir Ihlali Ornekleri

- Facility deactivation akisi ile branch resmi kapanisini yapmak.

### Dogru Kullanim Ornekleri

- Sube acilisinda mevcut facility reuse edilir veya yeni facility domain service ile olusturulur.

## Accounting Domain

### Amac

Cari kartlar, cari hareketler, borc/alacak, odeme/tahsilat, gider/gelir
kayitlari, belge/fatura referanslari, banka/kasa/kart hareketi referanslari ve
mutabakat kayitlarini yonetir.

### Sahip Oldugu Entity'ler

- `accounting_cari_accounts`
- `accounting_cari_transactions`
- `accounting_transaction_attachments`
- `accounting_reconciliation_links`
- Banka/kasa/kart hareketi referanslari
- Odeme/tahsilat ve gider/gelir kayitlari
- Fatura/e-fatura/e-arsiv iliskileri

### Sahip Olmadigi Entity'ler

- Ortaklik haklarinin hukuki olusumu
- Sermaye artirimi kararinin kendisi
- Sirket acilisi, tasfiye, terkin
- Temsilci yetkisi
- Sube acilisi/kapanisi
- Personel lifecycle
- Resmi tescil islemi

### Baslattigi Operasyonlar

- `post_payment`
- `post_collection`
- `reconcile_capital_payment`
- `create_cari_account`
- `create_cari_transaction`
- `cancel_transaction`
- `reconcile_transaction`

### Dinledigi Eventler

- `company.capital_increased`
- `ownership.transaction_completed`

### Yayinladigi Eventler

- `accounting.payment_posted`
- `accounting.collection_posted`
- `accounting.reconciliation_completed`

### Diger Domainlerle Iliskisi

Sermaye artirimi ortaklik ve sirket domain'inde dogar; Accounting Domain
sermaye odeme/tahsilat mutabakatini yonetir.

> Sermaye artırımı ortaklık/şirket domain’inde oluşur. Sermaye ödemesi veya
> tahsilatı muhasebe domain’inde cari/banka hareketi olarak mutabakatlanır.

### Sinir Ihlali Ornekleri

- Muhasebe hareketinden ortak pay oranini dogrudan degistirmek.
- Cari hareketten temsilci yetkisi veya sirket lifecycle durumu uretmek.
- Sube acilisi/kapanisini accounting kaydiyla tamamlamak.

### Dogru Kullanim Ornekleri

- Sermaye artirimi tamamlandiktan sonra odeme mutabakati icin accounting action olusturmak.
- Muhtelif Tedarikciler cari karti uzerinden tek seferlik kurulus gideri kaydetmek.
- Banka hareketi veya fatura entegrasyonu geldiginde cari hareketle reconciliation link kurmak.

## HR Domain

### Amac

Calisan kartlarini, calisan ozluk bilgilerini, istihdam lifecycle'ini, ise giris,
isten cikis, pozisyon/organizasyon atamasi, SGK giris/cikis hazirligi ve calisan
belge dosyasini yonetir.

### Sahip Oldugu Entity'ler

- `hr_employees`
- `hr_employment_records`
- `hr_employment_transactions`
- `hr_employee_documents`
- Calisan ozluk bilgileri
- Ise giris / isten cikis lifecycle kayitlari
- SGK manuel takip ve belge referanslari
- Sube, organizasyon birimi ve pozisyon atamasi baglantilari

### Sahip Olmadigi Entity'ler

- Sirket tuzel kisiligi
- Sube acilisi/kapanisi
- Organizasyon agacinin kendisi
- Pozisyon/kadro taniminin ana ownership'i
- Maas odeme/muhasebe hareketi
- Bordro hesaplama
- Temsilci yetkisi
- Ortaklik hakki

### Baslattigi Operasyonlar

- `create_employee_draft`
- `start_employment`
- `terminate_employment`
- `change_assignment`
- `mark_sgk_entry_completed`
- `mark_sgk_exit_completed`
- `manage_employee_documents`

### Dinledigi Eventler

- `organization.unit_closed`
- `facility.deactivated`
- `company.branch_closed`
- `representative.authority_updated`

### Yayinladigi Eventler

- `hr.employee.created`
- `hr.employee.updated`
- `hr.employment.started`
- `hr.employment.terminated`
- `hr.employment.assignment_changed`
- `hr.employee_document.created`

### Diger Domainlerle Iliskisi

Calisan karti kisi/ozluk bilgisini tutar; aktif istihdam, pozisyon ve SGK durumu
Ise Giris veya ilgili istihdam islemleriyle olusur. Organization domain
organizasyon birimi ve pozisyon tanimlarini sahiplenir; HR sadece calisanin bu
tanimlarla baglantisini tutar. Accounting domain ucret/odeme hareketlerini
ileride mutabakatlar, HR bordro veya muhasebe kaydi uretmez.

> Calisan olmak, temsilci olmak veya ortak olmak ayni sey degildir. Bir kisi
> ayni anda calisan, ortak ve temsilci olabilir; ancak bu roller ayri domain
> iliskileriyle yonetilir.

### Sinir Ihlali Ornekleri

- HR atamasindan temsilci imza yetkisi vermek.
- HR istihdam kaydindan ortaklik hakki, pay orani veya oy hakki uretmek.
- Calisan kart PATCH'i ile pozisyon, SGK veya isten cikis durumunu keyfi degistirmek.
- Maas odemesi veya cari hareketi HR domain tablosundan olusturmak.

### Dogru Kullanim Ornekleri

- Organizasyon birimi kapanisinda aktif calisan etkisini integrity check ile gormek.
- + Ekle ile taslak calisan karti olusturup Ise Giris wizard'i ile aktif istihdam baslatmak.
- Pozisyon degisikligini istihdam transaction olarak kaydetmek.
- SGK bildirimi dis sistem entegrasyonu yoksa manuel tamamlandi aksiyonu ile izlemek.

## Project / Task Domain

### Amac

Projeler, gorev/issue kayitlari, status workflow, atama, oncelik, yorum, ek,
etiket, related ERP kaydi ve Kanban MVP'sini yonetir.

### Sahip Oldugu Entity'ler

- `project_projects`
- `project_tasks`
- `project_task_comments`
- `project_task_attachments`
- `project_task_history`
- Project cards
- Project task / issue records
- Kanban status workflow

### Sahip Olmadigi Entity'ler

- Process Engine internal tasks
- Official operation lifecycle
- HR employment lifecycle
- Accounting transaction
- Branch lifecycle
- Representative authority
- Ownership transaction

### Baslattigi Operasyonlar

- `create_project`
- `update_project`
- `complete_project`
- `cancel_project`
- `create_project_task`
- `assign_project_task`
- `transition_project_task`
- `comment_project_task`
- `attach_project_task`

### Dinledigi Eventler

- `organization.unit_updated`
- `hr.employee.created`
- `company.branch_closed`
- `process.instance_completed`

### Yayinladigi Eventler

- `project.created`
- `task.created`
- `task.updated`
- `task.transitioned`
- `task.assigned`
- `task.commented`
- `task.attachment_added`

### Diger Domainlerle Iliskisi

Project task kullanici/ekip isidir; process task sistem surec gorevidir.

> Process task sistem işleminin parçasıdır. Project task ise ekip iş takibidir.
> Action Center ikisini kullanıcıya tek iş listesi olarak gösterebilir ama veri
> modeli ve lifecycle ayrıdır.

### Sinir Ihlali Ornekleri

- Project task tamamlaninca process approval status'u direkt degistirmek.
- Project task ile HR ise giris/isten cikis lifecycle'i uretmek.
- Project task ile muhasebe hareketi veya resmi sube/temsilci islemi tamamlamak.

### Dogru Kullanim Ornekleri

- Sube detayindan related branch gorevi olusturmak.
- Surec sonucu takip isi gerekiyorsa event veya domain service ile project task olusturmak.
- Action Center'da `source_type=process_task` ve `source_type=project_task` kaynaklarini ayri etiketle gostermek.

## Product / Service Domain

### Amac

Satilabilir veya hizmet verilebilir urun/hizmet tanimini yonetir. Katalog,
servis verilebilirlik, seri no gerekliligi, garanti suresi, bakim periyodu,
teknik ozellikler ve dokuman referanslari bu domainde kalir.

### Sahip Oldugu Entity'ler

- `product_catalog`
- Urun/hizmet modeli
- Seri numarasi gerekliligi
- Garanti ve bakim varsayilanlari
- Teknik ozellikler
- Katalog dokumanlari

### Sahip Olmadigi Entity'ler

- Uretim recetesi / BOM detayi
- Stok hareketi
- Fatura / cari hareket
- Musteri kurulum/envanter kaydi
- Saha servis mudahalesi

### Baslattigi Operasyonlar

- `create_product`
- `update_product`

### Dinledigi Eventler

- `after_sales.asset_created`
- `service.record_completed`

### Yayinladigi Eventler

- `product.created`
- `product.updated`

### Diger Domainlerle Iliskisi

Accounting faturalama icin katalog referansi okuyabilir; katalog accounting
hareketi yazmaz. After-Sales sadece `after_sales_enabled=true` ve
`serviceable=true` katalog kayitlarini kurulu urun olarak secilebilir gosterir.

> Urun katalogu satilabilir/hizmet verilebilir urunun tanimidir. Kurulu urun ise
> belirli bir musteride, belirli lokasyonda, belirli seri numarasiyla izlenen
> gercek varliktir.

### Sinir Ihlali Ornekleri

- Product update ile invoice kaydi olusturmak.
- Product catalog PATCH ile musteride kurulu urun veya servis talebi olusturmak.

### Dogru Kullanim Ornekleri

- Fatura satiri product/service read modelini referans alir.
- After-Sales kurulu urun olustururken katalogdaki seri no, garanti ve bakim
  varsayilanlarini okur.

## After-Sales Domain

### Amac

Musteride kurulu urunleri, servis taleplerini, servis kayitlarini, garanti
durumunu, bakim tarihlerini, saha ziyaretlerini ve servis sonucunu yonetir.

### Sahip Oldugu Entity'ler

- `after_sales_installed_assets`
- `after_sales_service_requests`
- `after_sales_service_records`
- Bakim due listesi
- Servis fotograf/rapor/imza referanslari

### Sahip Olmadigi Entity'ler

- Muhasebe tahsilati veya fatura
- Stok cikis hareketi
- Uretim emri
- Project task lifecycle ownership

### Baslattigi Operasyonlar

- `create_installed_asset`
- `create_service_request`
- `assign_service_request`
- `create_service_record`
- `complete_service_record`
- `create_followup_task`

### Dinledigi Eventler

- `product.created`
- `project.task_completed`
- `accounting.invoice_matched`

### Yayinladigi Eventler

- `after_sales.asset_created`
- `service.request_created`
- `service.request_assigned`
- `service.record_completed`
- `service.followup_required`

### Diger Domainlerle Iliskisi

After-Sales Product/Service katalog kaydina, musteri cari kartina, tesis/lokasyon
kaydina ve teknisyen kullanici/calisan kaydina referans verir. Project/Task
entegrasyonu takip isi olusturmak icindir; servis talebinin status kaynagi
After-Sales olarak kalir. Accounting entegrasyonu future fatura/cari hareket
mutabakati icindir; bu fazda tahsilat veya fatura uretmez.

### Sinir Ihlali Ornekleri

- Servis kaydi tamamlaninca dogrudan fatura veya cari hareket olusturmak.
- Follow-up project task tamamlaninca servis talebini otomatik kapatmak.
- Kurulu urun kaydini stok hareketi olarak yorumlamak.

### Dogru Kullanim Ornekleri

- Servis talebinden `related_module=after_sales` project task olusturmak.
- Servis kaydi tamamlaninca kurulu urunun `last_service_date` alanini guncellemek.
- Garanti disi servis kaydini ileride billable accounting akisi icin isaretlemek.

## Document Domain

### Amac

Belge yukleme, belge baglantilari, versiyonlama, saklama ve document lifecycle'ini yonetir.

### Sahip Oldugu Entity'ler

- `documents`
- `entity_documents`
- `media_assets`
- `uploads`

### Sahip Olmadigi Entity'ler

- Sirket resmi islem kararinin kendisi
- Sube resmi lifecycle'i
- Representative authority mutation

### Baslattigi Operasyonlar

- `document_upload`
- `document_delete`
- `document_version_update`

### Dinledigi Eventler

- `company.branch_documents_updated`
- `representative.authority_updated`

### Yayinladigi Eventler

- `document.uploaded`
- `document.deleted`
- `document.version_updated`

### Diger Domainlerle Iliskisi

Business domainler belge isteyebilir veya belgeye referans verebilir. Storage, signed URL ve document lifecycle Document Domain tarafinda kalir.

### Sinir Ihlali Ornekleri

- Branch PATCH ile raw signed URL saklamak.

### Dogru Kullanim Ornekleri

- Sube belgeleri resmi islemle guncellenir, belge lifecycle Document Domain'e devredilir.

## Notification / Action Center Domain

### Amac

Bildirimleri, kullaniciya donuk bekleyen isleri ve unified action center gorunumunu yonetir.

### Sahip Oldugu Entity'ler

- Notifications
- Pending action adapters
- Unified action center items

### Sahip Olmadigi Entity'ler

- Process task source-of-truth
- Approval source-of-truth
- Operation request source-of-truth

### Baslattigi Operasyonlar

- `notify_user`
- `dismiss_action_item`
- `resolve_action_item`

### Dinledigi Eventler

- `process.task_created`
- `process.approval_requested`
- `process.failed`
- `audit.recorded`

### Yayinladigi Eventler

- `notification.created`
- `action_center.item_resolved`

### Diger Domainlerle Iliskisi

Action Center diger domain kaynaklarini kullanici is listesine cevirir. Kaynagin gercek status'unu kendi uydurmaz; source domain'den okur.

### Sinir Ihlali Ornekleri

- Action Center'dan process task'i dogrudan silmek.

### Dogru Kullanim Ornekleri

- Pending approval action olarak gosterilir; karar Approval Service'e gider.

## Process Domain

### Amac

Surec instance, step, task, approval ve process eventlerini yonetir.

### Sahip Oldugu Entity'ler

- `process_instances`
- `process_tasks`
- `process_approvals`
- `process_events`

### Sahip Olmadigi Entity'ler

- Business entity mutation
- Company/branch/ownership direct update

### Baslattigi Operasyonlar

- `start_process`
- `complete_process_step`
- `approve_process`
- `reject_process`
- `cancel_process`

### Dinledigi Eventler

- `company.branch_opened`
- `company.branch_closed`

### Yayinladigi Eventler

- `process.started`
- `process.step_completed`
- `process.task_created`
- `process.approval_requested`
- `process.completed`
- `process.cancelled`
- `process.failed`

### Diger Domainlerle Iliskisi

Process Engine sureci yonetir; gercek business mutation Operation Orchestrator ve Domain Service uzerinden yapilir.

### Sinir Ihlali Ornekleri

- Process step complete icinden `company_branches` status yazmak.

### Dogru Kullanim Ornekleri

- Operation step, branch closing orchestrator'i cagirir.

## Audit / Compliance Domain

### Amac

Kim, ne zaman, nerede, hangi yetki/surec/islem kapsaminda hareket etti bilgisini denetim izi olarak tutar.

### Sahip Oldugu Entity'ler

- `audit_logs`

### Sahip Olmadigi Entity'ler

- Kullaniciya donuk is gecmisi
- Official transaction source-of-truth
- Lifecycle event source-of-truth

### Baslattigi Operasyonlar

- `record_audit`
- `list_audit_logs`

### Dinledigi Eventler

- Audit required tum operation, process, outbox ve permission/policy olaylari

### Yayinladigi Eventler

- `audit.recorded`

### Diger Domainlerle Iliskisi

Audit best effort calisabilir; ana kullanici islemini kirmadan denetim izi tutar. Hassas verileri maskeler.

### Sinir Ihlali Ornekleri

- Audit log'u islem gecmisi yerine kullanmak.

### Dogru Kullanim Ornekleri

- Operation start/complete/fail audit kaydi olusturmak.

## Setup / Module Runtime Domain

### Amac

Calisma alani modullerinin aktiflik, lisans, kurulum ve hazirlik durumlarini yonetir.

### Sahip Oldugu Entity'ler

- Module license records
- Module readiness status
- Workspace setup settings

### Sahip Olmadigi Entity'ler

- Business operation mutation
- Domain data source-of-truth

### Baslattigi Operasyonlar

- `check_module_readiness`
- `run_setup_action`
- `update_module_license`

### Dinledigi Eventler

- `audit.recorded`
- Module runtime status changes

### Yayinladigi Eventler

- `setup.module_ready`
- `setup.module_blocked`

### Diger Domainlerle Iliskisi

Policy, Action Guide, Sidebar ve Module Guard readiness sonucunu okur. Eksik altyapi kullaniciya teknik hata olarak gosterilmez.

### Sinir Ihlali Ornekleri

- Setup action ile business transaction olusturmak.

### Dogru Kullanim Ornekleri

- Branches modulu hazir degilse branch opening action disabled ve kurulum yonlendirmeli olur.

## AI Action Guide Domain

### Amac

Kullanicinin dogal dil niyetini tanimli action registry icindeki sayfa, kayit ve wizard yoluna esler.

### Sahip Oldugu Entity'ler

- Action guide definitions
- Intent matching results
- Guide examples and messages

### Sahip Olmadigi Entity'ler

- Business mutation
- Permission source-of-truth
- Module runtime source-of-truth

### Baslattigi Operasyonlar

- `resolve_action_guide`
- `match_action_intent`

### Dinledigi Eventler

- `company.updated`
- `process.task_created`
- `action_center.item_resolved`
- `ai_context.refresh_requested`

### Yayinladigi Eventler

- `ai_context.refresh_requested`

### Diger Domainlerle Iliskisi

Action Guide yeni islem uydurmaz. Module Registry, Field Control Registry, Visibility Resolver, Policy, Readiness, Integrity ve Action Center ozetini kullanarak dogru yonlendirme yapar.

### Sinir Ihlali Ornekleri

- AI rehberin kullanici onayi olmadan veri degistirmesi.

### Dogru Kullanim Ornekleri

- "Adres alanini neden degistiremiyorum?" sorusunu Field Control Registry'den `address_change` action'ina baglamak.

## CRM / Stakeholder Master Data Domain

### Amac

Master kisi/kurum kaydini tekillestirmek ve musteri, tedarikci, lead, bayi,
muhasebeci, kamu kurumu veya diger paydas rollerini bu master kayda baglamak.

### Sahip Oldugu Entity'ler

- `master_person`
- `master_organization`
- `crm_stakeholder`
- `crm_interaction`

### Sahip Olmadigi Entity'ler

- Cari hareket veya finansal mutabakat.
- Ortaklik hakki.
- Temsil yetkisi.
- Calisan istihdam lifecycle'i.
- After-Sales servis kaydi lifecycle'i.

### Baslattigi Operasyonlar

- `create_stakeholder`
- `create_customer`
- `create_supplier`
- `create_lead`
- `create_interaction`
- `create_cari_from_stakeholder`
- `create_followup_task`

### Diger Domainlerle Iliskisi

Master kayit kimligi temsil eder. Stakeholder role sirketle iliskiyi temsil
eder. Cari kart finansal iliskidir ve Accounting domain'e aittir. Project task
follow-up isidir ve Project/Task domain'e aittir. After-Sales musteri kurulu
urun ve servis kayitlarini stakeholder veya cari account uzerinden baglayabilir.

### Sinir Ihlali Ornekleri

- CRM kaydinin ortaklik payi, temsil yetkisi veya calisan istihdam durumu
  olusturmasi.
- Cari kart silindiginde master kisi/kurum kaydinin otomatik silinmesi.

### Dogru Kullanim Ornekleri

- Ayni VKN ile gelen kurum icin mevcut `master_organization` kaydini secip yeni
  `crm_stakeholder` musteri rolu olusturmak.
- Paydas detailinden Project/Task follow-up gorevi olusturmak.

## Reporting / Dashboard Domain

### Amac

Read model, projection ve summary kaynaklarini yonetim KPI, chart dataset,
rapor sonucu ve export hazirligi olarak sunmak.

### Sahip Oldugu Entity'ler

- `report_definition`
- `dashboard_kpi`
- `report_result`
- `report_export_request`

### Sahip Olmadigi Entity'ler

- Business mutation.
- Official operation.
- Process approval.
- Project task lifecycle.
- Accounting transaction creation.
- Audit log kaydinin kendisi.

### Baslattigi Operasyonlar

- `open_management_dashboard`
- `query_report`
- `export_report`

### Diger Domainlerle Iliskisi

Reporting yalnizca okur. Action Center, Audit, Accounting, HR, CRM,
After-Sales ve Project/Task domainlerinden summary/projection verisi alir.
Kullaniciya yalnizca permission ve scope icindeki ozetleri gosterir.

### Sinir Ihlali Ornekleri

- Dashboard kartinin muhasebe hareketi veya process approval yaratmasi.
- Rapor sorgusunun ham tenant disi tablo verisini gostermesi.

### Dogru Kullanim Ornekleri

- `missing_documents_report` ile belge aranacak cari hareketleri listelemek.
- `overdue_tasks_report` ile geciken project task'lari gostermek.
- `permission_denied_report` ile admin audit ozetini gostermek.

## Kavram Ayrimlari

### Sirket != Sube

Sirket tuzel kisiliktir. Sube, bagli alt resmi/operasyonel birimdir. Sube `companies` tablosuna sirket olarak yazilmaz.

### Sube != Tesis/Lokasyon

Sube resmi/kurumsal birimdir. Tesis/Lokasyon fiziksel yerdir. Bir sube bir facility/location ile iliskilendirilebilir.

### Sube != Organizasyon Birimi

Sube resmi/kurumsal kayittir. Organizasyon birimi hiyerarsik/kadro yapisidir. Sube acilisi organization unit olusturabilir ama organization unit sube degildir.

### Ortak != Temsilci

Ortaklik pay, oy, kar ve sermaye hakkidir. Temsilci sirket adina islem yapma yetkisidir. Ortak ayni zamanda temsilci olabilir ama bu ayri domain iliskisidir.

### Temsilci Karti != Temsil Yetkisi

Temsilci karti kisi/kurum + sirket roludur. Temsil yetkisi scope, limit ve yetki turu ile ayri transaction'dir.

### Sermaye Artirimi != Muhasebe Tahsilati

Sermaye artirimi hukuki/ortaklik islemidir. Sermaye odemesi muhasebe, cari ve banka hareketiyle mutabakatlanir.

### NACE Guncelleme != Faaliyet Konusu Degisikligi

NACE guncelleme idari/faaliyet kodu duzenlemesidir. Faaliyet konusu degisikligi esas sozlesme/faaliyet alani degisikligidir.

### Wizard != Process != Operation

Wizard veri toplar. Process adim, gorev ve onay yonetir. Operation Orchestrator business mutation yapar.

### History != Audit

History kullaniciya is gecmisi gosterir. Audit teknik/denetim izidir.

## Cross-Domain Communication Kurallari

Dogru iletisim yollari:

1. Domain Service cagrisi
2. Operation Orchestrator
3. Process Engine
4. Outbox Event
5. Projection / Read Model
6. Integrity Check

Yanlis kullanim ornekleri:

- Branch Domain'in dogrudan `employees` tablosunu degistirmesi.
- Organization Domain'in `company_branches.status` degistirmesi.
- Accounting Domain'in `share_ratio` guncellemesi.
- Representative Domain'in `organization_units` hiyerarsisini dogrudan degistirmesi.
- Company PATCH ile partners/representatives/branches relation update yapilmasi.

Dogru kullanim ornekleri:

- Branch opening orchestrator, Organization Domain Service'e organization unit olustur der.
- Branch opening orchestrator, Facility Domain Service'e facility olustur der.
- Capital increase orchestrator, Ownership Domain Service'e ownership impact uygula der.
- Representative authority orchestrator, ScopePolicy ile branch/unit/facility validity kontrol eder.
- Outbox event projection refresh tetikler.

## Event Ownership Haritasi

### `company.branch_opened`

- Publisher: Branch Domain / Branch Opening Orchestrator
- Consumers: Organization projection, Facility projection, Action Center, Audit, AI context

### `ownership.transaction_completed`

- Publisher: Ownership Domain
- Consumers: Company detail projection, Accounting reconciliation, Audit, Action Center

### `representative.authority_updated`

- Publisher: Representative Authority Domain
- Consumers: Branch detail representative summary, Company detail projection, Audit

## Refactor Hazirligi

Bu fazda mevcut route ve service kodlari topluca tasinmaz. `lib/domains/*` klasorleri TypeScript gecis prototipi ve Python Domain Service Layer icin sozlesme adresleridir. Yeni migration fazinda is mantigi, mevcut API route'larindan FastAPI/Python domain service'lere asamali olarak tasinacaktir.

Faz 18 ile Domain Service Layer ilk standart fonksiyonlara kavusur. Branch, Organization, Facility, Representative Authority, Ownership ve Company servisleri `DomainServiceContext` ve `DomainServiceResult` sozlesmesini kullanir. Route dosyalari NextResponse uretmeye devam eder; domain service'ler NextResponse dondurmez.

Ilk uygulama kurali:

- Branch opening/closing orchestrator cross-domain mutationlari ilgili domain service'e delege eder.
- `_shared.ts` exportlari sadece canli gecis koprusu ise `deprecated_wrapper` olarak kalabilir; obsolete eski davranis korunmaz.
- Kalan route ve helper tasimalari FastAPI migration fazlarinda parca parca yapilir.

Boundary guard helper'lari su amacla hazirdir:

- `getDomainForEntity`
- `getDomainForTable`
- `getDomainForOperation`
- `warnIfCrossDomainWrite`
- `isCrossDomainWriteAllowed`
- `getAllowedCrossDomainPaths`

Bu helperlar ileride lint, unit test, orchestrator guard ve integrity check katmanlarinda kullanilabilir.
