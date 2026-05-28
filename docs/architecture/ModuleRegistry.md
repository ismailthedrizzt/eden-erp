# Module Registry

Module Registry, Eden ERP icindeki modullerin statik sozlesmesini tutar. Bir modulun hangi entity, route, menu, permission, action, projection ve event sozlesmelerini getirdigi burada tanimlanir.

Registry runtime karar vermez. Runtime kararlar `ModuleFeatureResolver` tarafindadir.

## Katmanlar

- Module Registry: Modulun sistemde ne getirdigini tanimlar.
- Feature Resolver: Modulun bu tenant/user icin aktif, lisansli ve kurulumu tamam olup olmadigini belirler.
- Permission Registry: Kullanicinin ne yapabilecegini belirler.
- Process Engine: Islemin adimlarini ve surec durumlarini yonetecek katmandir.
- Operation Orchestrator: Kritik veri degisikligini guvenli ve idempotent sekilde yapar.
- Projection Registry: Liste ve ozetler icin read model sozlesmesini saglar.
- Action Guide Registry: Kullanici niyetini dogru islem yoluna baglar.

## Ilk Contract Seti

Ilk fazda statik contract dosyalari `lib/modules/contracts` altinda tutulur:

- `companies`
- `partners`
- `representatives`
- `branches`
- `organization`
- `facilities`
- `accounting`
- `hr`
- `project_management`
- `product_services`
- `after_sales`
- `settings`

Bu contract'lar `lib/modules/moduleRegistry.ts` tarafindan tek registry listesine baglanir.

## Dependency Resolver

`lib/modules/moduleDependencyResolver.ts` required ve optional bagimliliklari cozer.

Ornek:

- `branches`, `companies` modulu olmadan calisamaz.
- `branches`, `organization` ve `facilities` olmadan calisabilir; fakat sube acilisinda otomatik organizasyon/tesis baglantisi icin uyari uretir.
- `representatives`, `branches` olmadan kapanmaz; branch scoped authority icin uyari uretir.

## Feature Resolver

`lib/modules/moduleFeatureResolver.ts` mevcut lisans/ayar verisiyle uyumlu calisir. Runtime sonuc:

```ts
{
  moduleKey: string
  enabled: boolean
  licensed: boolean
  setupComplete: boolean
  status: 'available' | 'disabled' | 'unlicensed' | 'setup_required' | 'dependency_missing'
  blocking_reasons: string[]
  warnings: string[]
}
```

Runtime veri bulunamazsa `defaultEnabled` kullanilir. Setup bilgisi yoksa mevcut akisi bozmamak icin kurulum tamam kabul edilir.

## Guard Stratejisi

`lib/modules/moduleGuards.ts` API route'lari icin standart is dili response'u uretir. Teknik hata yerine modul durumu aciklanir:

```json
{
  "error": "Subelerimiz modulu bu calisma alaninda aktif degil.",
  "code": "MODULE_DISABLED",
  "details": {
    "moduleKey": "branches",
    "status": "disabled"
  }
}
```

Ilk entegrasyon branch list/card ve branch opening/closing resmi islem route'larinda yapildi.

## Session ve UI

`/api/session/bootstrap` response'una `modules` alani eklendi. Client `ModuleProvider` bu veriyi runtime module bilgisine donusturur; eski store davranisi yalnizca migration bridge olarak kalabilir.

Sidebar simdilik module key mapping kullanir. Menu item'lari `moduleKey` ile contract module key'e eslenebilir; ileride menu tamamen `ModuleContract.menus` alanindan uretilebilir. Obsolete menu aliases import kalmadiginda silinmelidir.

## Action Guide Hazirligi

Action Guide, `findActionContract` ile action'in hangi module ait oldugunu bulabilir. Modul disabled veya unlicensed ise action onerilmez. Setup veya dependency eksigi varsa action gorunebilir, ancak `can_start_now` false doner ve blocking reason verir.

## Projection Hazirligi

`ModuleContract.projections` alanlari Projection Registry key'leriyle uyumlu olacak sekilde tutulur. Eksik projection key build'i kirmadan warning uretir; boylece registry asamali genisletilebilir.

## Accounting Contract Update

Accounting module contract artik cari MVP temelini tasir:

- Entities: `accounting_cari_account`, `accounting_cari_transaction`,
  `accounting_reconciliation_link`, `accounting_transaction_attachment`
- Permissions: `accounting.view`, `accounting.edit`,
  `accounting.transactionCreate`, `accounting.transactionApprove`,
  `accounting.reconcile`, `accounting.export`
- Actions: `create_cari_account`, `create_cari_transaction`,
  `reconcile_transaction`, `cancel_transaction`
- Feature flags: `accounting.enabled`, `accounting.cariAccounts`,
  `accounting.cariTransactions`, `accounting.bankReconciliation`,
  `accounting.invoiceMatching`, `accounting.capitalReconciliation`
- Navigation: `Muhasebe > Cari Kartlar` and `Muhasebe > Cari Hareketler`

Accounting runtime karar vermez; cari kart/cari hareket readiness, permission ve
company scope kontrolleri FastAPI Accounting domain servisleri tarafindan
uygulanir. Next route'lari proxy-only adapter olarak kalir.

## HR Contract Update

HR module contract artik calisan ve istihdam lifecycle MVP temelini tasir:

- Entities: `hr_employee`, `hr_employment_record`, `hr_employment_transaction`,
  `hr_employee_document`
- Permissions: `hr.view`, `hr.edit`, `hr.employeeCreate`,
  `hr.employmentStart`, `hr.employmentTerminate`, `hr.assignmentChange`,
  `hr.documentsManage`, `hr.sensitiveView`
- Actions: `create_employee_draft`, `start_employment`,
  `terminate_employment`, `change_assignment`, `mark_sgk_entry_completed`,
  `mark_sgk_exit_completed`, `manage_employee_documents`
- Feature flags: `hr.enabled`, `hr.employees`, `hr.employmentLifecycle`,
  `hr.sgkManualTracking`, `hr.employeeDocuments`, `hr.positionAssignment`,
  `hr.salaryBasicInfo`
- Navigation: `IK > Calisanlar`; `Istihdam Islemleri`, `Ozluk Belgeleri` and
  `SGK Islemleri` future menu items remain feature-flagged.

HR runtime karar vermez; calisan karti, istihdam lifecycle, SGK ve belge
readiness, permission ve company scope kontrolleri FastAPI HR domain servisleri
tarafindan uygulanir. Next route'lari proxy-only adapter olarak kalir.

## Project Management Contract Update

Project Management module contract artik proje/gorev MVP temelini tasir:

- Entities: `project_project`, `project_task`, `project_task_comment`,
  `project_task_attachment`
- Permissions: `projects.view`, `projects.edit`, `projects.create`,
  `projects.delete`, `tasks.view`, `tasks.create`, `tasks.edit`,
  `tasks.assign`, `tasks.transition`, `tasks.comment`,
  `tasks.attachmentsManage`, `tasks.delete`, `projects.admin`
- Actions: `create_project`, `update_project`, `complete_project`,
  `cancel_project`, `create_project_task`, `assign_project_task`,
  `transition_project_task`, `comment_project_task`, `attach_project_task`
- Feature flags: `projectManagement.enabled`, `projectManagement.projects`,
  `projectManagement.tasks`, `projectManagement.kanban`,
  `projectManagement.comments`, `projectManagement.attachments`,
  `projectManagement.timeTracking`, `projectManagement.sprints`
- Navigation: `Proje ve Gorevler > Projeler`, `Gorevler`, `Bana Atananlar`
  and `Kanban`

Process Engine gorevleri `process_task`, Project Management gorevleri
`project_task` olarak ayridir. Action Center iki kaynagi birlikte gosterebilir,
ancak module contract ve backend lifecycle ayridir.
