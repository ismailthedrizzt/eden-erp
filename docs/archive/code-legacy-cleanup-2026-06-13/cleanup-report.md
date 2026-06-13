# Code Legacy Cleanup Sprint Report

<!-- source-of-truth-standard: contract overrides markdown -->

Generated: 2026-06-13T17:34:08.137Z

## Related Contracts

- `contracts/**`
- `contracts/pages/page-contract-registry.ts`
- `contracts/api/**/*.contract.ts`

## Related Guards

- `scripts/generate-code-legacy-inventory.js`
- `scripts/check-code-legacy-inventory.js`
- `npm run legacy:inventory`
- `npm run legacy:check`
- `npm run validate:contracts`

## 1. Inventory Counts

- scannedFiles: 2123
- routes: 152
- services: 534
- bffRoutes: 552
- residueHits: 194
- generatedContractItems: 146
- orphanCandidates: 0
- p0: 0
- p1: 191
- p2: 241
- safeDeleteCandidates: 11
- needsManualReview: 354
- activeRuntimeDependency: 866

## API Contractization Sprint Delta

1. Initial targeted remaining P1: 10.
2. Final targeted remaining P1: 0.
3. Accounting/NakitIslem decision: `accountingService.list/create/update/delete` stay as `keep_compatibility_adapter` for blocked/generated development accounting pages; no fake cash transaction contract was added because `/api/v1/accounting/cash-transactions` has no real FastAPI/domain owner.
4. Capital decrease decision: `companyService.requestCapitalDecrease` stays as a blocked lifecycle compatibility adapter with no protected page usage until a real operation-recorded capital decrease backend exists.
5. Company vehicle domain/schema decision: `companyVehicleService.list/references/create/update/delete` stay as `keep_compatibility_adapter`; current BFF proxies to after-sales installed assets, but company vehicle payload/reference semantics do not match backend DTOs.
6. API contract entries added/updated: none in this sprint; contract entries were intentionally not added for missing or schema-incompatible backend chains.
7. Backend/BFF files changed: none; no route or service was deleted.
8. Tests added: none; this pass added guard-visible adapter evidence and detector precision only.
9. Inventory detection improvements: explicit legacy service adapter markers, non-protected route evidence validation, safe blank directive parsing, and generator self-reference exclusion from usage literal counts.
10. Remaining backlog: general non-target P1/P2 inventory remains in the P1/P2 sections below.

## 2. P0 Findings

- No P0 findings remain.

## 3. P1 Findings

- P1: contractize_before_promotion (lib/services/accounting/bankAccounts.service.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/accounting/bankTransactions.service.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/accounting/capitalReconciliation.service.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/accounting/cariAccounts.service.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/accounting/cariTransactions.service.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/accounting/eDocuments.service.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/accounting/reconciliation.service.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/admin/adminService.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/dataQuality/dataQualityService.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/documents/documentRequirements.service.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/documents/documentService.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/hr/employees.service.ts) - missing API contract coverage; 1 API call(s)
- P1: contractize_before_promotion (lib/services/hr/employees.service.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/hr/leaveAttendance.service.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/importExport/bulkService.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/importExport/exportService.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/importExport/importService.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/licensing/licensingService.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/notifications/emailService.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/notifications/notificationService.ts) - missing API contract coverage; 1 API call(s)
- P1: contractize_before_promotion (lib/services/notifications/preferences.service.ts) - missing API contract coverage; 1 API call(s)
- P1: contractize_before_promotion (lib/services/notifications/reminderService.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/onboarding/onboardingService.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/search/commandPalette.service.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/search/searchService.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: add_migration_header_or_contractize (app/api/accounting/bank-accounts-cards/[id]/history/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/auth/logout/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/auth/me/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/auth/otp/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/auth/otp/send/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/auth/tenant-access/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/bulk/actions/[id]/confirm/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/bulk/actions/[id]/report/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/bulk/actions/[id]/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/bulk/actions/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/cron/document-thumbnails/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/data-quality/by-entity/[entity_type]/[entity_id]/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/data-quality/check/[entity_type]/[entity_id]/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/data-quality/check/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/data-quality/duplicates/[group_id]/dismiss/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/data-quality/duplicates/[group_id]/false-positive/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/data-quality/duplicates/[group_id]/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/data-quality/duplicates/detect/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/data-quality/duplicates/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/data-quality/merge/[merge_id]/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/data-quality/merge/confirm/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/data-quality/merge/preview/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/data-quality/rules/[rule_key]/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/data-quality/rules/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/data-quality/summary/route.ts) - missing migration header

## 4. P2 Findings

- P2: manual_review (lib/api/listEndpoint.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/api/publicApiBaseUrl.ts) - missing API contract coverage
- P2: delete_later_after_reference_scan (lib/api/serverResponseCache.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/accounting/accountingService.ts) - missing API contract coverage
- P2: delete_later_after_reference_scan (lib/services/accounting/accountingService.ts) - missing API contract coverage
- P2: retain_legacy_cash_adapter_until_accounting_domain_consolidation (lib/services/accountingService.ts) - legacy adapter evidence: accounting.cash_legacy_adapter; /app/muhasebe/borclar:development/blocked/generated_from_existing_page, /app/muhasebe/dashboard:development/blocked/generated_from_existing_page, /app/muhasebe/hesaplar:development/blocked/generated_from_existing_page, /app/muhasebe/islemler:development/blocked/generated_from_existing_page, /app/muhasebe/projeler:development/blocked/generated_from_existing_page; 1 API call(s); API path not covered by contracts/api
- P2: manual_review (lib/services/accountingService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/admin/adminService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/after-sales/afterSales.service.ts) - missing API contract coverage
- P2: delete_later_after_reference_scan (lib/services/after-sales/afterSales.service.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/ai/aiCopilot.service.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/automation/automationService.ts) - missing API contract coverage
- P2: manual_review (lib/services/companyService.ts) - serviceFunction appears in contracts/api
- P2: manual_review (lib/services/companyService.ts) - missing API contract coverage
- P2: retain_contract_covered_service (lib/services/companyService.ts) - serviceFunction appears in contracts/api; 1 API call(s)
- P2: retain_blocked_capital_decrease_request_until_operation_backend_exists (lib/services/companyService.ts) - legacy adapter evidence: company.capital_decrease_blocked_lifecycle_adapter; no direct protected consumer route references; 1 API call(s); API path not covered by contracts/api
- P2: retain_company_vehicle_adapter_until_vehicle_domain_contractization (lib/services/companyVehicleService.ts) - legacy adapter evidence: company.vehicle_blocked_development_adapter; /app/sirket/araclar:development/blocked/generated_from_existing_page; 1 API call(s); API path not covered by contracts/api
- P2: manual_review (lib/services/companyVehicleService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/contracts/contractService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/crm/crmService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/documents/documentService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/employeeService.ts) - missing API contract coverage
- P2: retain_contract_covered_service (lib/services/facilityService.ts) - serviceFunction appears in contracts/api; 1 API call(s)
- P2: retain_used_service_or_helper (lib/services/facilityService.ts) - missing API contract coverage
- P2: retain_contract_covered_service (lib/services/hr/employees.service.ts) - serviceFunction appears in contracts/api; 1 API call(s)
- P2: retain_contract_covered_service (lib/services/hr/employment.service.ts) - serviceFunction appears in contracts/api; 1 API call(s)
- P2: retain_used_service_or_helper (lib/services/hr/hrService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/hr/leaveAttendance.service.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/importExport/exportService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/importExport/importService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/integrations/integrationService.ts) - missing API contract coverage
- P2: delete_later_after_reference_scan (lib/services/notifications/processNotification.server.ts) - missing API contract coverage; Supabase reference
- P2: retain_contract_covered_service (lib/services/organizationService.ts) - serviceFunction appears in contracts/api; 1 API call(s)
- P2: retain_used_service_or_helper (lib/services/organizationService.ts) - missing API contract coverage
- P2: retain_contract_covered_service (lib/services/ownershipTransactionsService.ts) - serviceFunction appears in contracts/api; 1 API call(s)
- P2: retain_used_service_or_helper (lib/services/ownershipTransactionsService.ts) - serviceFunction appears in contracts/api
- P2: retain_used_service_or_helper (lib/services/portal/portalService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/processCenterService.ts) - missing API contract coverage
- P2: delete_later_after_reference_scan (lib/services/processCenterService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/product-services/productCatalog.service.ts) - missing API contract coverage
- P2: delete_later_after_reference_scan (lib/services/product-services/productCatalog.service.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/projects/projectService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/projects/projects.service.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/projects/tasks.service.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/reporting/reportingService.ts) - missing API contract coverage
- P2: manual_review (lib/services/security/securityService.ts) - missing API contract coverage
- P2: retain_contract_covered_service (lib/services/themeManagementService.ts) - serviceFunction appears in contracts/api; 1 API call(s)
- P2: manual_review_runtime_residue (app/api/accounting/_banking.ts) - Supabase, @supabase/supabase-js in app/api/accounting/_banking.ts
- P2: manual_review_runtime_residue (app/api/accounting/bank-accounts-cards/[id]/passivate/route.ts) - Supabase in app/api/accounting/bank-accounts-cards/[id]/passivate/route.ts
- P2: manual_review_runtime_residue (app/api/accounting/bank-accounts-cards/[id]/route.ts) - Supabase in app/api/accounting/bank-accounts-cards/[id]/route.ts

## 5. Safe Cleanup Performed

- Added guard-visible compatibility adapter markers for the targeted accounting, capital decrease, and company vehicle service methods.
- Improved inventory detection for explicit adapter evidence and self-reference false positives.
- Regenerated concise AI context inventory and detailed archive reports; no route or service deletion performed.

## 6. Files Changed

- `scripts/generate-code-legacy-inventory.js`
- `lib/services/accountingService.ts`
- `lib/services/companyService.ts`
- `lib/services/companyVehicleService.ts`
- `docs/ai-context/code-legacy-inventory.md`
- `docs/archive/code-legacy-cleanup-2026-06-13/raw-code-legacy-inventory.md`
- `docs/archive/code-legacy-cleanup-2026-06-13/cleanup-report.md`
- `docs/archive/code-legacy-cleanup-2026-06-13/risk-register.md`

## 7. Files Intentionally Not Deleted

- Route files: retained.
- API/BFF route files: retained.
- Service files: retained.
- Generated contracts: retained.
- Backend domain services: retained.
- DB migrations: retained.
- Auth/security code: retained.
- Hidden aliases and demo/dev routes: retained.

## 8. Legacy Aliases Retained

- /: keep_redirect (release=hidden; implementation=hidden; redirect-only page; no real UI signals)
- /app/design-lab: keep_redirect (release=hidden; implementation=hidden; redirect-only page; no real UI signals; legacy/deprecated signal)
- /app/satis/sozlesmeler: keep_hidden_wrapper (release=hidden; implementation=hidden; real UI signals present; legacy/deprecated signal)
- /app/sirket/paydaslar: keep_hidden_wrapper (release=hidden; implementation=hidden; no real UI signals; legacy/deprecated signal)
- /app/sistem/temalar: keep_hidden_wrapper (release=hidden; implementation=hidden; real UI signals present; legacy/deprecated signal)
- /ayarlar/entegrasyon-ayarlari: keep_redirect (release=hidden; implementation=hidden; redirect-only page; no real UI signals; legacy/deprecated signal)
- /ik/personel: keep_redirect (release=hidden; implementation=hidden; redirect-only page; no real UI signals; legacy/deprecated signal)
- /muhasebe: keep_redirect (release=hidden; implementation=hidden; redirect-only page; no real UI signals; legacy/deprecated signal)
- /muhasebe/banka-hesaplari-ve-kartlari: keep_redirect (release=hidden; implementation=hidden; redirect-only page; no real UI signals; legacy/deprecated signal)
- /muhasebe/banka-kart-hareketleri: keep_redirect (release=hidden; implementation=hidden; redirect-only page; no real UI signals; legacy/deprecated signal)
- /muhasebe/cari-hareketler: keep_redirect (release=hidden; implementation=hidden; redirect-only page; no real UI signals; legacy/deprecated signal)
- /muhasebe/cari-kartlar: keep_redirect (release=hidden; implementation=hidden; redirect-only page; no real UI signals; legacy/deprecated signal)
- /muhasebe/hesap-ve-kart-hareketleri: keep_redirect (release=hidden; implementation=hidden; redirect-only page; no real UI signals; legacy/deprecated signal)
- /muhasebe/on-muhasebe-hareketleri: keep_redirect (release=hidden; implementation=hidden; redirect-only page; no real UI signals; legacy/deprecated signal)

## 9. Supabase/Vercel Residue Classification

- needs_manual_review: 185
- active_runtime_dependency: 9

## 10. Generated/Blocked Contract Debt

- P1: planned_page_has_real_ui_signals (app/app/aboneligim/page.tsx) - implementation=planned; contractSource=generated_from_existing_page; release=release; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/ayarlar/bildirimler/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/belgeler/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/ik/personel/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/muhasebe/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/muhasebe/banka-hesaplari-ve-kartlari/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/muhasebe/banka-kart-hareketleri/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/muhasebe/borclar/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/muhasebe/cari-hareketler/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/muhasebe/cari-kartlar/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/muhasebe/dashboard/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/muhasebe/hesap-ve-kart-hareketleri/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/muhasebe/hesaplar/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/muhasebe/islemler/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/muhasebe/on-muhasebe-hareketleri/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/muhasebe/projeler/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/sirket/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/sirket/araclar/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/sirket/companies/stakeholders/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: planned_page_has_real_ui_signals (app/app/sirket/demirbas/page.tsx) - implementation=planned; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/sirket/surecler/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/sirket/tesisler/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/sirket/teskilat/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/sistem/audit/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/sistem/e-postalar/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/sistem/entegrasyon-ayarlari/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/sistem/export/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/sistem/import/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/sistem/kullanici-talepleri/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/sistem/lisanslar/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/sistem/module-licenses/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/sistem/system-parameters/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/sistem/veri-kalitesi/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/sozlesmeler/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: planned_page_has_real_ui_signals (app/app/sozlesmeler/fesihler/page.tsx) - implementation=planned; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: planned_page_has_real_ui_signals (app/app/sozlesmeler/turler/page.tsx) - implementation=planned; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: planned_page_has_real_ui_signals (app/app/sozlesmeler/yeni/page.tsx) - implementation=planned; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: planned_page_has_real_ui_signals (app/app/sozlesmeler/yenilemeler/page.tsx) - implementation=planned; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/surecler/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/surecler/[id]/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/yardim/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present
- P1: planned_page_has_real_ui_signals (app/test/page.tsx) - implementation=planned; contractSource=generated_from_existing_page; release=development_demo; real UI signals present

## 11. Commands Run

- `npm run legacy:inventory`
- `npm run legacy:check`
- `npm run contract:backend-drift`
- `npm run contract:lifecycle`
- `npm run validate:contracts`
- `npm run build`
- `npm run typecheck`

## 12. Exact Results

- `npm run legacy:inventory`: PASS; P0 0, P1 191, P2 241; targeted remaining P1 0.
- `npm run legacy:check`: PASS; P0 legacy findings 0.
- `npm run contract:backend-drift`: PASS; warnings 0, errors 0.
- `npm run contract:lifecycle`: PASS; warnings 0, errors 0.
- `npm run validate:contracts`: PASS; backend drift 0; lifecycle 0; docs source errors 0; legacy P0 0.
- `npm run build`: PASS; Next.js build completed.
- `npm run typecheck`: PASS.
- Backend pytest: not run in this sprint because backend files were not changed.

## 13. Remaining Backlog

- Remaining targeted P1 service backlog: 0.
- Overall inventory backlog after this sprint: P1 191 and P2 241.
- Review P1 findings before promoting development/hidden routes.
- Contractize API-calling services that are used by implemented pages but not yet in `contracts/api`.
- Review Supabase/Vercel runtime residue by approved layer before dependency removal.
