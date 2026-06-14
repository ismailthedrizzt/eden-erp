# Code Legacy Cleanup Risk Register

<!-- source-of-truth-standard: contract overrides markdown -->

Generated: 2026-06-14T05:04:06.136Z

## Related Contracts

- `contracts/**`
- `contracts/page-flow-contracts.json`

## Related Guards

- `scripts/check-code-legacy-inventory.js`
- `npm run legacy:check`

## Generated Contract Debt Sprint Batch 3

- Initial generated_from_existing_page debt: 132
- Selected routes: `/app/ik/teskilat`, `/app/sirket/demirbas`, `/app/sirket/surecler`, `/app/sozlesmeler/turler`, `/app/satis-sonrasi`, `/app/urun-ve-hizmetler`
- Real UI routes selected: 6 (`/app/ik/teskilat` list/tree/service-backed UI, `/app/sozlesmeler/turler` registry list UI, and 4 action/dashboard hub UIs)
- Converted to manual_business_contract: 6
- Downgraded/planned/hidden: 0
- Retained as generated debt in selected batch: 0
- Guard changes: none; existing fake-usage rejection stayed unchanged.
- Backend files changed: no.
- Backend pytest: not run because no backend files changed.
- Remaining generated_from_existing_page debt: 126
- Remaining P1/P2 backlog: P1 61, P2 241.

| Route | Page file | Release status | Navigation/Search visibility | Implementation status | Contract source | Page kind | UI type | Service calls? | Risk | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| /app/ik/teskilat | app/app/ik/teskilat/page.tsx | development | navigation/search/command visible | implemented | manual_business_contract | list | organization tree, staffing cards, staffing list | yes, `organizationService.list` covered by HR employee API contract | implemented generated page with real list/service UI | converted_to_manual_business_contract |
| /app/sirket/demirbas | app/app/sirket/demirbas/page.tsx | development | navigation/search/command visible | implemented | manual_business_contract | dashboard | action dashboard | no | generated hub with real action UI | converted_to_manual_business_contract |
| /app/sirket/surecler | app/app/sirket/surecler/page.tsx | development | navigation/search/command visible | implemented | manual_business_contract | dashboard | action dashboard | no | generated hub with real action UI | converted_to_manual_business_contract |
| /app/sozlesmeler/turler | app/app/sozlesmeler/turler/page.tsx | development | navigation/search/command visible | implemented | manual_business_contract | list | contract type registry list | no | implemented generated page with real list UI | converted_to_manual_business_contract |
| /app/satis-sonrasi | app/app/satis-sonrasi/page.tsx | development | navigation/search/command visible | implemented | manual_business_contract | dashboard | action dashboard | no | generated hub with real action UI | converted_to_manual_business_contract |
| /app/urun-ve-hizmetler | app/app/urun-ve-hizmetler/page.tsx | development | navigation/search/command visible | implemented | manual_business_contract | dashboard | action dashboard | no | generated hub with real action UI | converted_to_manual_business_contract |

### Batch 3 Contract Decisions

- `/app/ik/teskilat` now derives dashboard copy, tabs, stats, tree/list labels, staffing columns, empty states, and action labels from `contracts/pages/hr/organization-staffing.page.contract.ts` and `contracts/lists/hr/organization-staffing.list.contract.ts`.
- `/app/sozlesmeler/turler` now derives registry rows, table columns, empty state, and page actions from `contracts/pages/contracts/contract-types.page.contract.ts` and `contracts/lists/contracts/contract-types.list.contract.ts`.
- `/app/sirket/demirbas`, `/app/sirket/surecler`, `/app/satis-sonrasi`, and `/app/urun-ve-hizmetler` now render their action dashboard behavior from manual page contracts instead of generated contracts or wrapper components.
- Accounting cash pages, project/task pages, and contract mutation pages were intentionally not selected because their service/API/backend contract chains require separate backend/API contractization work.

### Batch 3 Commands And Exact Results

- `npm run legacy:inventory`: PASS; generated contract items 126, P0 0, P1 61, P2 241.
- `npm run legacy:check`: PASS; P0 findings 0.
- `npm run contracts:check`: PASS; 152 page contracts, 0 missing, 0 temporary exceptions.
- `npm run contract:usage`: PASS with existing 3 lifecycle warnings only.
- `npm run contract:backend-drift`: PASS; warnings 0, errors 0.
- `npm run contract:lifecycle`: PASS; warnings 0, errors 0.
- `npm run docs:source-check`: PASS; errors 0.
- `npm run validate:contracts`: PASS; P0 legacy findings 0.
- `npm run build`: PASS; existing lint warnings only.
- `npm run typecheck`: PASS.

## Generated Contract Debt Sprint

- Initial generated_from_existing_page debt count: 146
- Selected routes: `/app`, `/app/aboneligim`, `/app/profil`, `/app/sistem/kurulum`, `/login`, `/offline`
- Pages converted to manual_business_contract: 6
- Pages downgraded/planned/hidden/blocked: 0
- Pages intentionally retained as generated debt in selected batch: 0
- Guard changes: manual business contract usage must affect render/action behavior; hidden data-contract-route markers are rejected for runtime contract pages; generated implemented release pages are P1 until converted.
- Remaining generated_from_existing_page debt backlog: 126

| Route | Page file | Release status | Implementation status | Contract source | Page kind | Real UI? | Risk | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| /app | app/app/page.tsx | release | implemented | manual_business_contract | dashboard | yes | release_real_ui_generated_debt | converted_to_manual_business_contract |
| /app/aboneligim | app/app/aboneligim/page.tsx | release | implemented | manual_business_contract | dashboard | yes | release_real_ui_generated_debt | converted_to_manual_business_contract |
| /app/profil | app/app/profil/page.tsx | release | implemented | manual_business_contract | form | yes | release_real_ui_generated_debt | converted_to_manual_business_contract |
| /app/sistem/kurulum | app/app/sistem/kurulum/page.tsx | release | implemented | manual_business_contract | wizard | yes | release_real_ui_generated_debt | converted_to_manual_business_contract |
| /login | app/login/page.tsx | release | implemented | manual_business_contract | shell | no | release_shell_generated_debt | converted_to_manual_business_contract |
| /offline | app/offline/page.tsx | release | implemented | manual_business_contract | shell | no | release_shell_generated_debt | converted_to_manual_business_contract |


| Severity | Risk | File/Route | Classification | Mitigation |
| --- | --- | --- | --- | --- |
| P1 | contractize_before_promotion | lib/services/accounting/bankAccounts.service.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/accounting/bankTransactions.service.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/accounting/capitalReconciliation.service.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/accounting/cariAccounts.service.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/accounting/cariTransactions.service.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/accounting/eDocuments.service.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/accounting/reconciliation.service.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/admin/adminService.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/dataQuality/dataQualityService.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/documents/documentRequirements.service.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/documents/documentService.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/hr/employees.service.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/hr/employees.service.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/hr/leaveAttendance.service.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/importExport/bulkService.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/importExport/exportService.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/importExport/importService.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/licensing/licensingService.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/licensing/licensingService.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/notifications/emailService.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/notifications/notificationService.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/notifications/preferences.service.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/notifications/reminderService.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/onboarding/onboardingService.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/search/commandPalette.service.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/search/searchService.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/ayarlar/bildirimler/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/belgeler/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/ik/personel/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/muhasebe/banka-hesaplari-ve-kartlari/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/muhasebe/banka-kart-hareketleri/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/muhasebe/borclar/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/muhasebe/cari-hareketler/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/muhasebe/cari-kartlar/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/muhasebe/dashboard/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/muhasebe/hesap-ve-kart-hareketleri/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/muhasebe/hesaplar/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/muhasebe/islemler/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/muhasebe/on-muhasebe-hareketleri/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/muhasebe/projeler/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/sirket/araclar/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/sirket/companies/stakeholders/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/sirket/tesisler/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/sirket/teskilat/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/sistem/audit/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/sistem/e-postalar/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/sistem/entegrasyon-ayarlari/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/sistem/export/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/sistem/import/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/sistem/kullanici-talepleri/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/sistem/lisanslar/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/sistem/module-licenses/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/sistem/system-parameters/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/sistem/veri-kalitesi/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/sozlesmeler/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | planned_page_has_real_ui_signals | app/app/sozlesmeler/fesihler/page.tsx | needs_manual_review | planned_page_has_real_ui_signals |
| P1 | planned_page_has_real_ui_signals | app/app/sozlesmeler/yeni/page.tsx | needs_manual_review | planned_page_has_real_ui_signals |
| P1 | planned_page_has_real_ui_signals | app/app/sozlesmeler/yenilemeler/page.tsx | needs_manual_review | planned_page_has_real_ui_signals |
| P1 | contractize_real_ui_before_promotion | app/app/surecler/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/surecler/[id]/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | planned_page_has_real_ui_signals | app/test/page.tsx | needs_manual_review | planned_page_has_real_ui_signals |
