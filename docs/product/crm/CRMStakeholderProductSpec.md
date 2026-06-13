# CRM / Stakeholders / Customer-Supplier Master Data Product Spec

<!-- source-of-truth-standard: contract overrides markdown -->

> Deepening update: lead, opportunity, pipeline and follow-up automation scope is documented in [CRMLeadOpportunityProductSpec.md](./CRMLeadOpportunityProductSpec.md).

## Amac

CRM/Paydaslar modulu ayni kisi veya kurumun farkli modullerde tekrar tekrar
ayri kayit olarak uretilmesini engeller. Master kisi/kurum kaydi kimligi
tutar; musteri, tedarikci, bayi, muhasebeci, dis danisman, kamu kurumu,
lead ve diger paydas rolleri bu master kayda baglanan iliski kayitlaridir.

Kesin ayrim:

- Master kayit = kim?
- Rol kaydi = hangi baglamda ne?
- Cari kart = finansal iliski.
- CRM/stakeholder = ticari ve operasyonel iliski.
- Ortak = hukuki ortaklik hakki.
- Temsilci = sirket adina yetki.
- Calisan = istihdam iliskisi.

## Kapsam

MVP kapsaminda master person, master organization, crm stakeholder,
interaction/notlar, cari kart olusturma hazirligi, follow-up task olusturma
ve related roles paneli vardir. Tam satis pipeline, opportunity, email sync,
customer portal veya advanced merge UI bu fazda yoktur.

## Master Data

Master person alanlari TCKN/pasaport, ad soyad, iletisim, adres, dogum ve
not bilgilerini tasir. Master organization alanlari VKN, ticari unvan, vergi
dairesi, MERSIS/sicil, iletisim, adres ve not bilgilerini tasir.

Tekillestirme kurallari:

- Gercek kisi: nationality + identity_number.
- Gercek kisi: nationality + passport_no.
- Fallback: full_name + phone/email uyari.
- Tuzel kisi: country + tax_number.
- Tuzel kisi: country + registry_number future.
- Fallback: trade_name + city uyari.

Kullanici mesaji: "Bu kisi/kurum sistemde zaten varsa yeni kayit acmak
yerine mevcut kayitla iliski olusturulur."

## Stakeholder Roles

Stakeholder kaydi company scope icinde master person veya organization'a
baglanir. Desteklenen roller: customer, supplier, customer_supplier, dealer,
distributor, accounting_firm, external_consultant, public_institution,
logistics_partner, service_partner, investor, lead ve other.

Ayni master entity ayni company altinda ayni stakeholder_type ile draft/active
durumda duplicate olmamalidir.

## Cari Entegrasyonu

Musteri veya tedarikci rolu secildiginde Cari Kart olusturma onerilir.
Cari kart olusturuldugunda account_name display_name'den, cari_role
stakeholder_type'tan, tax/contact alanlari master kayittan gelir.

Cari kart finansal iliski icindir. Paydas finansal olmayan ticari veya
operasyonel iliskiyi de temsil eder. Cari kart silinirse paydas silinmez.

## After-Sales Entegrasyonu

Paydas detailde kurulu urunler, acik servis talepleri, servis gecmisi ve
bakimi yaklasan urunler gosterilebilir. After-Sales kayitlari stakeholder
veya cari account uzerinden musteri baglantisi kurabilir.

## Project/Task Entegrasyonu

Paydas detailden takip gorevi olusturulabilir. Task related fields:

- related_module = crm
- related_entity_type = stakeholder
- related_entity_id = stakeholder_id

Project task ekip is takibidir; paydas rol kaydinin yerine gecmez.

## Related Roles

Ayni master person/entity partner, representative, employee, stakeholder ve
cari account rollerine sahip olabilir. Detail paneli bu baglantilari gosterir:

- Ortak kaydi var mi?
- Temsilci kaydi var mi?
- Calisan kaydi var mi?
- Cari kart var mi?
- Kurulu urun/servis var mi?

Calisan olmak, temsilci olmak veya ortak olmak ayni sey degildir. Bir kisi
ayni anda calisan, ortak ve temsilci olabilir; ancak bu roller ayri domain
iliskileriyle yonetilir.

## Lead Hazirligi

stakeholder_type = lead ve customer_status = lead/prospect ile temel lead
takibi yapilir. lead_status, lead_source, potential_value,
expected_close_date, next_followup_date ve lost_reason alanlari hazirdir.
Follow-up date varsa Project/Task follow-up gorevi onerilir.

## Interaction MVP

Etkilesim tipleri note, phone_call, email, meeting, visit, proposal_sent,
complaint, service_contact ve other olarak tutulur. MVP not/etkilesim ekleme
ve timeline gosterimini kapsar.

## Permissions

- crm.view
- crm.create
- crm.edit
- crm.delete
- crm.interactionsManage
- crm.leadsManage
- crm.createCariAccount
- crm.createTask

## Readiness

Required tables:

- master_persons
- master_organizations
- crm_stakeholders

Optional:

- crm_interactions
- accounting
- projectManagement
- afterSales
- hr
- partners
- representatives

## API Endpoints

- GET /api/v1/crm/master/persons/search
- POST /api/v1/crm/master/persons
- GET /api/v1/crm/master/organizations/search
- POST /api/v1/crm/master/organizations
- GET /api/v1/crm/stakeholders
- POST /api/v1/crm/stakeholders
- GET /api/v1/crm/stakeholders/{stakeholder_id}
- PATCH /api/v1/crm/stakeholders/{stakeholder_id}
- DELETE /api/v1/crm/stakeholders/{stakeholder_id}
- GET/POST /api/v1/crm/stakeholders/{stakeholder_id}/interactions
- GET /api/v1/crm/stakeholders/{stakeholder_id}/related-records
- GET /api/v1/crm/stakeholders/{stakeholder_id}/summary
- POST /api/v1/crm/stakeholders/{stakeholder_id}/create-cari-account
- POST /api/v1/crm/stakeholders/{stakeholder_id}/create-followup-task

## Acceptance Criteria

1. Master person/organization kavrami net.
2. Paydas/stakeholder role modeli calisir.
3. Musteri/tedarikci/lead temel akislari calisir.
4. Duplicate kisi/kurum engeli veya uyarisi calisir.
5. Cari kart entegrasyonu hazir ve MVP calisir.
6. After-Sales musteri iliskisi hazir.
7. Project/Task follow-up entegrasyonu hazir.
8. Related roles paneli duplicate riskini azaltir.
9. FastAPI endpoint coverage guncel.
10. Next proxy contract bozulmaz.
11. Product spec ve E2E checklist vardir.
12. Build/typecheck/test bozulmaz.

## Known Gaps

Known gaps are tracked in [CRMKnownGaps.md](./CRMKnownGaps.md) and summarized in the final release gate risk list.
