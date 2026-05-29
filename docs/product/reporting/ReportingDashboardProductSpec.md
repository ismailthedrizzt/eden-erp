# Reporting / Dashboards / Management Overview Product Spec

## Amac

Raporlama modulu Eden ERP'deki sirket, ortaklik, temsilci, sube, organizasyon,
tesis, muhasebe, IK, proje/gorev, satis sonrasi ve CRM/paydas verilerini
yonetim seviyesinde gorunur hale getirir. Bu faz tam BI platformu degildir;
ilk hedef yonetim dashboard, modul KPI kartlari, filtrelenebilir raporlar,
uyari/risk kartlari ve export guvenlik modelidir.

Ana ilke: Raporlama ham business mutation yapmaz. Rapor ekranlari projection,
read model veya summary endpointlerinden okur; kullanici yalnizca yetkili
oldugu sirket, sube, modul ve kayit ozetlerini gorur.

Gelismis raporlama fazi icin bkz.
[AdvancedReportingProductSpec.md](./AdvancedReportingProductSpec.md).

## Kapsam

- Yonetim dashboard.
- Modul bazli KPI kartlari.
- Tarih, company, branch, module ve only_mine filtreleri.
- Risk/uyari kartlari.
- Status/module dagilim chart datasetleri.
- Baslangic rapor tanimlari.
- Server-side report query.
- CSV export hazirligi.
- Permission/scope bazli gorunurluk.
- Action Center ve Audit ozet baglantilari.

## Dashboard Layout

Bolumler:

1. Genel Durum
2. Sirketler ve Lifecycle
3. Ortaklik / Sermaye
4. Temsilci / Yetki
5. Subeler / Lokasyonlar
6. Gorevler / Surecler
7. Muhasebe / Cari
8. IK
9. Satis Sonrasi / Servis
10. CRM / Paydaslar
11. Sistem Uyarilari

Modul kapali veya yetkisizse kart gizlenebilir veya disabled gorunebilir.
Runtime visibility ve permission kararlarina gore UI davranir.

## KPI Definitions

Company:

- total companies
- active companies
- draft companies
- liquidation/deregistration companies

Ownership:

- active partners
- ownership total != 100 warnings
- pending ownership transactions

Representatives:

- active representatives
- active authorities
- expiring authorities next 30 days

Branches:

- total branches
- active branches
- closed branches
- branches missing facility

Action/Process:

- open tasks
- pending approvals
- failed/stuck operations

Accounting:

- total cari accounts
- total debit
- total credit
- document_status belge aranacak count
- unmatched transactions

HR:

- total employees
- active employees
- draft employees
- SGK pending

Projects:

- active projects
- open tasks
- overdue tasks
- blocked tasks

After-Sales:

- installed assets
- in warranty
- open service requests
- urgent service requests
- maintenance due

CRM:

- active customers
- active suppliers
- leads/prospects
- follow-ups due
- stakeholders without cari account

System:

- outbox failed count
- audit permission denied count

## Report Definitions

MVP raporlar company, ownership, representatives, branches, accounting, HR,
projects, after-sales, CRM ve audit/system gruplarini kapsar. Her rapor:

- permission-aware
- server-side pagination
- filtrelenebilir
- export-ready
- teknik tablo hatasi yerine kullanici diliyle warning dondurur

## Permissions

- reporting.view
- reporting.dashboardView
- reporting.export
- reporting.admin
- reporting.viewFinancial
- reporting.viewAuditSummary
- reporting.viewHR
- reporting.viewSystem

Finansal KPI icin accounting.view veya reporting.viewFinancial gerekir.
Audit summary icin audit.view veya reporting.viewAuditSummary gerekir. HR KPI
icin hr.view veya reporting.viewHR gerekir. System warnings icin settings.view,
system.admin veya reporting.viewSystem gerekir.

## API Endpoints

- GET /api/v1/reporting/dashboard
- GET /api/v1/reporting/dashboard/summary
- GET /api/v1/reporting/dashboard/module/{module_key}
- GET /api/v1/reporting/kpis/{module_key}
- GET /api/v1/reporting/reports
- GET /api/v1/reporting/reports/{report_key}
- POST /api/v1/reporting/reports/{report_key}/query
- POST /api/v1/reporting/reports/{report_key}/export

## Export

MVP export CSV hazirligi seviyesindedir. Export icin reporting.export veya
reporting.admin gerekir. Tarih araligi zorunludur, max row limit uygulanir ve
hassas degerler future export worker fazinda maskelenir.

## Performance

- Default date range kullanilir.
- Unbounded query yok.
- Report page size max 200.
- Dashboard partial results destekler.
- Bir modul KPI hata verirse tum dashboard kirilmaz; warning dondurulur.

## Acceptance Criteria

1. Yonetim dashboard MVP calisir.
2. Modul bazli KPI kartlari calisir.
3. Permission/scope bazli gorunurluk calisir.
4. Baslangic raporlari tanimlidir.
5. Rapor sorgulari projection/read model/summary kaynaklarindan calisir.
6. Action Center/Audit uyarilari dashboard'a baglanir.
7. Export guvenlik modeli hazirdir.
8. FastAPI endpoint coverage gunceldir.
9. Next proxy contract bozulmaz.
10. Product spec ve E2E checklist vardir.
11. Build/typecheck/test bozulmaz.

## Known Gaps

Known gaps are tracked in [ReportingKnownGaps.md](./ReportingKnownGaps.md) and summarized in the final release gate risk list.
