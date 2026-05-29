# HR Foundation Product Spec

## Amac

IK modulu calisan kartlari ve istihdam lifecycle uzerinden kuruludur. Calisan
karti kisi/ozluk bilgisini tutar; ise giris, pozisyon, SGK ve isten cikis
bilgileri lifecycle operation olarak yonetilir.

## Kapsam

- Calisan karti taslagi
- Istihdam kaydi
- Ise giris ve isten cikis
- Organizasyon birimi, pozisyon, sirket ve sube baglantisi
- SGK manuel takip
- Calisan belgeleri ve ozluk dosyasi
- Calisan listesi, detay sekmeleri ve summary widget'lari

Izin, devam-devamsizlik, puantaj ve bordro hazirligi deepening kapsaminda
[HRLeaveAttendanceProductSpec.md](./HRLeaveAttendanceProductSpec.md) altinda
tanimlanir.

Kapsam disi: tam bordro hesaplama, vergi/kesinti, e-bordro, gercek SGK
entegrasyonu, maas odeme ve muhasebe entegrasyonu.

## Domain Siniri

HR domain calisan ve istihdam lifecycle kaydini sahiplenir. Company sirket
tuzel kisiligini, Branch sube lifecycle'ini, Organization organizasyon
birimi/kadro tanimini, Accounting ucret/odeme hareketlerini sahiplenir.

Calisan olmak, temsilci olmak veya ortak olmak ayni sey degildir. Bir kisi ayni
anda calisan, ortak ve temsilci olabilir; ancak bu roller ayri domain
iliskileriyle yonetilir.

## Calisan Karti

Alanlar: `id`, `tenant_id`, `company_id`, `person_id`, `employee_no`,
`first_name`, `last_name`, `full_name`, `identity_number`, `passport_no`,
`nationality`, `birth_date`, `gender`, `marital_status`, `education_level`,
`phone`, `email`, `address`, `city`, `district`, `country`,
`emergency_contact`, `photo_url`, `record_status`, `employment_status`,
`notes`, `created_at`, `updated_at`, `version`, `is_deleted`.

Kural: `+ Ekle` calisan karti taslagi olusturur. Taslak kart tek basina SGK
girisi yapilmis calisan anlamina gelmez.

Create helper metni:

> Bu islem calisan karti taslagi olusturur. Istihdam, pozisyon, SGK ve ise giris
> bilgileri Ise Giris sihirbazi ile tamamlanir.

## Istihdam Lifecycle

Durumlar: `draft`, `active`, `suspended`, `terminated`, `passive`.

Istihdam alanlari: `employee_id`, `employment_status`, `employment_type`,
`company_id`, `branch_id`, `organization_unit_id`, `position_id`, `job_title`,
`start_date`, `trial_period_end_date`, `end_date`, `termination_reason`,
`sgk_status`, `sgk_workplace_registry_no`, `work_location_type`,
`manager_employee_id`, `salary_type`, `currency`, `notes`.

Kart PATCH'i istihdam alanlarini keyfi degistiremez. Ise giris, isten cikis,
pozisyon degisikligi, organizasyon/sube degisikligi ve SGK tamamlandi aksiyonlari
operation olarak calisir.

## Ise Giris

Wizard adimlari: On Kontrol, Calisan Karti Ozeti, Sirket/Sube,
Organizasyon/Pozisyon, Istihdam Bilgileri, SGK Bilgileri, Belgeler, Ozet/Onay.

Validation:

- Calisan karti `draft` olmalidir.
- Sirket aktif olmalidir.
- Secilen sube ayni sirket altinda ve aktif olmalidir.
- Secilen organizasyon birimi aktif olmalidir.
- Secilen pozisyon aktif olmalidir.
- `start_date` ve `employment_type` zorunludur.
- SGK gerekiyorsa isyeri sicil no beklenir.
- TR calisan icin TCKN, yabanci calisan icin pasaport veya kimlik bilgisi
  beklenir.
- Ayni kisi/sirket icin duplicate aktif calisan engellenir.

Completion: calisan `active`, istihdam kaydi `active`, transaction kaydi olusur.

## Isten Cikis

Aktif calisan icin calisir. `end_date` ve `termination_reason` zorunludur.
`end_date`, `start_date` oncesinde olamaz. Calisan karti passive, istihdam
status'u terminated olur. Kisi ayni zamanda temsilciyse kullaniciya
Temsilcilerimiz modulunu kontrol etmesi soylenir.

## Pozisyon / Organizasyon Degisikligi

Aktif calisan icin calisir. Yeni sube, organizasyon birimi ve pozisyon ayni
sirket altinda aktif olmalidir. `effective_date` zorunludur ve eski/yeni
degerler farkli olmalidir.

## SGK Manuel Takip

Gercek SGK entegrasyonu bu fazda yoktur. `SGK Girisi Yapildi` ve
`SGK Cikisi Yapildi` aksiyonlari tarih, referans no ve belge referansi alarak
`sgk_status = completed` kaydeder.

## Calisan Belgeleri

Belge turleri: kimlik, ikametgah, diploma, saglik raporu, adli sicil, sozlesme,
SGK giris bildirgesi, SGK cikis bildirgesi, egitim/sertifika, diger.

Durumlar: `missing`, `uploaded`, `expired`, `rejected`, `verified`.

Zorunlu ve eksik belgeler calisan detayinda uyari olarak gorunur.

## UX

Calisanlar sayfasi liste, filtre, summary widget, detay hero ve detay sekmeleri
icerir. Detay sekmeleri: Genel Bilgiler, Iletisim, Istihdam Durumu,
Organizasyon/Pozisyon, SGK/Kamu, Belgeler/Ozluk Dosyasi, Gecmis/Denetim.

Hizli aksiyonlar: Ise Giris Baslat, Pozisyon Degisikligi, SGK Girisi Yapildi,
Isten Cikis, Belge Ekle.

## Permissions

- `hr.view`
- `hr.edit`
- `hr.employeeCreate`
- `hr.employmentStart`
- `hr.employmentTerminate`
- `hr.assignmentChange`
- `hr.documentsManage`
- `hr.sensitiveView`

## Module Readiness

Required tables: `hr_employees`, `hr_employment_records`,
`hr_employment_transactions`.

Optional tables/dependencies: `hr_employee_documents`, `organization`,
`branches`, `facilities`, `accounting`.

Feature flags: `hr.enabled`, `hr.employees`, `hr.employmentLifecycle`,
`hr.sgkManualTracking`, `hr.employeeDocuments`, `hr.positionAssignment`,
`hr.salaryBasicInfo`.

## API Endpoints

- `GET/POST /api/v1/hr/employees`
- `GET/PATCH/DELETE /api/v1/hr/employees/{employee_id}`
- `POST /api/v1/hr/employees/{employee_id}/employment/start`
- `POST /api/v1/hr/employees/{employee_id}/employment/terminate`
- `POST /api/v1/hr/employees/{employee_id}/employment/assignment-change`
- `POST /api/v1/hr/employees/{employee_id}/sgk/entry-completed`
- `POST /api/v1/hr/employees/{employee_id}/sgk/exit-completed`
- `GET/POST /api/v1/hr/employees/{employee_id}/documents`
- `PATCH /api/v1/hr/employees/{employee_id}/documents/{document_id}`
- `GET /api/v1/hr/employees/summary`
- `GET /api/v1/hr/company/{company_id}/summary`

Next proxy routes use `/api/hr/**` and require `FASTAPI_BASE_URL`.

## Acceptance Criteria

1. Calisan karti taslagi standardi calisir.
2. Ise giris lifecycle operation olarak calisir.
3. Isten cikis lifecycle operation olarak calisir.
4. SGK manuel takip MVP olarak calisir.
5. Organization/position/branch baglantilari calisir.
6. Calisan belgeleri temel seviyede calisir.
7. Summary widget tasarimi calisir.
8. FastAPI endpoint coverage ve Next proxy contract gunceldir.

## Known Gaps

Known gaps are tracked in [HRKnownGaps.md](./HRKnownGaps.md) and summarized in the final release gate risk list.

Leave, attendance, timesheet and payroll preparation deepening is specified in [HRLeaveAttendanceProductSpec.md](./HRLeaveAttendanceProductSpec.md).
