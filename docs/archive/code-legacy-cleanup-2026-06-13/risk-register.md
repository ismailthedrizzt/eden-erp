# Code Legacy Cleanup Risk Register

<!-- source-of-truth-standard: contract overrides markdown -->

Generated: 2026-06-14T04:18:33.907Z

## Related Contracts

- `contracts/**`
- `contracts/page-flow-contracts.json`

## Related Guards

- `scripts/check-code-legacy-inventory.js`
- `npm run legacy:check`

## Generated Contract Debt Sprint

- Initial generated_from_existing_page debt count: 146
- Selected routes: `/app`, `/app/aboneligim`, `/app/profil`, `/app/sistem/kurulum`, `/login`, `/offline`
- Pages converted to manual_business_contract: 6
- Pages downgraded/planned/hidden/blocked: 0
- Pages intentionally retained as generated debt in selected batch: 0
- Guard changes: manual business contract usage must affect render/action behavior; hidden data-contract-route markers are rejected for runtime contract pages; generated implemented release pages are P1 until converted.
- Remaining generated_from_existing_page debt backlog: 132

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
| P1 | planned_page_has_real_ui_signals | app/app/sirket/demirbas/page.tsx | needs_manual_review | planned_page_has_real_ui_signals |
| P1 | contractize_real_ui_before_promotion | app/app/sirket/surecler/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
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
| P1 | planned_page_has_real_ui_signals | app/app/sozlesmeler/turler/page.tsx | needs_manual_review | planned_page_has_real_ui_signals |
| P1 | planned_page_has_real_ui_signals | app/app/sozlesmeler/yeni/page.tsx | needs_manual_review | planned_page_has_real_ui_signals |
| P1 | planned_page_has_real_ui_signals | app/app/sozlesmeler/yenilemeler/page.tsx | needs_manual_review | planned_page_has_real_ui_signals |
| P1 | contractize_real_ui_before_promotion | app/app/surecler/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | contractize_real_ui_before_promotion | app/app/surecler/[id]/page.tsx | needs_contractization | contractize_real_ui_before_promotion |
| P1 | planned_page_has_real_ui_signals | app/test/page.tsx | needs_manual_review | planned_page_has_real_ui_signals |

## Generated Contract Debt Sprint Batch 2

- Initial generated_from_existing_page debt: 140.
- Final generated_from_existing_page debt after selected batch: 132.
- P0 legacy issues: 0.
- Converted routes: /app/dashboard, /app/onboarding, /app/sirket, /app/muhasebe, /app/sistem, /app/sistem/genel, /app/sistem/teknik, /app/yardim.
- Downgrades: none.
- Retained generated debt in selected batch: none.
- Guard changes: none; existing fake-usage protections remain active.

| Severity | Route | Risk before | Mitigation | Residual risk |
| --- | --- | --- | --- | --- |
| P1 | /app/dashboard | navigation-visible generated redirect wrapper | Manual redirect contract drives target route | Low; compatibility redirect retained |
| P1 | /app/onboarding | navigation-visible generated redirect wrapper | Manual redirect contract drives target route | Low; compatibility redirect retained |
| P1 | /app/sirket | generated module hub real UI | Manual dashboard contract drives banner, cards, links, empty copy | Low; development route remains non-release |
| P1 | /app/muhasebe | generated wizard/lifecycle registry mismatch | Manual dashboard contract reflects actual module hub runtime | Low; deeper accounting pages remain backlog |
| P1 | /app/sistem | generated internal admin wrapper | Manual contract drives AdminConsolePage section | Low; internal route remains hidden from release |
| P1 | /app/sistem/genel | planned/generated placeholder with real AdminConsole runtime | Manual contract drives workspace section | Low; internal route remains hidden from release |
| P1 | /app/sistem/teknik | planned/generated placeholder with real AdminConsole runtime | Manual contract drives technical section | Low; internal route remains hidden from release |
| P1 | /app/yardim | generated help center real UI | Manual contract drives hero, actions, tour storage key, and topics | Low; development route remains non-release |
