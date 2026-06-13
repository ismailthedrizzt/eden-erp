# Code Legacy Inventory

Status: controlled cleanup sprint inventory
Generated: 2026-06-13T16:51:30.654Z

This file is the concise AI-facing inventory for code legacy cleanup. Contracts and guards remain the executable source of truth; Markdown cannot override contracts.

## Related Contracts

- `contracts/**`
- `contracts/page-flow-contracts.json`
- `contracts/pages/page-contract-registry.ts`
- `contracts/api/**/*.contract.ts`
- `contracts/lifecycle/**`

## Related Guards

- `scripts/generate-code-legacy-inventory.js`
- `scripts/check-code-legacy-inventory.js`
- `scripts/check-contract-standardization.js`
- `scripts/check-backend-contract-drift.js`
- `scripts/check-lifecycle-operation-guard.js`
- `scripts/check-doc-source-of-truth.js`
- `npm run legacy:inventory`
- `npm run legacy:check`
- `npm run validate:contracts`

## Rules

- Contract is source of truth; Markdown cannot override executable contracts.
- Legacy code is not removed without inventory, reference scan, risk note, and rollback plan.
- Hidden alias routes are compatibility wrappers unless telemetry/caller audit proves safe removal.
- `generated_from_existing_page` is technical debt until replaced by a manual business contract or explicitly reviewed.
- BFF routes must not own ERP business logic; permanent mutation belongs in FastAPI/domain services.
- Frontend services that call APIs must be covered by API contracts.
- Lifecycle/status mutation must be operation-recorded and pass lifecycle guard.

## Counts

- Scanned files: 2123
- Legacy route inventory items: 152
- Legacy service inventory items: 534
- BFF/API route inventory items: 552
- Supabase/Vercel/old runtime residue hits: 194
- Generated/blocked contract debt items: 146
- Orphan candidates: 0
- P0 legacy issues: 0
- P1 findings: 194
- P2 findings: 238

## API Contractization Sprint Delta

- Targeted service files: `lib/services/accountingService.ts`, `lib/services/companyService.ts`, `lib/services/companyVehicleService.ts`, `lib/services/facilityService.ts`, `lib/services/organizationService.ts`.
- Initial targeted P1 service findings: 30 raw inventory rows; 18 method-level API-call findings after detector normalization.
- Final targeted P1 service findings: 10.
- Newly covered API contract entries: 8 (`facilityService` 4, CRM stakeholder service 2, partner alias 1, representative alias 1).
- Remaining manual-review target debt: accounting legacy cash/NakitIslem service 4, missing capital-decrease POST backend 1, company vehicle schema/domain mismatch 5.
- Organization service P1 was resolved by method-level detector accuracy; `organizationService.list` remains covered by existing contracts.

## P0 Findings

- No P0 legacy issues detected.

## P1 Summary

- P1: contractize_before_promotion (lib/services/accounting/bankAccounts.service.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/accounting/bankTransactions.service.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/accounting/capitalReconciliation.service.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/accounting/cariAccounts.service.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/accounting/cariTransactions.service.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/accounting/eDocuments.service.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/accounting/reconciliation.service.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/accountingService.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/admin/adminService.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/companyService.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/companyVehicleService.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
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

## Retained Intentionally

- Hidden/compatibility wrappers retained: 14
- Active runtime dependencies retained: 897
- No route, BFF route, service, contract, backend domain service, DB migration, auth/security code, hidden alias, or demo/dev route is deleted by this sprint.

## Detailed Reports

- Raw inventory: `docs/archive/code-legacy-cleanup-2026-06-13/raw-code-legacy-inventory.md`
- Cleanup report: `docs/archive/code-legacy-cleanup-2026-06-13/cleanup-report.md`
- Risk register: `docs/archive/code-legacy-cleanup-2026-06-13/risk-register.md`
