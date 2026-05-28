# Default Roles Matrix

| Rol | Amac | Default scope | Risk | Ana permissionlar |
| --- | --- | --- | --- | --- |
| Sistem Yoneticisi | Tum moduller, ayarlar, audit ve kullanici/rol yonetimi | `all_companies` | critical | `system.admin` |
| Sirket Yoneticisi | Sirket, ortak, temsilci, sube ve resmi operation yonetimi | `assigned_companies` | high | `companies.*Start`, `branches.*Start`, `partners.ownershipStart`, `representatives.authority*`, `reporting.dashboardView` |
| Muhasebe Kullanicisi | Cari kartlar, cari hareketler, mutabakat ve finansal KPI | `assigned_companies` | medium | `accounting.view`, `accounting.edit`, `accounting.transactionCreate`, `accounting.reconcile`, `reporting.viewFinancial` |
| IK Kullanicisi | Calisan kartlari, istihdam lifecycle ve SGK manuel takip | `assigned_companies` | medium | `hr.view`, `hr.edit`, `hr.employeeCreate`, `hr.employmentStart`, `hr.employmentTerminate`, `hr.documentsManage` |
| Operasyon Kullanicisi | Sube, tesis/lokasyon, proje/gorev ve satis sonrasi servis | `assigned_branches` | medium | `branches.view`, `facilities.edit`, `tasks.*`, `afterSales.*` |
| Denetci | Read-only genis gorunum ve compliance/audit raporlari | `read_only` | medium | `*.view`, `reporting.viewAuditSummary`, `audit.view` |
| Standart Kullanici | Kendi gorevleri ve Action Center | `own_tasks_only` | low | `tasks.view`, `tasks.comment`, `actionCenter.view` |
| Dis Kullanici / Musteri Portali | Future musteri portal erisimi | `custom` | low | Bu fazda aktif permission yok |

Notlar:

- Varsayilan sistem rolleri DB yokken de UI'da gorunur.
- Sistem rollerinin dogrudan permission edit'i kilitlidir; ozel rol olusturulup kullaniciya atanmalidir.
- Role sahip olmak sirket/sube kapsamindan bagimsiz degildir; scope kontrolleri ayri calisir.
