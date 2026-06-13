# HR Leave Attendance Product Spec

<!-- source-of-truth-standard: contract overrides markdown -->

## Amac

IK modulunu calisan karti ve istihdam lifecycle MVP seviyesinden izin yonetimi, devam-devamsizlik, calisma plani, puantaj ve bordro hazirlik verisine tasir.

Ana ilke: izin, puantaj ve bordro hazirligi calisan lifecycle'inin parcasidir. Bu faz bordro tahakkuku, SGK bildirgesi, vergi/kesinti hesabi veya maas odemesi yapmaz; muhasebe ve bordro sistemlerine dogru veri uretir.

## Kapsam

- Tenant/company bazli izin turleri
- Calisan bazli izin bakiyesi ve hak edis MVP
- Izin talebi, gonderim, onay, red ve iptal akisi
- Belge gerektiren izin uyarisi
- Devam-devamsizlik ve fazla mesai hazirligi
- Haftalik calisma plani ve calisana atama
- Puantaj donemi, hesaplama, onay ve kilit
- Bordro hazirlik satirlari
- Action Center, Notification ve Audit best-effort entegrasyonu
- HR dashboard KPI ve rapor tanimlari

Bu faz tam bordro, SGK bildirge gonderimi, e-bordro, banka maas dosyasi, karmasik yan hak hesabi veya turnike/biometrik cihaz entegrasyonu yazmaz.

## Model

- `hr_leave_types`: yillik izin, hastalik, ucretsiz, mazeret ve benzeri izin turleri.
- `hr_leave_balances`: calisan/izin turu/yil bazinda hak edilen, devreden, kullanilan, bekleyen ve kalan gunler.
- `hr_leave_requests`: tarih araligi, yarim gun, belge, onay ve durum bilgisiyle izin talebi.
- `hr_attendance_records`: gunluk devam-devamsizlik, planlanan/fiili saat ve fazla/eksik saat.
- `hr_work_schedules`, `hr_shifts`, `hr_employee_work_schedules`: sabit haftalik calisma planlari ve calisan atamalari.
- `hr_timesheet_periods`, `hr_timesheet_rows`: puantaj donemi ve calisan satirlari.
- `hr_payroll_preparation_rows`: bordro hesaplamasi yapmadan puantajdan uretilen hazirlik satirlari.

Varsayilan izin turleri ilk `GET /api/v1/hr/leave-types` veya bakiye recalculation akisi sirasinda tenant-level `company_id = null` olarak lazy seed edilir.

## Is Kurallari

- Izin talebi icin calisan aktif, izin turu aktif olmalidir.
- `start_date <= end_date` zorunludur.
- Submitted, pending approval veya approved izinlerle tarih cakismasi engellenir.
- Bakiye yeterli degilse talep engellenir; sadece izin turu negative balance'a izin veriyorsa devam edebilir.
- Submitted/pending talepler `pending_days`, approved talepler `used_days` etkisi yaratir.
- Rejected/cancelled talepler bakiyeyi etkilemez.
- Approved izin ilgili gunlerde attendance kaydini `leave` veya `sick_leave` olarak isaretleyebilir.
- Locked puantaj doneminden sonra etkilenen leave/attendance degisikligi uyarili conflict dondurur.
- Payroll prep satirlarinda amount, tax, SGK declaration veya accounting transaction uretilmez.

## API

- `GET/POST /api/v1/hr/leave-types`
- `GET/PATCH /api/v1/hr/leave-types/{id}`
- `GET /api/v1/hr/employees/{employee_id}/leave-balances`
- `POST /api/v1/hr/employees/{employee_id}/leave-balances/recalculate`
- `PATCH /api/v1/hr/leave-balances/{id}/adjust`
- `GET/POST /api/v1/hr/leave-requests`
- `GET/PATCH /api/v1/hr/leave-requests/{id}`
- `POST /api/v1/hr/leave-requests/{id}/submit`
- `POST /api/v1/hr/leave-requests/{id}/approve`
- `POST /api/v1/hr/leave-requests/{id}/reject`
- `POST /api/v1/hr/leave-requests/{id}/cancel`
- `GET/POST/PATCH /api/v1/hr/attendance`
- `POST /api/v1/hr/attendance/import`
- `GET/POST/PATCH /api/v1/hr/work-schedules`
- `POST /api/v1/hr/employees/{employee_id}/work-schedule-assignment`
- `GET/POST /api/v1/hr/timesheets`
- `GET /api/v1/hr/timesheets/{id}`
- `POST /api/v1/hr/timesheets/{id}/calculate`
- `POST /api/v1/hr/timesheets/{id}/approve`
- `POST /api/v1/hr/timesheets/{id}/lock`
- `GET /api/v1/hr/payroll-prep`
- `GET /api/v1/hr/payroll-prep/{period_id}`
- `POST /api/v1/hr/payroll-prep/{period_id}/mark-ready`

## UI

- `/app/ik/izinler`
- `/app/ik/izin-turleri`
- `/app/ik/izin-bakiyeleri`
- `/app/ik/devam-devamsizlik`
- `/app/ik/puantaj`
- `/app/ik/calisma-planlari`

Puantaj/bordro hazirlik ekraninda kullaniciya su sinir acik gosterilir: "Bu ekran bordro hesaplamasi yapmaz; bordro hazirligi icin puantaj verisini hazirlar."

## Permissions

- `hr.leaveView`
- `hr.leaveRequestCreate`
- `hr.leaveApprove`
- `hr.leaveAdmin`
- `hr.attendanceView`
- `hr.attendanceEdit`
- `hr.timesheetView`
- `hr.timesheetManage`
- `hr.timesheetApprove`
- `hr.payrollPrepView`
- `hr.payrollPrepManage`
- `hr.sensitiveView`

## Feature Flags

- `hr.leaveManagement`
- `hr.attendance`
- `hr.workSchedules`
- `hr.timesheets`
- `hr.payrollPreparation`
- `hr.leaveApprovals`
- `hr.overtime`
- `hr.attendanceImport`

## Reporting

Dashboard KPI'lari aktif calisan, dusuk izin bakiyesi, onay bekleyen izin, bu ay izinli kayitlar, devamsizlik, fazla mesai, acik puantaj ve SGK pending degerlerini gosterir.

Raporlar: `leave_balance_report`, `leave_requests_report`, `attendance_report`, `overtime_report`, `timesheet_period_report`, `payroll_preparation_report`.

## Acceptance Criteria

1. Izin turleri tenant bazli calisir ve default seed edilir.
2. Izin bakiyesi pending/used/remaining etkisini dogru gosterir.
3. Izin talebi, gonderim, onay, red ve iptal akisi calisir.
4. Cakisan izin ve terminated employee talepleri engellenir.
5. Attendance kaydi ve fazla mesai hazirligi calisir.
6. Calisma plani ve calisana atama calisir.
7. Puantaj hesaplama, onay ve kilit MVP calisir.
8. Payroll prep rows olusur, ama bordro tutari hesaplanmaz.
9. Action Center/Notification/Audit best-effort entegrasyonu akisi bozmaz.
10. Next proxy contract, reporting ve readiness registry gunceldir.

## Known Gaps

Known gaps are tracked in [HRLeaveAttendanceKnownGaps.md](./HRLeaveAttendanceKnownGaps.md) and summarized in the final release gate risk list.
