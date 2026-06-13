# Code Legacy Cleanup Sprint Report

<!-- source-of-truth-standard: contract overrides markdown -->

Generated: 2026-06-13T15:10:41.320Z

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

- scannedFiles: 2118
- routes: 152
- services: 534
- bffRoutes: 552
- residueHits: 192
- generatedContractItems: 146
- orphanCandidates: 0
- p0: 0
- p1: 171
- p2: 247
- safeDeleteCandidates: 11
- needsManualReview: 321
- activeRuntimeDependency: 1041

## 2. P0 Findings

- No P0 findings remain.

## 3. P1 Findings

- P1: contractize_before_promotion (lib/services/accountingService.ts) - missing API contract coverage; 4 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/companyService.ts) - missing API contract coverage; 20 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/companyVehicleService.ts) - missing API contract coverage; 4 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/facilityService.ts) - missing API contract coverage; 4 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/organizationService.ts) - missing API contract coverage; 1 API call(s)
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
- P1: add_migration_header_or_contractize (app/api/documents/[id]/access-logs/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/documents/[id]/download-url/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/documents/[id]/new-version/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/documents/[id]/preview-url/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/documents/[id]/reject/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/documents/[id]/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/documents/[id]/verify/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/documents/by-entity/[entity_type]/[entity_id]/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/documents/by-entity/[entity_type]/[entity_id]/upload/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/documents/expired/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/documents/expiring/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/documents/requirements/[module_key]/[operation_key]/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/documents/requirements/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/documents/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/documents/upload/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/export/jobs/[id]/download/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/export/jobs/[id]/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/export/jobs/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/import/jobs/[id]/cancel/route.ts) - missing migration header
- P1: add_migration_header_or_contractize (app/api/import/jobs/[id]/confirm/route.ts) - missing migration header

## 4. P2 Findings

- P2: manual_review (lib/api/listEndpoint.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/api/publicApiBaseUrl.ts) - missing API contract coverage
- P2: delete_later_after_reference_scan (lib/api/serverResponseCache.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/accounting/accountingService.ts) - missing API contract coverage
- P2: delete_later_after_reference_scan (lib/services/accounting/accountingService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/accounting/bankAccounts.service.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/accounting/bankTransactions.service.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/accounting/capitalReconciliation.service.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/accounting/cariAccounts.service.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/accounting/cariTransactions.service.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/accounting/eDocuments.service.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/accounting/reconciliation.service.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/admin/adminService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/after-sales/afterSales.service.ts) - missing API contract coverage
- P2: delete_later_after_reference_scan (lib/services/after-sales/afterSales.service.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/ai/aiCopilot.service.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/automation/automationService.ts) - missing API contract coverage
- P2: retain_contract_covered_service (lib/services/companyService.ts) - serviceFunction appears in contracts/api; 20 API call(s); API path not covered by contracts/api
- P2: retain_used_service_or_helper (lib/services/contracts/contractService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/crm/crmService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/dataQuality/dataQualityService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/documents/documentRequirements.service.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/documents/documentService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/employeeService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/hr/employees.service.ts) - serviceFunction appears in contracts/api
- P2: retain_used_service_or_helper (lib/services/hr/employees.service.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/hr/employment.service.ts) - serviceFunction appears in contracts/api
- P2: retain_used_service_or_helper (lib/services/hr/hrService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/hr/leaveAttendance.service.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/importExport/bulkService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/importExport/exportService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/importExport/importService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/integrations/integrationService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/licensing/licensingService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/notifications/emailService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/notifications/notificationService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/notifications/preferences.service.ts) - missing API contract coverage
- P2: delete_later_after_reference_scan (lib/services/notifications/processNotification.server.ts) - missing API contract coverage; Supabase reference
- P2: retain_used_service_or_helper (lib/services/notifications/reminderService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/onboarding/onboardingService.ts) - missing API contract coverage
- P2: retain_contract_covered_service (lib/services/organizationService.ts) - serviceFunction appears in contracts/api; 1 API call(s)
- P2: retain_contract_covered_service (lib/services/ownershipTransactionsService.ts) - serviceFunction appears in contracts/api; 3 API call(s); API path not covered by contracts/api
- P2: retain_used_service_or_helper (lib/services/portal/portalService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/processCenterService.ts) - missing API contract coverage
- P2: delete_later_after_reference_scan (lib/services/processCenterService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/product-services/productCatalog.service.ts) - missing API contract coverage
- P2: delete_later_after_reference_scan (lib/services/product-services/productCatalog.service.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/projects/projectService.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/projects/projects.service.ts) - missing API contract coverage
- P2: retain_used_service_or_helper (lib/services/projects/tasks.service.ts) - missing API contract coverage

## 5. Safe Cleanup Performed

- Added legacy inventory generation and P0-only legacy guard scripts.
- Added concise AI context inventory and detailed archive reports.
- Corrected release-visible blocked metadata only where validated as real active pages; no route or service deletion performed.

## 6. Files Changed

- `scripts/generate-code-legacy-inventory.js`
- `scripts/check-code-legacy-inventory.js`
- `package.json`
- `docs/ai-context/code-legacy-inventory.md`
- `docs/ai-context/collaboration-guide.md`
- `docs/ai-context/contracts-and-guards.md`
- `docs/archive/code-legacy-cleanup-2026-06-13/**`
- `contracts/pages/page-contract-registry.ts` when release-visible blocked metadata is corrected.

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

- needs_manual_review: 183
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
- `npm run docs:source-check`
- `npm run validate:contracts`
- `npm run build`
- `npm run typecheck`

## 12. Exact Results

- `npm run legacy:inventory`: PASS. scannedFiles=2118, routes=152, services=534, bffRoutes=552, residueHits=192, generatedContractItems=146, orphanCandidates=0, P0=0, P1=171, P2=247.
- `npm run legacy:check`: PASS. P0 findings=0.
- `npm run docs:source-check`: PASS. markdown files scanned=609, source-of-truth docs=405, ai-context docs=8, archived docs=196, audit allowlist entries=1, errors=0.
- `npm run validate:contracts`: PASS. contracts/page-flow/frontend/release/backend-drift/lifecycle/docs/legacy guards passed. contract:usage warnings=3, errors=0.
- `npm run build`: PASS. validate:contracts, encoding:guard, backend:boundary:enforce, and Next production build completed. Existing Next lint warnings remain; build exit code=0.
- `npm run typecheck`: PASS. shared TypeScript check passed; targeted TypeScript check passed for 4 files.
- Backend tests: not run because no backend files were changed in this sprint.

Remaining warnings:

- `/app/ik/calisanlar`: page writes lifecycle-like status fields; backend lifecycle guard must cover this path.
- `/app/sirket/companies`: page writes lifecycle-like status fields; backend lifecycle guard must cover this path.
- `/app/sirket/companies/partners`: page writes lifecycle-like status fields; backend lifecycle guard must cover this path.
- Existing Next lint warnings remain from pre-existing hook dependency and `<img>` usage locations; build passes.

Files deleted: 0.

Files retained intentionally: 626 unique files classified as active runtime dependency, keep_redirect, or keep_compatibility_adapter were retained; 1041 active runtime dependency inventory items remain. Route files, API/BFF route files, service files, generated contracts, backend domain services, DB migrations, auth/security code, hidden aliases, and demo/dev routes were retained.

## 13. Remaining Backlog

- Review P1 findings before promoting development/hidden routes.
- Contractize API-calling services that are used by implemented pages but not yet in `contracts/api`.
- Review Supabase/Vercel runtime residue by approved layer before dependency removal.
