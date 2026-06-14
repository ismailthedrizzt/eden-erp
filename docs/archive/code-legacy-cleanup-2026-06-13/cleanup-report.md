# Code Legacy Cleanup Sprint Report

<!-- source-of-truth-standard: contract overrides markdown -->

Generated: 2026-06-14T04:18:33.907Z

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

- scannedFiles: 2140
- routes: 152
- services: 534
- bffRoutes: 552
- residueHits: 194
- generatedContractItems: 132
- orphanCandidates: 0
- p0: 0
- p1: 64
- p2: 241
- safeDeleteCandidates: 11
- needsManualReview: 343
- activeRuntimeDependency: 973

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
| app/api/licensing/current/route.ts | /api/licensing/current | proxy_to_fastapi | /api/v1/licensing/current | no | no | api_contract | Header matches visible FastAPI proxy behavior. |
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
- P1: contractize_before_promotion (lib/services/licensing/licensingService.ts) - missing API contract coverage; 1 API call(s)
- P1: contractize_before_promotion (lib/services/licensing/licensingService.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/notifications/emailService.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/notifications/notificationService.ts) - missing API contract coverage; 1 API call(s)
- P1: contractize_before_promotion (lib/services/notifications/preferences.service.ts) - missing API contract coverage; 1 API call(s)
- P1: contractize_before_promotion (lib/services/notifications/reminderService.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/onboarding/onboardingService.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/search/commandPalette.service.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_before_promotion (lib/services/search/searchService.ts) - missing API contract coverage; 1 API call(s); API path not covered by contracts/api
- P1: contractize_real_ui_before_promotion (app/app/ayarlar/bildirimler/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/belgeler/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/ik/personel/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present
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

- Converted 6 release-visible `generated_from_existing_page` routes to manual business contracts with runtime usage tied to render/action behavior.
- Added focused licensing API contract coverage for `licensingService.getCurrentEntitlements` because `/app/aboneligim` uses that service at runtime.
- Tightened contract usage guard against hidden/data-contract-only proof for manual business contract pages.
- Added behavior-matched BFF migration headers to 124 `app/api/**/route.ts` files.
- Tightened BFF inventory detection for proxy headers without visible FastAPI proxy calls and adapter/category misuse.
- Regenerated concise AI context inventory and detailed archive reports; no route or service deletion performed.

## 6. Files Changed

- `app/api/**/route.ts` (124 BFF migration headers)
- `app/app/page.tsx`, `app/app/aboneligim/page.tsx`, `app/app/profil/page.tsx`, `app/app/sistem/kurulum/page.tsx`, `app/login/page.tsx`, `app/offline/page.tsx`
- `contracts/pages/home/home.page.contract.ts`, `contracts/pages/licensing/subscription.page.contract.ts`, `contracts/pages/security/profile.page.contract.ts`, `contracts/pages/system/setup-wizard.page.contract.ts`, `contracts/pages/auth/login.page.contract.ts`, `contracts/pages/system/offline.page.contract.ts`
- `contracts/forms/security/profile.form.contract.ts`, `contracts/wizards/system/setup-wizard.wizard.contract.ts`, `contracts/api/licensing.api.contract.ts`
- `scripts/check-contract-usage-guard.js`
- `scripts/generate-code-legacy-inventory.js`
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

- P1: contractize_real_ui_before_promotion (app/app/ayarlar/bildirimler/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/belgeler/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present
- P1: contractize_real_ui_before_promotion (app/app/ik/personel/page.tsx) - implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present
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
- P1: planned_page_has_real_ui_signals (app/test/page.tsx) - implementation=planned; contractSource=generated_from_existing_page; release=development_demo; real UI signals present

## 11. Commands Run

- `npm run legacy:inventory`
- `npm run legacy:check`
- `npm run docs:source-check`
- `npm run contract:backend-drift`
- `npm run contract:lifecycle`
- `npm run validate:contracts`
- `npm run build`
- `npm run typecheck`

## 12. Exact Results

- `npm run legacy:inventory`: PASS; P0 0, P1 64, P2 241; final missing-header P1 0.
- `npm run legacy:check`: PASS; P0 legacy findings 0.
- `npm run docs:source-check`: PASS; errors 0.
- `npm run contract:backend-drift`: PASS; warnings 0, errors 0.
- `npm run contract:lifecycle`: PASS; warnings 0, errors 0.
- `npm run validate:contracts`: PASS; backend drift 0; lifecycle 0; docs source errors 0; legacy P0 0.
- `npm run build`: PASS; Next.js build completed.
- `npm run typecheck`: PASS.
- Backend pytest: not run in this sprint because backend files were not changed.

## 13. Remaining Backlog

- Remaining BFF migration header P1 backlog: 0.
- Remaining selected release-visible generated contract debt: 0.
- Remaining generated_from_existing_page debt backlog: 132.
- Overall inventory backlog after this sprint: P1 64 and P2 241.
- Review P1 findings before promoting development/hidden routes.
- Contractize API-calling services that are used by implemented pages but not yet in `contracts/api`.
- Review Supabase/Vercel runtime residue by approved layer before dependency removal.

## Generated Contract Debt Sprint Batch 2

1. Initial generated_from_existing_page debt: 140.
2. Selected routes: /app/dashboard, /app/onboarding, /app/sirket, /app/muhasebe, /app/sistem, /app/sistem/genel, /app/sistem/teknik, /app/yardim.
3. Decision per route: all selected routes were converted to real manual_business_contract entries; no fake usage, hidden span, unused import, route deletion, service deletion, or broad allowlist was added.
4. Converted to manual_business_contract: 8.
5. Downgraded/planned/hidden: 0.
6. Retained as generated debt in selected batch: 0.
7. Guard changes: none in batch 2; the existing guard already requires manual contracts to affect runtime behavior and rejects hidden/data-only usage.
8. Files changed: page runtime files for the 8 selected routes, contracts/pages/page-contract-registry.ts, and new manual contracts under contracts/pages/{accounting,company,dashboard,help,onboarding,system}/.
9. Commands run so far: npm run legacy:inventory, npm run legacy:check, npm run contracts:check, npm run contract:usage, npm run typecheck.
10. Exact interim results: legacy:inventory PASS with generated contract items 132, P0 0, P1 64, P2 241; contracts:check PASS; contract:usage PASS with the existing 3 lifecycle warnings only; typecheck PASS targeted 9 files.
11. Remaining generated debt: 132.
12. Remaining P1/P2 backlog: P1 64 and P2 241, mainly API-calling service contractization, generated/blocked real UI pages, and Supabase/Vercel residue manual review.

| Route | Page file | Release status | Navigation/Search visibility | Implementation status | Contract source | Page kind | Real UI? | Risk | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| /app/dashboard | app/app/dashboard/page.tsx | development | nav/search/command visible | implemented | manual_business_contract | redirect | no | navigation-visible generated redirect wrapper | converted_to_manual_business_contract |
| /app/onboarding | app/app/onboarding/page.tsx | development | nav/search/command visible | implemented | manual_business_contract | redirect | no | navigation-visible generated redirect wrapper | converted_to_manual_business_contract |
| /app/sirket | app/app/sirket/page.tsx | development | nav/search/command visible | implemented | manual_business_contract | dashboard | yes | module hub generated real UI | converted_to_manual_business_contract |
| /app/muhasebe | app/app/muhasebe/page.tsx | development | nav/search/command visible | implemented | manual_business_contract | dashboard | yes | generated registry claimed wizard/lifecycle while runtime is module hub | converted_to_manual_business_contract |
| /app/sistem | app/app/sistem/page.tsx | development_internal | nav/search/command visible | implemented | manual_business_contract | dashboard | yes | internal admin console generated wrapper | converted_to_manual_business_contract |
| /app/sistem/genel | app/app/sistem/genel/page.tsx | development_internal | nav/search/command visible | implemented | manual_business_contract | dashboard | yes | generated placeholder but runtime renders AdminConsolePage | converted_to_manual_business_contract |
| /app/sistem/teknik | app/app/sistem/teknik/page.tsx | development_internal | nav/search/command visible | implemented | manual_business_contract | dashboard | yes | generated placeholder but runtime renders AdminConsolePage | converted_to_manual_business_contract |
| /app/yardim | app/app/yardim/page.tsx | development | nav/search/command visible | implemented | manual_business_contract | dashboard | yes | help center generated real UI | converted_to_manual_business_contract |
