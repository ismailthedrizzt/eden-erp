# Advanced Reporting Product Spec

## Amac

Advanced Reporting fazi, mevcut dashboard/rapor temelini kullanicilarin kendi
gorunumlerini kaydedebildigi, ozel rapor tanimlari olusturabildigi,
raporlari zamanlayabildigi ve guvenli export alabildigi bir karar destek
katmanina tasir.

Ana ilke: saved view, custom report ve scheduled report kullanicinin runtime
permission/scope sinirlarini genisletemez. Her rapor calistirmada kaynak
permission, modul permission, veri scope, export permission ve hassas rapor
izinleri yeniden kontrol edilir.

## Kapsam

- Kayitli gorunumler: filtre, kolon, siralama, grup ve chart config.
- Ozel rapor tanimlari: whitelist source uzerinden table/summary/chart/hybrid.
- Zamanlanmis raporlar: gunluk, haftalik, aylik.
- Export joblari: queued/running/completed/failed/expired.
- Dashboard personalization: widget sirasi, gizleme, pinned raporlar.
- Cross-module management reports.
- Action Center, notification ve audit best-effort entegrasyonu.

## Veri Modeli

Canonical tablolar:

- `reporting_saved_views`
- `reporting_custom_reports`
- `reporting_scheduled_reports`
- `reporting_export_jobs`
- `reporting_report_run_logs`
- `reporting_dashboard_preferences`

MVP custom report source tipleri:

- `predefined_projection`
- `predefined_report`
- `saved_view`

Serbest SQL, pivot motoru ve BI designer bu fazin disindadir.

## Cross-Module Raporlar

Baslangic raporlari:

- `company_360_status_report`
- `operations_risk_report`
- `financial_document_gap_report`
- `authority_expiry_report`
- `service_operations_report`
- `hr_readiness_report`

Bu raporlar mevcut projection/read model kaynaklari uzerinden best-effort
calisir. Kaynak tablo yoksa kullaniciya warning doner, raporlama akisi
bozulmaz.

## Permission ve Scope

Temel izinler:

- `reporting.view`
- `reporting.dashboardView`
- `reporting.export`
- `reporting.admin`
- `reporting.savedViewsManage`
- `reporting.customReportsManage`
- `reporting.scheduledReportsManage`
- `reporting.exportManage`
- `reporting.dashboardCustomize`
- `reporting.viewFinancial`
- `reporting.viewAuditSummary`
- `reporting.viewHR`
- `reporting.viewSystem`

Scheduled report run sirasinda alicilar yeniden permission check'ten gecirilir.
Yetkisiz aliciye rapor gonderilmez ve run log/notification olusur.

## API

Saved views:

- `GET /api/v1/reporting/saved-views`
- `POST /api/v1/reporting/saved-views`
- `GET /api/v1/reporting/saved-views/{view_id}`
- `PATCH /api/v1/reporting/saved-views/{view_id}`
- `DELETE /api/v1/reporting/saved-views/{view_id}`
- `POST /api/v1/reporting/saved-views/{view_id}/set-default`
- `POST /api/v1/reporting/saved-views/{view_id}/pin`

Custom reports:

- `GET /api/v1/reporting/custom-reports`
- `POST /api/v1/reporting/custom-reports`
- `GET /api/v1/reporting/custom-reports/{report_id}`
- `PATCH /api/v1/reporting/custom-reports/{report_id}`
- `DELETE /api/v1/reporting/custom-reports/{report_id}`

Scheduled reports:

- `GET /api/v1/reporting/scheduled-reports`
- `POST /api/v1/reporting/scheduled-reports`
- `GET /api/v1/reporting/scheduled-reports/{schedule_id}`
- `PATCH /api/v1/reporting/scheduled-reports/{schedule_id}`
- `POST /api/v1/reporting/scheduled-reports/{schedule_id}/pause`
- `POST /api/v1/reporting/scheduled-reports/{schedule_id}/resume`
- `POST /api/v1/reporting/scheduled-reports/{schedule_id}/run-now`

Exports and catalog:

- `POST /api/v1/reporting/reports/{report_key}/query`
- `POST /api/v1/reporting/reports/{report_key}/export`
- `GET /api/v1/reporting/reports/catalog`
- `GET /api/v1/reporting/exports`
- `GET /api/v1/reporting/exports/{export_id}`
- `GET /api/v1/reporting/exports/{export_id}/download-url`
- `GET/PATCH /api/v1/reporting/dashboard/preferences`

## Worker

`backend/app/workers/reporting_worker.py` due scheduled reportlari batch halinde
calistirir. Run basina:

1. Source report permission kontrol edilir.
2. Saved view varsa view erisimi kontrol edilir.
3. Rapor query calistirilir.
4. Alici permission check uygulanir.
5. Notification/email best-effort uretilir.
6. Run log yazilir.
7. `next_run_at` guncellenir.

## Acceptance Criteria

- Saved view create/list/update/delete, pin ve default akislari calisir.
- Custom report sadece whitelist kaynaklardan olusturulur.
- Scheduled report create/pause/resume/run-now akislari calisir.
- Export job row limit, permission ve audit kontrolleriyle olusur.
- Dashboard preference kaydedilir ve kullanici bazli tutulur.
- Cross-module raporlar catalog ve query akislari icinde gorunur.
- Action Center failed schedule/export uyarilarini gosterir.
- Next proxy route coverage FastAPI contract ile uyumludur.

