# Code Legacy Inventory

Status: controlled cleanup sprint inventory
Generated: 2026-06-13T17:34:08.137Z

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
- P1 findings: 191
- P2 findings: 241

## Targeted Remaining P1 Decision Table

| Finding | Service file | Service function | Frontend path | BFF path | FastAPI path | Current issue | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `lib/services/accountingService.ts` | `accountingService.list` | `/api/muhasebe/islemler` | `/api/muhasebe/islemler` | `/api/v1/accounting/cash-transactions` | Backend cash route/domain is missing; `NakitIslem` is a blocked development accounting adapter. | D: keep compatibility adapter with blocked/generated development route evidence. |
| 2 | `lib/services/accountingService.ts` | `accountingService.create` | `/api/muhasebe/islemler` | `/api/muhasebe/islemler` | `/api/v1/accounting/cash-transactions` | Backend cash route/domain is missing; mutation payload is legacy `NakitIslem`. | D: keep compatibility adapter with blocked/generated development route evidence. |
| 3 | `lib/services/accountingService.ts` | `accountingService.update` | `/api/muhasebe/islemler/{id}` | `/api/muhasebe/islemler/{id}` | `/api/v1/accounting/cash-transactions/{id}` | Backend cash route/domain is missing; mutation payload is legacy `NakitIslem`. | D: keep compatibility adapter with blocked/generated development route evidence. |
| 4 | `lib/services/accountingService.ts` | `accountingService.delete` | `/api/muhasebe/islemler/{id}` | `/api/muhasebe/islemler/{id}` | `/api/v1/accounting/cash-transactions/{id}` | Backend cash route/domain is missing. | D: keep compatibility adapter with blocked/generated development route evidence. |
| 5 | `lib/services/companyService.ts` | `companyService.requestCapitalDecrease` | `/api/companies/{company_id}/capital-decreases` | `/api/companies/{company_id}/capital-decreases` | `/api/v1/companies/{company_id}/capital-decreases` | BFF exists but FastAPI POST/domain completion is missing; function is not directly used by release/implemented/contract-ready pages. | D: retain blocked lifecycle operation adapter until real capital decrease operation is implemented. |
| 6 | `lib/services/companyVehicleService.ts` | `companyVehicleService.list` | `/api/companies/vehicles` | `/api/companies/vehicles` | `/api/v1/after-sales/assets` | Page is blocked/generated development; UI payload expects company vehicle envelope, backend owner is after-sales installed asset. | D: keep compatibility adapter until vehicle/fleet domain contractization. |
| 7 | `lib/services/companyVehicleService.ts` | `companyVehicleService.references` | `/api/companies/vehicles` | `/api/companies/vehicles` | `/api/v1/after-sales/assets` | `refs_only`/employee/company reference semantics do not exist in after-sales asset backend. | D: keep compatibility adapter until vehicle/fleet domain contractization. |
| 8 | `lib/services/companyVehicleService.ts` | `companyVehicleService.create` | `/api/companies/vehicles` | `/api/companies/vehicles` | `/api/v1/after-sales/assets` | Frontend vehicle payload does not match `InstalledAssetCreateRequest`. | D: keep compatibility adapter until vehicle/fleet domain contractization. |
| 9 | `lib/services/companyVehicleService.ts` | `companyVehicleService.update` | `/api/companies/vehicles` | `/api/companies/vehicles` | `/api/v1/after-sales/assets` | Frontend vehicle payload/update path does not match installed asset schema/path. | D: keep compatibility adapter until vehicle/fleet domain contractization. |
| 10 | `lib/services/companyVehicleService.ts` | `companyVehicleService.delete` | `/api/companies/vehicles` | `/api/companies/vehicles` | `/api/v1/after-sales/assets` | Delete uses compatibility query id instead of canonical asset detail route. | D: keep compatibility adapter until vehicle/fleet domain contractization. |

## API Contractization Sprint Delta

- Targeted service files: `lib/services/accountingService.ts`, `lib/services/companyService.ts`, `lib/services/companyVehicleService.ts`.
- Initial targeted remaining P1 service findings: 10.
- Final targeted remaining P1 service findings: 0.
- Accounting/NakitIslem decision: retained as `keep_compatibility_adapter` because all known consumers are blocked/generated development accounting pages and no FastAPI cash transaction domain exists.
- Capital decrease decision: retained as blocked lifecycle compatibility adapter; `requestCapitalDecrease` has no protected page usage and waits for real operation-recorded backend support.
- Company vehicle decision: retained as `keep_compatibility_adapter` under company vehicle/fleet contractization debt because the current BFF points to after-sales assets but frontend vehicle schema and reference semantics do not match installed asset backend DTOs.
- New API contract entries in this sprint: none; no fake contracts were added for missing or schema-incompatible backend chains.
- Inventory detector improvements: explicit legacy service adapter markers require allowed functions plus non-protected route evidence; blank marker parsing no longer consumes the next directive; generator self-references are excluded from usage literal counts.

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

## Retained Intentionally

- Hidden/compatibility wrappers retained: 14
- Active runtime dependencies retained: 866
- No route, BFF route, service, contract, backend domain service, DB migration, auth/security code, hidden alias, or demo/dev route is deleted by this sprint.

## Detailed Reports

- Raw inventory: `docs/archive/code-legacy-cleanup-2026-06-13/raw-code-legacy-inventory.md`
- Cleanup report: `docs/archive/code-legacy-cleanup-2026-06-13/cleanup-report.md`
- Risk register: `docs/archive/code-legacy-cleanup-2026-06-13/risk-register.md`
