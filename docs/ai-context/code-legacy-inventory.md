# Code Legacy Inventory

Status: controlled cleanup sprint inventory
Generated: 2026-06-13T15:10:41.320Z

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

- Scanned files: 2118
- Legacy route inventory items: 152
- Legacy service inventory items: 534
- BFF/API route inventory items: 552
- Supabase/Vercel/old runtime residue hits: 192
- Generated/blocked contract debt items: 146
- Orphan candidates: 0
- P0 legacy issues: 0
- P1 findings: 171
- P2 findings: 247

## P0 Findings

- No P0 legacy issues detected.

## P1 Summary

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

## Retained Intentionally

- Hidden/compatibility wrappers retained: 14
- Active runtime dependencies retained: 1041
- No route, BFF route, service, contract, backend domain service, DB migration, auth/security code, hidden alias, or demo/dev route is deleted by this sprint.

## Detailed Reports

- Raw inventory: `docs/archive/code-legacy-cleanup-2026-06-13/raw-code-legacy-inventory.md`
- Cleanup report: `docs/archive/code-legacy-cleanup-2026-06-13/cleanup-report.md`
- Risk register: `docs/archive/code-legacy-cleanup-2026-06-13/risk-register.md`
