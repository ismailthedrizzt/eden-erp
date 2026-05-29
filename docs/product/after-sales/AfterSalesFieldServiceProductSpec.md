# After-Sales Field Service Product Spec

## Amac

Satis Sonrasi modulunu kurulu urun ve servis talebi MVP seviyesinden saha servis operasyonu, periyodik bakim planlama, teknisyen atama, mobil servis kaydi, checklist, fotograf/belge yukleme ve servis raporu hazirligina tasir.

Ana ilke: servis talebi tek basina operasyon degildir; kurulu urun yasam dongusu, garanti, bakim plani, saha gorevi, servis sonucu ve musteri raporu birlikte yonetilir.

## Kapsam

- Maintenance plan ve maintenance due item
- Servis talebi triage alanlari
- Dedicated field service assignment
- Mobil servis akisi
- Checklist template ve servis checklist sonucu
- Kullanilan parca/malzeme JSON hazirligi
- Document domain ile servis fotografi
- Garanti kontrolu
- Servis raporu JSON/HTML preview
- Project/Task, Notification ve Action Center best-effort entegrasyonu

Bu faz native mobil app, offline queue, rota optimizasyonu, stoktan otomatik dusum, fatura, musteri portali, e-imza ve PDF generation yazmaz.

## Model

- `after_sales_maintenance_plans`: product-level, asset-level veya genel plan.
- `after_sales_maintenance_due_items`: plan + kurulu urun + due date durum kaydi.
- `after_sales_field_assignments`: teknisyen saha gorevinin ana kaydi.
- `after_sales_checklist_templates`: urun/servis turu bazli checklist sablonu.
- `after_sales_service_checklist_results`: servis kaydina bagli checklist sonucu.
- `after_sales_service_requests`: schedule, warranty, required skills, required parts preview ve customer availability alanlariyla genisletilir.

## API

- `GET/POST /api/v1/after-sales/maintenance-plans`
- `GET/PATCH /api/v1/after-sales/maintenance-plans/{plan_id}`
- `GET /api/v1/after-sales/maintenance-due`
- `POST /api/v1/after-sales/maintenance-due/{id}/create-service-request`
- `POST /api/v1/after-sales/maintenance-due/{id}/skip`
- `GET /api/v1/after-sales/field-assignments`
- `GET /api/v1/after-sales/field-assignments/{id}`
- `POST /api/v1/after-sales/service-requests/{id}/assign-technician`
- `POST /api/v1/after-sales/field-assignments/{id}/accept`
- `POST /api/v1/after-sales/field-assignments/{id}/reject`
- `POST /api/v1/after-sales/field-assignments/{id}/status`
- `GET/POST /api/v1/after-sales/checklist-templates`
- `GET/PATCH /api/v1/after-sales/service-records/{id}/checklist`
- `POST /api/v1/after-sales/service-records/{id}/start`
- `POST /api/v1/after-sales/service-records/{id}/photos`
- `GET /api/v1/after-sales/service-records/{id}/report`
- `GET /api/v1/after-sales/assets/{asset_id}/warranty-check`

## Permissions

- `afterSales.maintenanceView`
- `afterSales.maintenanceManage`
- `afterSales.fieldServiceView`
- `afterSales.fieldServiceAssign`
- `afterSales.fieldServiceExecute`
- `afterSales.checklistManage`
- `afterSales.serviceReportView`
- `afterSales.serviceReportGenerate`
- `afterSales.warrantyOverride`

## Acceptance Criteria

1. Bakim plani olusturulur ve due item uretir.
2. Due item servis talebine donusturulur.
3. Servis talebine teknisyen atanir ve field assignment olusur.
4. Teknisyen mobil servis akisini acabilir, kabul/baslat/tamamla durumlarini isletebilir.
5. Checklist required maddeleri tamamlanmadan servis kapatma engellenir.
6. Fotograf document olarak service record'a baglanir ve service record `photos` ozetine yazilir.
7. Garanti kontrolu in/out/unknown/void sonucu doner.
8. Servis tamamlaninca asset `last_service_date`, due item ve plan tarihleri guncellenir.
9. Follow-up required sonucu Project/Task olusturabilir.
10. Action Center bakim, assignment, overdue request ve warranty uyarilarini gosterir.
