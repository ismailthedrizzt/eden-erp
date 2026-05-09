# Employees Dashboard

The Employees dashboard is the first visible implementation of the generic dashboard widget system.

Default layout:

- Toplam Çalışan: KPI, 4 columns x 2 rows
- Cinsiyet Dağılımı: 100% stacked bar, 4 columns x 1 row
- Eğitim Dağılımı: 100% stacked bar, 4 columns x 1 row
- Çalışma Tipi: 100% stacked bar, 4 columns x 1 row
- Departman Dağılımı: 100% stacked bar, 4 columns x 1 row
- Yaş Grubu: 100% stacked bar, 4 columns x 1 row
- İşe Giriş Trendi: optional trend widget
- Departman Detayı: optional distribution widget
- Yaklaşan Aksiyonlar: optional action list widget

Employee-specific code lives only under:

- `lib/modules/employees/dashboard/employeesDashboard.config.ts`
- `lib/modules/employees/dashboard/employeesDashboard.mock.ts`

The dashboard components under `components/dashboard` remain reusable for all future modules.

Click behavior:

Stacked bar segments emit a generic dashboard filter event. The Çalışanlar page currently applies that filter to the visible SmartList data and offers a clear-filter action.
