# Code Legacy Inventory

Status: controlled cleanup sprint inventory
Generated: 2026-06-13T19:04:54.945Z

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
- P1 findings: 67
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

## BFF Migration Header Sprint

- Initial missing-header P1 count: 124
- Final missing-header P1 count: 0
- Routes classified as proxy_to_fastapi: 107
- Routes classified as keep_session_bootstrap: 5
- Routes classified as keep_upload_adapter: 4
- Routes classified as keep_ui_adapter: 5
- Routes classified as local_only: 2
- Routes classified as deprecated_compatibility_adapter: 1
- Routes classified as blocked_pending_backend: 0
- Routes left manual review: 0

| Route file | Route path | Classification | Target FastAPI endpoint | Direct DB write | Lifecycle mutation | Release visible | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| app/api/accounting/bank-accounts-cards/[id]/history/route.ts | /api/accounting/bank-accounts-cards/{id}/history | deprecated_compatibility_adapter | none | no | no | no | Retained as deprecated compatibility wrapper pending telemetry/caller audit. |
| app/api/auth/logout/route.ts | /api/auth/logout | keep_session_bootstrap | none | no | no | no | Retained as browser auth/session bootstrap adapter. |
| app/api/auth/me/route.ts | /api/auth/me | keep_session_bootstrap | none | no | no | no | Retained as browser auth/session bootstrap adapter. |
| app/api/auth/otp/route.ts | /api/auth/otp | keep_session_bootstrap | none | no | no | no | Retained as browser auth/session bootstrap adapter. |
| app/api/auth/otp/send/route.ts | /api/auth/otp/send | keep_session_bootstrap | none | no | no | no | Retained as browser auth/session bootstrap adapter. |
| app/api/auth/tenant-access/route.ts | /api/auth/tenant-access | keep_session_bootstrap | none | no | no | no | Retained as browser auth/session bootstrap adapter. |
| app/api/bulk/actions/[id]/confirm/route.ts | /api/bulk/actions/{id}/confirm | proxy_to_fastapi | /api/v1/bulk/actions/{id}/confirm | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/bulk/actions/[id]/report/route.ts | /api/bulk/actions/{id}/report | proxy_to_fastapi | /api/v1/bulk/actions/{id}/report | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/bulk/actions/[id]/route.ts | /api/bulk/actions/{id} | proxy_to_fastapi | /api/v1/bulk/actions/{id} | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/bulk/actions/route.ts | /api/bulk/actions | proxy_to_fastapi | /api/v1/bulk/actions | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/cron/document-thumbnails/route.ts | /api/cron/document-thumbnails | keep_upload_adapter | none | no | no | no | Retained as upload/media adapter; no lifecycle/status mutation signal. |
| app/api/data-quality/by-entity/[entity_type]/[entity_id]/route.ts | /api/data-quality/by-entity/{entity_type}/{entity_id} | proxy_to_fastapi | /api/v1/data-quality/by-entity/{entity_type}/{entity_id} | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/data-quality/check/[entity_type]/[entity_id]/route.ts | /api/data-quality/check/{entity_type}/{entity_id} | proxy_to_fastapi | /api/v1/data-quality/check/{entity_type}/{entity_id} | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/data-quality/check/route.ts | /api/data-quality/check | proxy_to_fastapi | /api/v1/data-quality/check | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/data-quality/duplicates/[group_id]/dismiss/route.ts | /api/data-quality/duplicates/{group_id}/dismiss | proxy_to_fastapi | /api/v1/data-quality/duplicates/{group_id}/dismiss | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/data-quality/duplicates/[group_id]/false-positive/route.ts | /api/data-quality/duplicates/{group_id}/false-positive | proxy_to_fastapi | /api/v1/data-quality/duplicates/{group_id}/false-positive | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/data-quality/duplicates/[group_id]/route.ts | /api/data-quality/duplicates/{group_id} | proxy_to_fastapi | /api/v1/data-quality/duplicates/{group_id} | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/data-quality/duplicates/detect/route.ts | /api/data-quality/duplicates/detect | proxy_to_fastapi | /api/v1/data-quality/duplicates/detect | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/data-quality/duplicates/route.ts | /api/data-quality/duplicates | proxy_to_fastapi | /api/v1/data-quality/duplicates | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/data-quality/merge/[merge_id]/route.ts | /api/data-quality/merge/{merge_id} | proxy_to_fastapi | /api/v1/data-quality/merge/{merge_id} | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/data-quality/merge/confirm/route.ts | /api/data-quality/merge/confirm | proxy_to_fastapi | /api/v1/data-quality/merge/confirm | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/data-quality/merge/preview/route.ts | /api/data-quality/merge/preview | proxy_to_fastapi | /api/v1/data-quality/merge/preview | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/data-quality/rules/[rule_key]/route.ts | /api/data-quality/rules/{rule_key} | proxy_to_fastapi | /api/v1/data-quality/rules/{rule_key} | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/data-quality/rules/route.ts | /api/data-quality/rules | proxy_to_fastapi | /api/v1/data-quality/rules | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/data-quality/summary/route.ts | /api/data-quality/summary | proxy_to_fastapi | /api/v1/data-quality/summary | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/documents/[id]/access-logs/route.ts | /api/documents/{id}/access-logs | proxy_to_fastapi | /api/v1/documents/{id}/access-logs | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/documents/[id]/download-url/route.ts | /api/documents/{id}/download-url | proxy_to_fastapi | /api/v1/documents/{id}/download-url | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/documents/[id]/new-version/route.ts | /api/documents/{id}/new-version | keep_upload_adapter | none | no | no | no | Retained as upload/media adapter; no lifecycle/status mutation signal. |
| app/api/documents/[id]/preview-url/route.ts | /api/documents/{id}/preview-url | proxy_to_fastapi | /api/v1/documents/{id}/preview-url | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/documents/[id]/reject/route.ts | /api/documents/{id}/reject | proxy_to_fastapi | /api/v1/documents/{id}/reject | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/documents/[id]/route.ts | /api/documents/{id} | proxy_to_fastapi | /api/v1/documents/{id} | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/documents/[id]/verify/route.ts | /api/documents/{id}/verify | proxy_to_fastapi | /api/v1/documents/{id}/verify | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/documents/by-entity/[entity_type]/[entity_id]/route.ts | /api/documents/by-entity/{entity_type}/{entity_id} | proxy_to_fastapi | /api/v1/documents/by-entity/{entity_type}/{entity_id} | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/documents/by-entity/[entity_type]/[entity_id]/upload/route.ts | /api/documents/by-entity/{entity_type}/{entity_id}/upload | keep_upload_adapter | none | no | no | no | Retained as upload/media adapter; no lifecycle/status mutation signal. |
| app/api/documents/expired/route.ts | /api/documents/expired | proxy_to_fastapi | /api/v1/documents/expired | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/documents/expiring/route.ts | /api/documents/expiring | proxy_to_fastapi | /api/v1/documents/expiring | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/documents/requirements/[module_key]/[operation_key]/route.ts | /api/documents/requirements/{module_key}/{operation_key} | proxy_to_fastapi | /api/v1/documents/requirements/{module_key}/{operation_key} | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/documents/requirements/route.ts | /api/documents/requirements | proxy_to_fastapi | /api/v1/documents/requirements | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/documents/route.ts | /api/documents | proxy_to_fastapi | /api/v1/documents | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/documents/upload/route.ts | /api/documents/upload | keep_upload_adapter | none | no | no | no | Retained as upload/media adapter; no lifecycle/status mutation signal. |
| app/api/export/jobs/[id]/download/route.ts | /api/export/jobs/{id}/download | proxy_to_fastapi | /api/v1/export/jobs/{id}/download | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/export/jobs/[id]/route.ts | /api/export/jobs/{id} | proxy_to_fastapi | /api/v1/export/jobs/{id} | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/export/jobs/route.ts | /api/export/jobs | proxy_to_fastapi | /api/v1/export/jobs | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/import/jobs/[id]/cancel/route.ts | /api/import/jobs/{id}/cancel | proxy_to_fastapi | /api/v1/import/jobs/{id}/cancel | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/import/jobs/[id]/confirm/route.ts | /api/import/jobs/{id}/confirm | proxy_to_fastapi | /api/v1/import/jobs/{id}/confirm | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/import/jobs/[id]/error-report/route.ts | /api/import/jobs/{id}/error-report | proxy_to_fastapi | /api/v1/import/jobs/{id}/error-report | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/import/jobs/[id]/mapping/route.ts | /api/import/jobs/{id}/mapping | proxy_to_fastapi | /api/v1/import/jobs/{id}/mapping | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/import/jobs/[id]/route.ts | /api/import/jobs/{id} | proxy_to_fastapi | /api/v1/import/jobs/{id} | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/import/jobs/[id]/validate/route.ts | /api/import/jobs/{id}/validate | proxy_to_fastapi | /api/v1/import/jobs/{id}/validate | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/import/jobs/route.ts | /api/import/jobs | proxy_to_fastapi | /api/v1/import/jobs | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/import/templates/[template_key]/download/route.ts | /api/import/templates/{template_key}/download | proxy_to_fastapi | /api/v1/import/templates/{template_key}/download | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/import/templates/[template_key]/route.ts | /api/import/templates/{template_key} | proxy_to_fastapi | /api/v1/import/templates/{template_key} | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/import/templates/route.ts | /api/import/templates | proxy_to_fastapi | /api/v1/import/templates | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/licensing/current/features/route.ts | /api/licensing/current/features | proxy_to_fastapi | /api/v1/licensing/current/features | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/licensing/current/modules/route.ts | /api/licensing/current/modules | proxy_to_fastapi | /api/v1/licensing/current/modules | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/licensing/current/route.ts | /api/licensing/current | proxy_to_fastapi | /api/v1/licensing/current | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/licensing/plans/[planId]/features/route.ts | /api/licensing/plans/{planId}/features | proxy_to_fastapi | /api/v1/licensing/plans/{planId}/features | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/licensing/plans/[planId]/modules/route.ts | /api/licensing/plans/{planId}/modules | proxy_to_fastapi | /api/v1/licensing/plans/{planId}/modules | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/licensing/plans/[planId]/route.ts | /api/licensing/plans/{planId} | proxy_to_fastapi | /api/v1/licensing/plans/{planId} | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/licensing/products/[productId]/plans/route.ts | /api/licensing/products/{productId}/plans | proxy_to_fastapi | /api/v1/licensing/products/{productId}/plans | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/licensing/products/[productId]/route.ts | /api/licensing/products/{productId} | proxy_to_fastapi | /api/v1/licensing/products/{productId} | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/licensing/products/route.ts | /api/licensing/products | proxy_to_fastapi | /api/v1/licensing/products | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/licensing/tenant-licenses/[licenseId]/archive/route.ts | /api/licensing/tenant-licenses/{licenseId}/archive | proxy_to_fastapi | /api/v1/licensing/tenant-licenses/{licenseId}/archive | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/licensing/tenant-licenses/[licenseId]/cancel/route.ts | /api/licensing/tenant-licenses/{licenseId}/cancel | proxy_to_fastapi | /api/v1/licensing/tenant-licenses/{licenseId}/cancel | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/licensing/tenant-licenses/[licenseId]/change-plan/route.ts | /api/licensing/tenant-licenses/{licenseId}/change-plan | proxy_to_fastapi | /api/v1/licensing/tenant-licenses/{licenseId}/change-plan | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/licensing/tenant-licenses/[licenseId]/payments/route.ts | /api/licensing/tenant-licenses/{licenseId}/payments | proxy_to_fastapi | /api/v1/licensing/tenant-licenses/{licenseId}/payments | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/licensing/tenant-licenses/[licenseId]/reactivate/route.ts | /api/licensing/tenant-licenses/{licenseId}/reactivate | proxy_to_fastapi | /api/v1/licensing/tenant-licenses/{licenseId}/reactivate | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/licensing/tenant-licenses/[licenseId]/route.ts | /api/licensing/tenant-licenses/{licenseId} | proxy_to_fastapi | /api/v1/licensing/tenant-licenses/{licenseId} | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/licensing/tenant-licenses/[licenseId]/suspend/route.ts | /api/licensing/tenant-licenses/{licenseId}/suspend | proxy_to_fastapi | /api/v1/licensing/tenant-licenses/{licenseId}/suspend | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/licensing/tenant-licenses/[licenseId]/usage-snapshot/route.ts | /api/licensing/tenant-licenses/{licenseId}/usage-snapshot | proxy_to_fastapi | /api/v1/licensing/tenant-licenses/{licenseId}/usage-snapshot | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/licensing/tenant-licenses/[licenseId]/usage/route.ts | /api/licensing/tenant-licenses/{licenseId}/usage | proxy_to_fastapi | /api/v1/licensing/tenant-licenses/{licenseId}/usage | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/licensing/tenant-licenses/route.ts | /api/licensing/tenant-licenses | proxy_to_fastapi | /api/v1/licensing/tenant-licenses | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/notifications/[id]/archive/route.ts | /api/notifications/{id}/archive | proxy_to_fastapi | /api/v1/notifications/{id}/archive | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/notifications/[id]/dismiss/route.ts | /api/notifications/{id}/dismiss | proxy_to_fastapi | /api/v1/notifications/{id}/dismiss | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/notifications/[id]/read/route.ts | /api/notifications/{id}/read | proxy_to_fastapi | /api/v1/notifications/{id}/read | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/notifications/[id]/route.ts | /api/notifications/{id} | proxy_to_fastapi | /api/v1/notifications/{id} | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/notifications/counts/route.ts | /api/notifications/counts | proxy_to_fastapi | /api/v1/notifications/counts | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/notifications/preferences/route.ts | /api/notifications/preferences | proxy_to_fastapi | /api/v1/notifications/preferences | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/notifications/read-all/route.ts | /api/notifications/read-all | proxy_to_fastapi | /api/v1/notifications/read-all | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/notifications/route.ts | /api/notifications | proxy_to_fastapi | /api/v1/notifications{request.nextUrl.search} | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/onboarding/system-tour/complete/route.ts | /api/onboarding/system-tour/complete | keep_ui_adapter | none | ui_state_helper | no | no | Retained as UI-state adapter; helper writes user onboarding preferences/events, not ERP domain state. |
| app/api/onboarding/system-tour/postpone/route.ts | /api/onboarding/system-tour/postpone | keep_ui_adapter | none | ui_state_helper | no | no | Retained as UI-state adapter; helper writes user onboarding preferences/events, not ERP domain state. |
| app/api/onboarding/system-tour/skip/route.ts | /api/onboarding/system-tour/skip | keep_ui_adapter | none | ui_state_helper | no | no | Retained as UI-state adapter; helper writes user onboarding preferences/events, not ERP domain state. |
| app/api/onboarding/system-tour/start/route.ts | /api/onboarding/system-tour/start | keep_ui_adapter | none | ui_state_helper | no | no | Retained as UI-state adapter; helper writes user onboarding preferences/events, not ERP domain state. |
| app/api/onboarding/system-tour/step/route.ts | /api/onboarding/system-tour/step | keep_ui_adapter | none | ui_state_helper | no | no | Retained as UI-state adapter; helper writes user onboarding preferences/events, not ERP domain state. |
| app/api/onboarding/user/complete-tour/route.ts | /api/onboarding/user/complete-tour | proxy_to_fastapi | /api/v1/onboarding/user/complete-tour | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/onboarding/user/dismiss-hint/route.ts | /api/onboarding/user/dismiss-hint | proxy_to_fastapi | /api/v1/onboarding/user/dismiss-hint | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/onboarding/user/reset-help/route.ts | /api/onboarding/user/reset-help | proxy_to_fastapi | /api/v1/onboarding/user/reset-help | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/onboarding/user/route.ts | /api/onboarding/user | proxy_to_fastapi | /api/v1/onboarding/user | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/onboarding/workspace/complete-step/route.ts | /api/onboarding/workspace/complete-step | proxy_to_fastapi | /api/v1/onboarding/workspace/complete-step | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/onboarding/workspace/reset/route.ts | /api/onboarding/workspace/reset | proxy_to_fastapi | /api/v1/onboarding/workspace/reset | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/onboarding/workspace/route.ts | /api/onboarding/workspace | proxy_to_fastapi | /api/v1/onboarding/workspace | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/onboarding/workspace/skip/route.ts | /api/onboarding/workspace/skip | proxy_to_fastapi | /api/v1/onboarding/workspace/skip | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/reminders/[id]/cancel/route.ts | /api/reminders/{id}/cancel | proxy_to_fastapi | /api/v1/reminders/{id}/cancel | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/reminders/[id]/dismiss/route.ts | /api/reminders/{id}/dismiss | proxy_to_fastapi | /api/v1/reminders/{id}/dismiss | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/reminders/route.ts | /api/reminders | proxy_to_fastapi | /api/v1/reminders | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/search/by-entity/[entity_type]/[entity_id]/route.ts | /api/search/by-entity/{entity_type}/{entity_id} | proxy_to_fastapi | /api/v1/search/by-entity/{entity_type}/{entity_id} | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/search/command-palette/route.ts | /api/search/command-palette | proxy_to_fastapi | /api/v1/search/command-palette | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/search/commands/route.ts | /api/search/commands | proxy_to_fastapi | /api/v1/search/commands | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/search/query/route.ts | /api/search/query | proxy_to_fastapi | /api/v1/search/query | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/search/recent/route.ts | /api/search/recent | proxy_to_fastapi | /api/v1/search/recent | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/search/route.ts | /api/search | proxy_to_fastapi | /api/v1/search | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/search/suggestions/route.ts | /api/search/suggestions | proxy_to_fastapi | /api/v1/search/suggestions | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/security/access-summary/route.ts | /api/security/access-summary | proxy_to_fastapi | /api/v1/security/access-summary | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/security/permission-denials/route.ts | /api/security/permission-denials | proxy_to_fastapi | /api/v1/security/permission-denials | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/security/permissions/matrix/route.ts | /api/security/permissions/matrix | proxy_to_fastapi | /api/v1/security/permissions/matrix | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/security/permissions/route.ts | /api/security/permissions | proxy_to_fastapi | /api/v1/security/permissions | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/security/policy-test/route.ts | /api/security/policy-test | proxy_to_fastapi | /api/v1/security/policy-test | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/security/roles/[id]/permissions/route.ts | /api/security/roles/{id}/permissions | proxy_to_fastapi | /api/v1/security/roles/{id}/permissions | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/security/roles/[id]/route.ts | /api/security/roles/{id} | proxy_to_fastapi | /api/v1/security/roles/{id} | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/security/roles/route.ts | /api/security/roles | proxy_to_fastapi | /api/v1/security/roles | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/security/users/[id]/roles/[roleId]/route.ts | /api/security/users/{id}/roles/{roleId} | proxy_to_fastapi | /api/v1/security/users/{id}/roles/{roleId} | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/security/users/[id]/roles/route.ts | /api/security/users/{id}/roles | proxy_to_fastapi | /api/v1/security/users/{id}/roles | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/security/users/[id]/route.ts | /api/security/users/{id} | proxy_to_fastapi | /api/v1/security/users/{id} | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/security/users/[id]/scopes/route.ts | /api/security/users/{id}/scopes | proxy_to_fastapi | /api/v1/security/users/{id}/scopes | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/security/users/route.ts | /api/security/users | proxy_to_fastapi | /api/v1/security/users | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/system/email/messages/[id]/retry/route.ts | /api/system/email/messages/{id}/retry | proxy_to_fastapi | /api/v1/system/email/messages/{id}/retry | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/system/email/messages/route.ts | /api/system/email/messages | proxy_to_fastapi | /api/v1/system/email/messages{request.nextUrl.search} | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/system/email/test/route.ts | /api/system/email/test | proxy_to_fastapi | /api/v1/system/email/test | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/theme/export/route.ts | /api/theme/export | local_only | none | no | no | api_contract | Retained as local/internal development adapter. |
| app/api/theme/import/route.ts | /api/theme/import | local_only | none | no | no | api_contract | Retained as local/internal development adapter. |
| app/api/users/me/avatar/content/route.ts | /api/users/me/avatar/content | proxy_to_fastapi | /api/v1/users/me/avatar/content | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/users/me/avatar/route.ts | /api/users/me/avatar | proxy_to_fastapi | /api/v1/users/me/avatar | no | no | no | Header matches visible FastAPI proxy behavior. |
| app/api/users/me/profile/route.ts | /api/users/me/profile | proxy_to_fastapi | /api/v1/users/me/profile | no | no | no | Header matches visible FastAPI proxy behavior. |


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
- Active runtime dependencies retained: 973
- No route, BFF route, service, contract, backend domain service, DB migration, auth/security code, hidden alias, or demo/dev route is deleted by this sprint.

## Detailed Reports

- Raw inventory: `docs/archive/code-legacy-cleanup-2026-06-13/raw-code-legacy-inventory.md`
- Cleanup report: `docs/archive/code-legacy-cleanup-2026-06-13/cleanup-report.md`
- Risk register: `docs/archive/code-legacy-cleanup-2026-06-13/risk-register.md`
