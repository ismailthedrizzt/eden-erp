# Raw Code Legacy Inventory

<!-- source-of-truth-standard: contract overrides markdown -->

Generated: 2026-06-14T02:51:55.871Z

## Related Contracts

- `contracts/**`
- `contracts/page-flow-contracts.json`

## Related Guards

- `scripts/generate-code-legacy-inventory.js`
- `scripts/check-code-legacy-inventory.js`

## Counts

```json
{
  "scannedFiles": 2132,
  "routes": 152,
  "services": 534,
  "bffRoutes": 552,
  "residueHits": 194,
  "generatedContractItems": 140,
  "orphanCandidates": 0,
  "p0": 0,
  "p1": 67,
  "p2": 241,
  "safeDeleteCandidates": 11,
  "needsManualReview": 348,
  "activeRuntimeDependency": 973
}
```

## Generated Contract Debt Sprint

- Initial generated_from_existing_page debt count: 146
- Selected routes: `/app`, `/app/aboneligim`, `/app/profil`, `/app/sistem/kurulum`, `/login`, `/offline`
- Pages converted to manual_business_contract: 6
- Pages downgraded/planned/hidden/blocked: 0
- Pages intentionally retained as generated debt in selected batch: 0
- Guard changes: manual business contract usage must affect render/action behavior; hidden data-contract-route markers are rejected for runtime contract pages; generated implemented release pages are P1 until converted.
- Remaining generated_from_existing_page debt backlog: 140

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


## Legacy Route Inventory

Total: 152

| Severity | Classification | File/Route | Decision | Evidence |
| --- | --- | --- | --- | --- |
| P2 | keep_redirect | app/page.tsx | keep_redirect | release=hidden; implementation=hidden; redirect-only page; no real UI signals |
| P2 | active_runtime_dependency | app/app/page.tsx | retain | release=release; implementation=implemented; real UI signals present |
| P2 | active_runtime_dependency | app/app/aboneligim/page.tsx | retain | release=release; implementation=implemented; real UI signals present |
| P2 | active_runtime_dependency | app/app/ayarlar/bildirimler/page.tsx | retain | release=development_internal; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/belgeler/page.tsx | retain | release=development_internal; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/crm/firsatlar/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/crm/leadler/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/crm/paydaslar/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/crm/pipeline/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/crm/pipeline-ayarlari/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/crm/takipler/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/dashboard/page.tsx | retain | release=development; implementation=blocked; redirect-only page; no real UI signals |
| P2 | active_runtime_dependency | app/app/demo/document-slot-uploader/page.tsx | retain | release=development_demo; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/demo/image-slot-uploader/page.tsx | retain | release=development_demo; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/demo/user-avatar/page.tsx | retain | release=development_demo; implementation=planned; no real UI signals |
| P2 | keep_redirect | app/app/design-lab/page.tsx | keep_redirect | release=hidden; implementation=hidden; redirect-only page; no real UI signals; legacy/deprecated signal |
| P2 | active_runtime_dependency | app/app/development/temalarimiz/page.tsx | retain | release=development_internal; implementation=implemented; real UI signals present |
| P2 | active_runtime_dependency | app/app/gorev-ve-proje-yonetimi/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/gorev-ve-proje-yonetimi/backlog/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/gorev-ve-proje-yonetimi/gorevler/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/gorev-ve-proje-yonetimi/is-akislari/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/gorev-ve-proje-yonetimi/kanban-board/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/gorev-ve-proje-yonetimi/projeler/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/gorev-ve-proje-yonetimi/raporlar/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/gorev-ve-proje-yonetimi/sprintler/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/gorev-ve-proje-yonetimi/takvim/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/gorev-ve-proje-yonetimi/zaman-takibi/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/ik/calisanlar/page.tsx | retain | release=release; implementation=implemented; real UI signals present |
| P2 | active_runtime_dependency | app/app/ik/calisma-planlari/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/ik/devam-devamsizlik/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | needs_manual_review | app/app/ik/employees/page.tsx | manual_review | release=development; implementation=blocked; redirect-only page; no real UI signals; legacy/deprecated signal |
| P2 | active_runtime_dependency | app/app/ik/izin-bakiyeleri/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/ik/izin-turleri/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/ik/izinler/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | needs_manual_review | app/app/ik/personel/page.tsx | manual_review | release=development; implementation=blocked; real UI signals present; legacy/deprecated signal |
| P2 | needs_manual_review | app/app/ik/personel-ekle/page.tsx | keep_development_placeholder | release=coming_soon; implementation=planned; redirect-only page; no real UI signals; legacy/deprecated signal |
| P2 | needs_manual_review | app/app/ik/personel/[id]/page.tsx | keep_development_placeholder | release=coming_soon; implementation=planned; redirect-only page; no real UI signals; legacy/deprecated signal |
| P2 | active_runtime_dependency | app/app/ik/puantaj/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/ik/teskilat/page.tsx | retain | release=development; implementation=blocked; no real UI signals |
| P2 | active_runtime_dependency | app/app/muhasebe/page.tsx | retain | release=development; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/muhasebe/banka-hareketleri/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/muhasebe/banka-hesaplari/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/muhasebe/banka-hesaplari-ve-kartlari/page.tsx | retain | release=development; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/muhasebe/banka-kart-hareketleri/page.tsx | retain | release=development; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/muhasebe/borclar/page.tsx | retain | release=development; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/muhasebe/cari-hareketler/page.tsx | retain | release=development; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/muhasebe/cari-kartlar/page.tsx | retain | release=development; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/muhasebe/dashboard/page.tsx | retain | release=development; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/muhasebe/e-fatura-e-arsiv/page.tsx | retain | release=development; implementation=blocked; no real UI signals |
| P2 | active_runtime_dependency | app/app/muhasebe/hesap-ve-kart-hareketleri/page.tsx | retain | release=development; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/muhasebe/hesaplar/page.tsx | retain | release=development; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/muhasebe/islemler/page.tsx | retain | release=development; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/muhasebe/mutabakat/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/muhasebe/on-muhasebe-hareketleri/page.tsx | retain | release=development; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/muhasebe/projeler/page.tsx | retain | release=development; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/muhasebe/sermaye-mutabakati/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/onboarding/page.tsx | retain | release=development; implementation=blocked; redirect-only page; no real UI signals |
| P2 | active_runtime_dependency | app/app/profil/page.tsx | retain | release=release; implementation=implemented; real UI signals present |
| P2 | active_runtime_dependency | app/app/raporlama/ozel-raporlar/page.tsx | retain | release=development_internal; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/raporlama/zamanlanmis-raporlar/page.tsx | retain | release=development_internal; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/satis-sonrasi/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/satis-sonrasi/bakim-planlari/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/satis-sonrasi/bakim-sozlesme-takip/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/satis-sonrasi/bakimi-gelenler/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/satis-sonrasi/checklistler/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/satis-sonrasi/garanti-takip/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/satis-sonrasi/kurulu-urunler/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/satis-sonrasi/lisans-takip/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/satis-sonrasi/mobil-servis/[assignment_id]/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/satis-sonrasi/musterideki-urunler/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/satis-sonrasi/saha-gorevleri/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/satis-sonrasi/servis-destek-kayitlari/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/satis-sonrasi/servis-kayitlari/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/satis-sonrasi/servis-talepleri/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | keep_compatibility_adapter | app/app/satis/sozlesmeler/page.tsx | keep_hidden_wrapper | release=hidden; implementation=hidden; real UI signals present; legacy/deprecated signal |
| P2 | active_runtime_dependency | app/app/sirket/page.tsx | retain | release=development; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/sirket/araclar/page.tsx | retain | release=development; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/sirket/companies/page.tsx | retain | release=release; implementation=implemented; real UI signals present |
| P2 | active_runtime_dependency | app/app/sirket/companies/branches/page.tsx | retain | release=development; implementation=implemented; real UI signals present |
| P2 | active_runtime_dependency | app/app/sirket/companies/partners/page.tsx | retain | release=release; implementation=implemented; real UI signals present |
| P2 | active_runtime_dependency | app/app/sirket/companies/representatives/page.tsx | retain | release=release; implementation=implemented; real UI signals present |
| P2 | active_runtime_dependency | app/app/sirket/companies/stakeholders/page.tsx | retain | release=development; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/sirket/demirbas/page.tsx | retain | release=development; implementation=planned; real UI signals present |
| P2 | keep_compatibility_adapter | app/app/sirket/paydaslar/page.tsx | keep_hidden_wrapper | release=hidden; implementation=hidden; no real UI signals; legacy/deprecated signal |
| P2 | active_runtime_dependency | app/app/sirket/surecler/page.tsx | retain | release=development; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/sirket/tesisler/page.tsx | retain | release=development; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/sirket/teskilat/page.tsx | retain | release=development; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/sistem/page.tsx | retain | release=development_internal; implementation=blocked; no real UI signals |
| P2 | active_runtime_dependency | app/app/sistem/ai-copilot/page.tsx | retain | release=development_internal; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/sistem/audit/page.tsx | retain | release=development_internal; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/sistem/e-postalar/page.tsx | retain | release=development_internal; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/sistem/entegrasyon-ayarlari/page.tsx | retain | release=development_internal; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/sistem/entegrasyonlar/page.tsx | retain | release=development_internal; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/sistem/export/page.tsx | retain | release=development_internal; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/sistem/genel/page.tsx | retain | release=development_internal; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/sistem/import/page.tsx | retain | release=development_internal; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/sistem/kullanici-talepleri/page.tsx | retain | release=development_internal; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/sistem/kullanicilar/page.tsx | retain | release=development_internal; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/sistem/kurulum/page.tsx | retain | release=release; implementation=implemented; real UI signals present |
| P2 | active_runtime_dependency | app/app/sistem/lisanslar/page.tsx | retain | release=development_internal; implementation=blocked; real UI signals present |
| P2 | needs_manual_review | app/app/sistem/login-sayfasi/page.tsx | keep_development_placeholder | release=coming_soon; implementation=planned; redirect-only page; no real UI signals; legacy/deprecated signal |
| P2 | active_runtime_dependency | app/app/sistem/module-licenses/page.tsx | retain | release=development_internal; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/sistem/moduller/page.tsx | retain | release=development_internal; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/sistem/otomasyonlar/page.tsx | retain | release=development_internal; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/sistem/outbox/page.tsx | retain | release=development_internal; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/sistem/ozellikler/page.tsx | retain | release=development_internal; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/sistem/roller/page.tsx | retain | release=development_internal; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/sistem/saglik/page.tsx | retain | release=development_internal; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/sistem/system-parameters/page.tsx | retain | release=development_internal; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/sistem/teknik/page.tsx | retain | release=development_internal; implementation=planned; no real UI signals |
| P2 | keep_compatibility_adapter | app/app/sistem/temalar/page.tsx | keep_hidden_wrapper | release=hidden; implementation=hidden; real UI signals present; legacy/deprecated signal |
| P2 | active_runtime_dependency | app/app/sistem/veri-kalitesi/page.tsx | retain | release=development_internal; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/sistem/yetkiler/page.tsx | retain | release=development_internal; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/sozlesmeler/page.tsx | retain | release=development; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/sozlesmeler/[id]/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/sozlesmeler/fesihler/page.tsx | retain | release=development; implementation=planned; real UI signals present |
| P2 | active_runtime_dependency | app/app/sozlesmeler/turler/page.tsx | retain | release=development; implementation=planned; real UI signals present |
| P2 | active_runtime_dependency | app/app/sozlesmeler/yeni/page.tsx | retain | release=development; implementation=planned; real UI signals present |
| P2 | active_runtime_dependency | app/app/sozlesmeler/yenilemeler/page.tsx | retain | release=development; implementation=planned; real UI signals present |
| P2 | active_runtime_dependency | app/app/surecler/page.tsx | retain | release=development_internal; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/surecler/[id]/page.tsx | retain | release=development_internal; implementation=blocked; real UI signals present |
| P2 | active_runtime_dependency | app/app/urun-ve-hizmetler/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/urun-ve-hizmetler/bakim-paketleri/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/urun-ve-hizmetler/garanti-sablonlari/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/urun-ve-hizmetler/hizmet-kartlari/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/urun-ve-hizmetler/katalog/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/urun-ve-hizmetler/lisans-abonelik-urunleri/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/urun-ve-hizmetler/seri-numarali-urunler/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/urun-ve-hizmetler/urun-kartlari/page.tsx | retain | release=development; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/app/yardim/page.tsx | retain | release=development; implementation=blocked; real UI signals present |
| P2 | keep_redirect | app/ayarlar/entegrasyon-ayarlari/page.tsx | keep_redirect | release=hidden; implementation=hidden; redirect-only page; no real UI signals; legacy/deprecated signal |
| P2 | keep_redirect | app/ik/personel/page.tsx | keep_redirect | release=hidden; implementation=hidden; redirect-only page; no real UI signals; legacy/deprecated signal |
| P2 | active_runtime_dependency | app/login/page.tsx | retain | release=release; implementation=implemented; no real UI signals |
| P2 | keep_redirect | app/muhasebe/page.tsx | keep_redirect | release=hidden; implementation=hidden; redirect-only page; no real UI signals; legacy/deprecated signal |
| P2 | keep_redirect | app/muhasebe/banka-hesaplari-ve-kartlari/page.tsx | keep_redirect | release=hidden; implementation=hidden; redirect-only page; no real UI signals; legacy/deprecated signal |
| P2 | keep_redirect | app/muhasebe/banka-kart-hareketleri/page.tsx | keep_redirect | release=hidden; implementation=hidden; redirect-only page; no real UI signals; legacy/deprecated signal |
| P2 | keep_redirect | app/muhasebe/cari-hareketler/page.tsx | keep_redirect | release=hidden; implementation=hidden; redirect-only page; no real UI signals; legacy/deprecated signal |
| P2 | keep_redirect | app/muhasebe/cari-kartlar/page.tsx | keep_redirect | release=hidden; implementation=hidden; redirect-only page; no real UI signals; legacy/deprecated signal |
| P2 | keep_redirect | app/muhasebe/hesap-ve-kart-hareketleri/page.tsx | keep_redirect | release=hidden; implementation=hidden; redirect-only page; no real UI signals; legacy/deprecated signal |
| P2 | keep_redirect | app/muhasebe/on-muhasebe-hareketleri/page.tsx | keep_redirect | release=hidden; implementation=hidden; redirect-only page; no real UI signals; legacy/deprecated signal |
| P2 | active_runtime_dependency | app/offline/page.tsx | retain | release=release; implementation=implemented; no real UI signals |
| P2 | active_runtime_dependency | app/portal/page.tsx | retain | release=development_internal; implementation=blocked; redirect-only page; no real UI signals |
| P2 | active_runtime_dependency | app/portal/dashboard/page.tsx | retain | release=development_internal; implementation=blocked; no real UI signals |
| P2 | active_runtime_dependency | app/portal/documents/page.tsx | retain | release=development_internal; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/portal/products/page.tsx | retain | release=development_internal; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/portal/products/[id]/page.tsx | retain | release=development_internal; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/portal/profile/page.tsx | retain | release=development_internal; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/portal/service-records/page.tsx | retain | release=development_internal; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/portal/service-requests/page.tsx | retain | release=development_internal; implementation=planned; no real UI signals |
| P2 | active_runtime_dependency | app/portal/service-requests/[id]/page.tsx | retain | release=development_internal; implementation=planned; no real UI signals |
| P2 | needs_manual_review | app/release-not-available/page.tsx | keep_development_placeholder | release=hidden; implementation=hidden; no real UI signals |
| P2 | active_runtime_dependency | app/test/page.tsx | retain | release=development_demo; implementation=planned; real UI signals present |


## Legacy Service Inventory

Total: 534

| Severity | Classification | File/Route | Decision | Evidence |
| --- | --- | --- | --- | --- |
| P2 | needs_manual_review | lib/api/listEndpoint.ts#parseListQuery | manual_review | missing API contract coverage |
| P2 | needs_manual_review | lib/api/listEndpoint.ts#listRange | manual_review | missing API contract coverage |
| P2 | needs_manual_review | lib/api/listEndpoint.ts#listMeta | manual_review | missing API contract coverage |
| P2 | needs_manual_review | lib/api/listEndpoint.ts#listMetaFromRows | manual_review | missing API contract coverage |
| P2 | active_runtime_dependency | lib/api/publicApiBaseUrl.ts#getPublicApiBaseUrl | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/api/publicApiBaseUrl.ts#hasPublicApiBaseUrl | retain_used_service_or_helper | missing API contract coverage |
| P2 | safe_delete_candidate | lib/api/serverResponseCache.ts#getServerResponseCache | delete_later_after_reference_scan | missing API contract coverage |
| P2 | safe_delete_candidate | lib/api/serverResponseCache.ts#setServerResponseCache | delete_later_after_reference_scan | missing API contract coverage |
| P2 | safe_delete_candidate | lib/api/serverResponseCache.ts#serverListCacheKey | delete_later_after_reference_scan | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/accounting/accountingService.ts#unwrapList | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/accounting/accountingService.ts#unwrapData | retain_used_service_or_helper | missing API contract coverage |
| P2 | safe_delete_candidate | lib/services/accounting/accountingService.ts#normalizeMoney | delete_later_after_reference_scan | missing API contract coverage |
| P1 | needs_contractization | lib/services/accounting/bankAccounts.service.ts#bankAccountsService.list | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/bankAccounts.service.ts#bankAccountsService.detail | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/bankAccounts.service.ts#bankAccountsService.create | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/bankAccounts.service.ts#bankAccountsService.update | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/bankAccounts.service.ts#bankAccountsService.delete | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/bankTransactions.service.ts#bankTransactionsService.list | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/bankTransactions.service.ts#bankTransactionsService.detail | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/bankTransactions.service.ts#bankTransactionsService.create | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/bankTransactions.service.ts#bankTransactionsService.importRows | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/bankTransactions.service.ts#bankTransactionsService.match | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/bankTransactions.service.ts#bankTransactionsService.ignore | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/capitalReconciliation.service.ts#capitalReconciliationService.list | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/capitalReconciliation.service.ts#capitalReconciliationService.detail | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/capitalReconciliation.service.ts#capitalReconciliationService.matchPayment | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/cariAccounts.service.ts#cariAccountsService.list | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/cariAccounts.service.ts#cariAccountsService.detail | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/cariAccounts.service.ts#cariAccountsService.create | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/cariAccounts.service.ts#cariAccountsService.update | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/cariAccounts.service.ts#cariAccountsService.delete | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/cariAccounts.service.ts#cariAccountsService.summary | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/cariAccounts.service.ts#cariAccountsService.companySummary | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/cariTransactions.service.ts#cariTransactionsService.list | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/cariTransactions.service.ts#cariTransactionsService.detail | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/cariTransactions.service.ts#cariTransactionsService.create | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/cariTransactions.service.ts#cariTransactionsService.update | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/cariTransactions.service.ts#cariTransactionsService.delete | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/eDocuments.service.ts#eDocumentsService.list | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/eDocuments.service.ts#eDocumentsService.detail | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/eDocuments.service.ts#eDocumentsService.create | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/eDocuments.service.ts#eDocumentsService.importRows | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/eDocuments.service.ts#eDocumentsService.match | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/eDocuments.service.ts#eDocumentsService.reject | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/reconciliation.service.ts#reconciliationService.suggestions | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/reconciliation.service.ts#reconciliationService.summary | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/reconciliation.service.ts#reconciliationService.unmatched | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/reconciliation.service.ts#reconciliationService.match | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/accounting/reconciliation.service.ts#reconciliationService.unmatch | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P2 | keep_compatibility_adapter | lib/services/accountingService.ts#accountingService.list | retain_legacy_cash_adapter_until_accounting_domain_consolidation | legacy adapter evidence: accounting.cash_legacy_adapter; /app/muhasebe/borclar:development/blocked/generated_from_existing_page, /app/muhasebe/dashboard:development/blocked/generated_from_existing_page, /app/muhasebe/hesaplar:development/blocked/generated_from_existing_page, /app/muhasebe/islemler:development/blocked/generated_from_existing_page, /app/muhasebe/projeler:development/blocked/generated_from_existing_page; 1 API call(s); API path not covered by contracts/api |
| P2 | keep_compatibility_adapter | lib/services/accountingService.ts#accountingService.create | retain_legacy_cash_adapter_until_accounting_domain_consolidation | legacy adapter evidence: accounting.cash_legacy_adapter; /app/muhasebe/borclar:development/blocked/generated_from_existing_page, /app/muhasebe/dashboard:development/blocked/generated_from_existing_page, /app/muhasebe/hesaplar:development/blocked/generated_from_existing_page, /app/muhasebe/islemler:development/blocked/generated_from_existing_page, /app/muhasebe/projeler:development/blocked/generated_from_existing_page; 1 API call(s); API path not covered by contracts/api |
| P2 | keep_compatibility_adapter | lib/services/accountingService.ts#accountingService.update | retain_legacy_cash_adapter_until_accounting_domain_consolidation | legacy adapter evidence: accounting.cash_legacy_adapter; /app/muhasebe/borclar:development/blocked/generated_from_existing_page, /app/muhasebe/dashboard:development/blocked/generated_from_existing_page, /app/muhasebe/hesaplar:development/blocked/generated_from_existing_page, /app/muhasebe/islemler:development/blocked/generated_from_existing_page, /app/muhasebe/projeler:development/blocked/generated_from_existing_page; 1 API call(s); API path not covered by contracts/api |
| P2 | keep_compatibility_adapter | lib/services/accountingService.ts#accountingService.delete | retain_legacy_cash_adapter_until_accounting_domain_consolidation | legacy adapter evidence: accounting.cash_legacy_adapter; /app/muhasebe/borclar:development/blocked/generated_from_existing_page, /app/muhasebe/dashboard:development/blocked/generated_from_existing_page, /app/muhasebe/hesaplar:development/blocked/generated_from_existing_page, /app/muhasebe/islemler:development/blocked/generated_from_existing_page, /app/muhasebe/projeler:development/blocked/generated_from_existing_page; 1 API call(s); API path not covered by contracts/api |
| P2 | needs_manual_review | lib/services/accountingService.ts#accountingService.invalidateList | manual_review | missing API contract coverage |
| P1 | needs_contractization | lib/services/admin/adminService.ts#adminService.dashboard | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/admin/adminService.ts#adminService.workspaceSettings | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/admin/adminService.ts#adminService.updateWorkspaceSettings | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/admin/adminService.ts#adminService.modules | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/admin/adminService.ts#adminService.setModuleActivation | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/admin/adminService.ts#adminService.features | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/admin/adminService.ts#adminService.setFeature | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P2 | active_runtime_dependency | lib/services/admin/adminService.ts#adminService.health | retain_used_service_or_helper | missing API contract coverage |
| P1 | needs_contractization | lib/services/admin/adminService.ts#adminService.integrations | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/admin/adminService.ts#adminService.testIntegration | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/admin/adminService.ts#adminService.outbox | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/admin/adminService.ts#adminService.retryOutbox | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/admin/adminService.ts#adminService.dispatchOutboxOnce | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/admin/adminService.ts#adminService.settings | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesAssets.list | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesAssets.create | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesAssets.update | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesAssets.serviceHistory | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesRequests.list | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesRequests.create | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesRequests.assign | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesRequests.assignTechnician | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesRequests.close | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesRecords.list | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesRecords.create | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesRecords.complete | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesRecords.start | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesRecords.addPhotos | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesRecords.checklist | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesRecords.patchChecklist | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesRecords.report | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesMaintenancePlans.list | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesMaintenancePlans.create | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesMaintenancePlans.update | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesMaintenanceDue.list | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesMaintenanceDue.createServiceRequest | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesMaintenanceDue.skip | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesFieldAssignments.list | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesFieldAssignments.get | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesFieldAssignments.accept | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesFieldAssignments.reject | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesFieldAssignments.setStatus | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesChecklistTemplates.list | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#afterSalesChecklistTemplates.create | retain_used_service_or_helper | missing API contract coverage |
| P2 | safe_delete_candidate | lib/services/after-sales/afterSales.service.ts#getAfterSalesSummary | delete_later_after_reference_scan | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#listMaintenanceDue | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/after-sales/afterSales.service.ts#warrantyCheck | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/ai/aiCopilot.service.ts#aiCopilotService.query | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/ai/aiCopilot.service.ts#aiCopilotService.context | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/ai/aiCopilot.service.ts#aiCopilotService.actionPreview | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/ai/aiCopilot.service.ts#aiCopilotService.formAssist | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/ai/aiCopilot.service.ts#aiCopilotService.documentSummary | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/ai/aiCopilot.service.ts#aiCopilotService.documentExtract | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/ai/aiCopilot.service.ts#aiCopilotService.suggestions | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/ai/aiCopilot.service.ts#aiCopilotService.history | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/ai/aiCopilot.service.ts#aiCopilotService.feedback | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/automation/automationService.ts#automationRules.list | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/automation/automationService.ts#automationRules.get | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/automation/automationService.ts#automationRules.create | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/automation/automationService.ts#automationRules.update | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/automation/automationService.ts#automationRules.remove | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/automation/automationService.ts#automationRules.activate | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/automation/automationService.ts#automationRules.pause | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/automation/automationService.ts#automationRules.disable | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/automation/automationService.ts#automationRules.runNow | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/automation/automationService.ts#automationRules.simulate | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/automation/automationService.ts#automationRegistry.triggers | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/automation/automationService.ts#automationRegistry.conditions | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/automation/automationService.ts#automationRegistry.actions | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/automation/automationService.ts#automationRegistry.templates | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/automation/automationService.ts#automationRuns.list | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/automation/automationService.ts#automationRuns.get | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/automation/automationService.ts#requestJson | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/automation/automationService.ts#toQueryString | retain_used_service_or_helper | missing API contract coverage |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.list | manual_review | serviceFunction appears in contracts/api |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.detail | manual_review | serviceFunction appears in contracts/api |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.detailSection | manual_review | serviceFunction appears in contracts/api |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.create | manual_review | serviceFunction appears in contracts/api |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.update | manual_review | serviceFunction appears in contracts/api |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.delete | manual_review | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/companyService.ts#companyService.capitalIncreasePrecheck | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/companyService.ts#companyService.completeCapitalIncrease | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/companyService.ts#companyService.capitalDecreasePrecheck | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | keep_compatibility_adapter | lib/services/companyService.ts#companyService.requestCapitalDecrease | retain_blocked_capital_decrease_request_until_operation_backend_exists | legacy adapter evidence: company.capital_decrease_blocked_lifecycle_adapter; no direct protected consumer route references; 1 API call(s); API path not covered by contracts/api |
| P2 | active_runtime_dependency | lib/services/companyService.ts#companyService.officialChangePrecheck | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/companyService.ts#companyService.completeOfficialChange | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/companyService.ts#companyService.branchesList | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.branchDetail | manual_review | serviceFunction appears in contracts/api |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.updateBranch | manual_review | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/companyService.ts#companyService.updateBranchDocuments | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/companyService.ts#companyService.branchOpeningPrecheck | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/companyService.ts#companyService.completeBranchOpening | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/companyService.ts#companyService.branchClosingPrecheck | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/companyService.ts#companyService.completeBranchClosing | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/companyService.ts#companyService.naceChangePrecheck | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/companyService.ts#companyService.completeNaceChange | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/companyService.ts#companyService.activitySubjectChangePrecheck | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/companyService.ts#companyService.completeActivitySubjectChange | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/companyService.ts#companyService.partners | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/companyService.ts#companyService.partnersList | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.partnerDetail | manual_review | serviceFunction appears in contracts/api |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.partnerDetailSection | manual_review | serviceFunction appears in contracts/api |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.createPartner | manual_review | serviceFunction appears in contracts/api |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.updatePartner | manual_review | missing API contract coverage |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.deletePartner | manual_review | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/companyService.ts#companyService.representatives | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/companyService.ts#companyService.representativesList | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/companyService.ts#companyService.representativeDetail | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.createRepresentative | manual_review | serviceFunction appears in contracts/api |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.updateRepresentative | manual_review | serviceFunction appears in contracts/api |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.deleteRepresentativeDraft | manual_review | missing API contract coverage |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.startRepresentativeAuthority | manual_review | serviceFunction appears in contracts/api |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.renewRepresentativeAuthority | manual_review | serviceFunction appears in contracts/api |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.changeRepresentativeAuthorityScope | manual_review | serviceFunction appears in contracts/api |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.changeRepresentativeLimit | manual_review | serviceFunction appears in contracts/api |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.suspendRepresentativeAuthority | manual_review | serviceFunction appears in contracts/api |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.resumeRepresentativeAuthority | manual_review | missing API contract coverage |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.terminateRepresentativeAuthority | manual_review | serviceFunction appears in contracts/api |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.correctRepresentativeAuthority | manual_review | serviceFunction appears in contracts/api |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.reverseRepresentativeAuthority | manual_review | serviceFunction appears in contracts/api |
| P2 | active_runtime_dependency | lib/services/companyService.ts#companyService.stakeholdersList | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/companyService.ts#companyService.stakeholderDetail | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/companyService.ts#companyService.currentOwnership | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.documents | manual_review | missing API contract coverage |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.logos | manual_review | missing API contract coverage |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.invalidateList | manual_review | serviceFunction appears in contracts/api |
| P2 | needs_manual_review | lib/services/companyService.ts#companyService.invalidateRelations | manual_review | serviceFunction appears in contracts/api |
| P2 | keep_compatibility_adapter | lib/services/companyVehicleService.ts#companyVehicleService.list | retain_company_vehicle_adapter_until_vehicle_domain_contractization | legacy adapter evidence: company.vehicle_blocked_development_adapter; /app/sirket/araclar:development/blocked/generated_from_existing_page; 1 API call(s); API path not covered by contracts/api |
| P2 | keep_compatibility_adapter | lib/services/companyVehicleService.ts#companyVehicleService.references | retain_company_vehicle_adapter_until_vehicle_domain_contractization | legacy adapter evidence: company.vehicle_blocked_development_adapter; /app/sirket/araclar:development/blocked/generated_from_existing_page; 1 API call(s); API path not covered by contracts/api |
| P2 | keep_compatibility_adapter | lib/services/companyVehicleService.ts#companyVehicleService.create | retain_company_vehicle_adapter_until_vehicle_domain_contractization | legacy adapter evidence: company.vehicle_blocked_development_adapter; /app/sirket/araclar:development/blocked/generated_from_existing_page; 1 API call(s); API path not covered by contracts/api |
| P2 | keep_compatibility_adapter | lib/services/companyVehicleService.ts#companyVehicleService.update | retain_company_vehicle_adapter_until_vehicle_domain_contractization | legacy adapter evidence: company.vehicle_blocked_development_adapter; /app/sirket/araclar:development/blocked/generated_from_existing_page; 1 API call(s); API path not covered by contracts/api |
| P2 | keep_compatibility_adapter | lib/services/companyVehicleService.ts#companyVehicleService.delete | retain_company_vehicle_adapter_until_vehicle_domain_contractization | legacy adapter evidence: company.vehicle_blocked_development_adapter; /app/sirket/araclar:development/blocked/generated_from_existing_page; 1 API call(s); API path not covered by contracts/api |
| P2 | needs_manual_review | lib/services/companyVehicleService.ts#companyVehicleService.invalidateList | manual_review | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/contracts/contractService.ts#contractService.list | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/contracts/contractService.ts#contractService.get | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/contracts/contractService.ts#contractService.create | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/contracts/contractService.ts#contractService.update | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/contracts/contractService.ts#contractService.lifecycle | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/contracts/contractService.ts#contractService.precheck | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/contracts/contractService.ts#contractService.relations | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/contracts/contractService.ts#contractService.obligations | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/contracts/contractService.ts#contractService.events | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmStakeholders.list | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmStakeholders.get | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmStakeholders.create | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmStakeholders.update | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmStakeholders.remove | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmStakeholders.relatedRecords | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmStakeholders.summary | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmStakeholders.createCariAccount | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmStakeholders.createFollowupTask | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmMasterData.searchPersons | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmMasterData.createPerson | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmMasterData.searchOrganizations | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmMasterData.createOrganization | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmInteractions.list | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmInteractions.create | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmLeads.list | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmLeads.get | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmLeads.create | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmLeads.update | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmLeads.qualify | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmLeads.convert | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmLeads.markLost | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmLeads.interactions | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmLeads.addInteraction | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmOpportunities.list | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmOpportunities.get | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmOpportunities.create | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmOpportunities.update | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmOpportunities.changeStage | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmOpportunities.markWon | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmOpportunities.markLost | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmOpportunities.createFollowupTask | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmOpportunities.uploadProposal | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmOpportunities.interactions | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmOpportunities.addInteraction | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmPipelines.list | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmPipelines.create | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmPipelines.stages | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmPipelines.updateStage | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmFollowups.due | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmFollowups.complete | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#crmFollowups.snooze | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#requestJson | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#unwrapList | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/crm/crmService.ts#toQueryString | retain_used_service_or_helper | missing API contract coverage |
| P1 | needs_contractization | lib/services/dataQuality/dataQualityService.ts#dataQualityService.summary | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/dataQuality/dataQualityService.ts#dataQualityService.runCheck | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/dataQuality/dataQualityService.ts#dataQualityService.checkEntity | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/dataQuality/dataQualityService.ts#dataQualityService.duplicates | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/dataQuality/dataQualityService.ts#dataQualityService.duplicateGroup | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/dataQuality/dataQualityService.ts#dataQualityService.detectDuplicates | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/dataQuality/dataQualityService.ts#dataQualityService.dismissDuplicate | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/dataQuality/dataQualityService.ts#dataQualityService.falsePositive | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/dataQuality/dataQualityService.ts#dataQualityService.mergePreview | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/dataQuality/dataQualityService.ts#dataQualityService.mergeConfirm | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/dataQuality/dataQualityService.ts#dataQualityService.rules | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/dataQuality/dataQualityService.ts#dataQualityService.updateRule | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/documents/documentRequirements.service.ts#documentRequirementsService.list | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/documents/documentRequirements.service.ts#documentRequirementsService.forOperation | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/documents/documentService.ts#documentService.list | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/documents/documentService.ts#documentService.get | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/documents/documentService.ts#documentService.create | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P2 | active_runtime_dependency | lib/services/documents/documentService.ts#documentService.upload | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/documents/documentService.ts#documentService.uploadForEntity | retain_used_service_or_helper | missing API contract coverage |
| P1 | needs_contractization | lib/services/documents/documentService.ts#documentService.byEntity | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P2 | active_runtime_dependency | lib/services/documents/documentService.ts#documentService.newVersion | retain_used_service_or_helper | missing API contract coverage |
| P1 | needs_contractization | lib/services/documents/documentService.ts#documentService.update | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/documents/documentService.ts#documentService.verify | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/documents/documentService.ts#documentService.reject | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/documents/documentService.ts#documentService.remove | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/documents/documentService.ts#documentService.downloadUrl | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/documents/documentService.ts#documentService.previewUrl | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/documents/documentService.ts#documentService.expiring | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/documents/documentService.ts#documentService.expired | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P1 | needs_contractization | lib/services/documents/documentService.ts#documentService.accessLogs | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P2 | active_runtime_dependency | lib/services/employeeService.ts#employeeService.list | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/employeeService.ts#employeeService.detail | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/employeeService.ts#employeeService.detailSection | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/employeeService.ts#employeeService.create | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/employeeService.ts#employeeService.update | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/employeeService.ts#employeeService.delete | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/employeeService.ts#employeeService.invalidateList | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/facilityService.ts#facilityService.list | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/facilityService.ts#facilityService.detail | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/facilityService.ts#facilityService.create | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/facilityService.ts#facilityService.update | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/facilityService.ts#facilityService.invalidateList | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/hr/employees.service.ts#employeesService.list | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/hr/employees.service.ts#employeesService.detail | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/hr/employees.service.ts#employeesService.create | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/hr/employees.service.ts#employeesService.update | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P1 | needs_contractization | lib/services/hr/employees.service.ts#employeesService.delete | contractize_before_promotion | missing API contract coverage; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/hr/employees.service.ts#employeesService.summary | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P1 | needs_contractization | lib/services/hr/employees.service.ts#employeesService.companySummary | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P2 | active_runtime_dependency | lib/services/hr/employees.service.ts#employeesService.documents | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/hr/employees.service.ts#employeesService.createDocument | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P1 | needs_contractization | lib/services/hr/employees.service.ts#employeesService.updateDocument | contractize_before_promotion | missing API contract coverage; 1 API call(s); API path not covered by contracts/api |
| P2 | active_runtime_dependency | lib/services/hr/employment.service.ts#employmentService.start | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/hr/employment.service.ts#employmentService.terminate | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/hr/employment.service.ts#employmentService.assignmentChange | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/hr/employment.service.ts#employmentService.sgkEntryCompleted | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/hr/employment.service.ts#employmentService.sgkExitCompleted | retain_contract_covered_service | serviceFunction appears in contracts/api; 1 API call(s) |
| P2 | active_runtime_dependency | lib/services/hr/hrService.ts#unwrapList | retain_used_service_or_helper | missing API contract coverage |
| P2 | active_runtime_dependency | lib/services/hr/hrService.ts#unwrapData | retain_used_service_or_helper | missing API contract coverage |

_Only first 300 rows shown._

## Legacy BFF/API Route Inventory

Total: 552

| Severity | Classification | File/Route | Decision | Evidence |
| --- | --- | --- | --- | --- |
| P2 | keep_compatibility_adapter | app/api/accounting/bank-accounts-cards/[id]/history/route.ts | retain_explicit_adapter | migration=deprecated_compatibility_adapter; target=none |
| P2 | active_runtime_dependency | app/api/accounting/bank-accounts-cards/[id]/passivate/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-accounts-cards/{id}/passivate |
| P2 | active_runtime_dependency | app/api/accounting/bank-accounts-cards/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-accounts-cards/{id} |
| P2 | active_runtime_dependency | app/api/accounting/bank-accounts-cards/[id]/set-default/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-accounts-cards/{id}/set-default |
| P2 | active_runtime_dependency | app/api/accounting/bank-accounts-cards/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-accounts-cards |
| P2 | active_runtime_dependency | app/api/accounting/bank-accounts/[accountId]/passivate/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-accounts/{accountId}/passivate |
| P2 | active_runtime_dependency | app/api/accounting/bank-accounts/[accountId]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-accounts/{accountId} |
| P2 | active_runtime_dependency | app/api/accounting/bank-accounts/[accountId]/sync/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-accounts/{accountId}/sync |
| P2 | active_runtime_dependency | app/api/accounting/bank-accounts/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-accounts |
| P2 | active_runtime_dependency | app/api/accounting/bank-card-transactions/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-card-transactions |
| P2 | active_runtime_dependency | app/api/accounting/bank-cards/[cardId]/passivate/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-cards/{cardId}/passivate |
| P2 | active_runtime_dependency | app/api/accounting/bank-cards/[cardId]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-cards/{cardId} |
| P2 | active_runtime_dependency | app/api/accounting/bank-cards/[cardId]/sync/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-cards/{cardId}/sync |
| P2 | active_runtime_dependency | app/api/accounting/bank-connections/[id]/accounts/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-connections/{id}/accounts |
| P2 | active_runtime_dependency | app/api/accounting/bank-connections/[id]/cards/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-connections/{id}/cards |
| P2 | active_runtime_dependency | app/api/accounting/bank-connections/[id]/passivate/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-connections/{id}/passivate |
| P2 | active_runtime_dependency | app/api/accounting/bank-connections/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-connections/{id} |
| P2 | active_runtime_dependency | app/api/accounting/bank-connections/[id]/sync/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-connections/{id}/sync |
| P2 | active_runtime_dependency | app/api/accounting/bank-connections/[id]/test/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-connections/{id}/test |
| P2 | active_runtime_dependency | app/api/accounting/bank-connections/automation-preview/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-connections/automation-preview |
| P2 | active_runtime_dependency | app/api/accounting/bank-connections/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-connections |
| P2 | active_runtime_dependency | app/api/accounting/bank-transactions/[id]/ignore/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-transactions/{id}/ignore |
| P2 | active_runtime_dependency | app/api/accounting/bank-transactions/[id]/match/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-transactions/{id}/match |
| P2 | active_runtime_dependency | app/api/accounting/bank-transactions/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-transactions/{id} |
| P2 | active_runtime_dependency | app/api/accounting/bank-transactions/import/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-transactions/import |
| P2 | active_runtime_dependency | app/api/accounting/bank-transactions/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/bank-transactions |
| P2 | active_runtime_dependency | app/api/accounting/capital-reconciliation/[id]/match-payment/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/capital-reconciliation/{id}/match-payment |
| P2 | active_runtime_dependency | app/api/accounting/capital-reconciliation/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/capital-reconciliation/{id} |
| P2 | active_runtime_dependency | app/api/accounting/capital-reconciliation/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/capital-reconciliation |
| P2 | active_runtime_dependency | app/api/accounting/card-transactions/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/card-transactions |
| P2 | active_runtime_dependency | app/api/accounting/cari-accounts/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/cari-accounts/{id} |
| P2 | active_runtime_dependency | app/api/accounting/cari-accounts/[id]/summary/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/cari-accounts/{id}/summary |
| P2 | active_runtime_dependency | app/api/accounting/cari-accounts/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/cari-accounts |
| P2 | active_runtime_dependency | app/api/accounting/cari-transactions/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/cari-transactions/{id} |
| P2 | active_runtime_dependency | app/api/accounting/cari-transactions/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/cari-transactions |
| P2 | active_runtime_dependency | app/api/accounting/company/[companyId]/summary/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/company/{companyId}/summary |
| P2 | active_runtime_dependency | app/api/accounting/e-documents/[id]/match/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/e-documents/{id}/match |
| P2 | active_runtime_dependency | app/api/accounting/e-documents/[id]/reject/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/e-documents/{id}/reject |
| P2 | active_runtime_dependency | app/api/accounting/e-documents/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/e-documents/{id} |
| P2 | active_runtime_dependency | app/api/accounting/e-documents/import/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/e-documents/import |
| P2 | active_runtime_dependency | app/api/accounting/e-documents/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/e-documents |
| P2 | active_runtime_dependency | app/api/accounting/financial-institution-movements/[id]/create-pre-accounting/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/financial-institution-movements/{id}/create-pre-accounting |
| P2 | active_runtime_dependency | app/api/accounting/financial-institution-movements/[id]/history/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/financial-institution-movements/{id}/history |
| P2 | active_runtime_dependency | app/api/accounting/financial-institution-movements/[id]/match/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/financial-institution-movements/{id}/match |
| P2 | active_runtime_dependency | app/api/accounting/financial-institution-movements/[id]/passivate/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/financial-institution-movements/{id}/passivate |
| P2 | active_runtime_dependency | app/api/accounting/financial-institution-movements/[id]/review/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/financial-institution-movements/{id}/review |
| P2 | active_runtime_dependency | app/api/accounting/financial-institution-movements/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/financial-institution-movements/{id} |
| P2 | active_runtime_dependency | app/api/accounting/financial-institution-movements/[id]/unmatch/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/financial-institution-movements/{id}/unmatch |
| P2 | active_runtime_dependency | app/api/accounting/financial-institution-movements/manual/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/financial-institution-movements/manual |
| P2 | active_runtime_dependency | app/api/accounting/financial-institution-movements/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/financial-institution-movements |
| P2 | active_runtime_dependency | app/api/accounting/reconciliation/match/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/reconciliation/match |
| P2 | active_runtime_dependency | app/api/accounting/reconciliation/suggestions/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/reconciliation/suggestions |
| P2 | active_runtime_dependency | app/api/accounting/reconciliation/summary/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/reconciliation/summary |
| P2 | active_runtime_dependency | app/api/accounting/reconciliation/unmatch/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/reconciliation/unmatch |
| P2 | active_runtime_dependency | app/api/accounting/reconciliation/unmatched/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/reconciliation/unmatched |
| P2 | active_runtime_dependency | app/api/action-center/by-record/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/action-center/by-record |
| P2 | active_runtime_dependency | app/api/action-center/counts/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/action-center/counts |
| P2 | active_runtime_dependency | app/api/action-center/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/action-center |
| P2 | active_runtime_dependency | app/api/action-center/summary/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/action-center/summary |
| P2 | active_runtime_dependency | app/api/admin/features/[feature_key]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/admin/features/{feature_key} |
| P2 | active_runtime_dependency | app/api/admin/features/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/admin/features |
| P2 | active_runtime_dependency | app/api/admin/health/deep/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/admin/health/deep |
| P2 | active_runtime_dependency | app/api/admin/health/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/admin/health |
| P2 | active_runtime_dependency | app/api/admin/integrations/[integration_key]/test/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/admin/integrations/{integration_key}/test |
| P2 | active_runtime_dependency | app/api/admin/integrations/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/admin/integrations |
| P2 | active_runtime_dependency | app/api/admin/modules/[module_key]/activation/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/admin/modules/{module_key}/activation |
| P2 | active_runtime_dependency | app/api/admin/modules/[module_key]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/admin/modules/{module_key} |
| P2 | active_runtime_dependency | app/api/admin/modules/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/admin/modules |
| P2 | active_runtime_dependency | app/api/admin/outbox/[event_id]/retry/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/admin/outbox/{event_id}/retry |
| P2 | active_runtime_dependency | app/api/admin/outbox/dispatch-once/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/admin/outbox/dispatch-once |
| P2 | active_runtime_dependency | app/api/admin/outbox/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/admin/outbox |
| P2 | active_runtime_dependency | app/api/admin/portal/invitations/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/admin/portal/invitations |
| P2 | active_runtime_dependency | app/api/admin/portal/users/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/admin/portal/users/{portal_user_id} |
| P2 | active_runtime_dependency | app/api/admin/portal/users/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/admin/portal/users |
| P2 | active_runtime_dependency | app/api/admin/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/admin |
| P2 | active_runtime_dependency | app/api/admin/settings/[settings_key]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/admin/settings/{settings_key} |
| P2 | active_runtime_dependency | app/api/admin/settings/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/admin/settings |
| P2 | active_runtime_dependency | app/api/admin/workspace-settings/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/admin/workspace-settings |
| P2 | active_runtime_dependency | app/api/after-sales/assets/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/assets/{asset_id} |
| P2 | active_runtime_dependency | app/api/after-sales/assets/[id]/service-history/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/assets/{asset_id}/service-history |
| P2 | active_runtime_dependency | app/api/after-sales/assets/[id]/warranty-check/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/assets/{id}/warranty-check |
| P2 | active_runtime_dependency | app/api/after-sales/assets/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/assets |
| P2 | active_runtime_dependency | app/api/after-sales/checklist-templates/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/checklist-templates |
| P2 | active_runtime_dependency | app/api/after-sales/company/[companyId]/summary/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/company/{company_id}/summary |
| P2 | active_runtime_dependency | app/api/after-sales/field-assignments/[id]/accept/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/field-assignments/{id}/accept |
| P2 | active_runtime_dependency | app/api/after-sales/field-assignments/[id]/reject/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/field-assignments/{id}/reject |
| P2 | active_runtime_dependency | app/api/after-sales/field-assignments/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/field-assignments/{id} |
| P2 | active_runtime_dependency | app/api/after-sales/field-assignments/[id]/status/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/field-assignments/{id}/status |
| P2 | active_runtime_dependency | app/api/after-sales/field-assignments/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/field-assignments |
| P2 | active_runtime_dependency | app/api/after-sales/maintenance-due/[id]/create-service-request/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/maintenance-due/{id}/create-service-request |
| P2 | active_runtime_dependency | app/api/after-sales/maintenance-due/[id]/skip/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/maintenance-due/{id}/skip |
| P2 | active_runtime_dependency | app/api/after-sales/maintenance-due/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/maintenance-due |
| P2 | active_runtime_dependency | app/api/after-sales/maintenance-plans/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/maintenance-plans/{plan_id} |
| P2 | active_runtime_dependency | app/api/after-sales/maintenance-plans/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/maintenance-plans |
| P2 | active_runtime_dependency | app/api/after-sales/service-records/[id]/checklist/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/service-records/{id}/checklist |
| P2 | active_runtime_dependency | app/api/after-sales/service-records/[id]/complete/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/service-records/{service_id}/complete |
| P2 | active_runtime_dependency | app/api/after-sales/service-records/[id]/photos/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/service-records/{id}/photos |
| P2 | active_runtime_dependency | app/api/after-sales/service-records/[id]/report/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/service-records/{id}/report |
| P2 | active_runtime_dependency | app/api/after-sales/service-records/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/service-records/{service_id} |
| P2 | active_runtime_dependency | app/api/after-sales/service-records/[id]/start/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/service-records/{id}/start |
| P2 | active_runtime_dependency | app/api/after-sales/service-records/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/service-records |
| P2 | active_runtime_dependency | app/api/after-sales/service-requests/[id]/assign-technician/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/service-requests/{id}/assign-technician |
| P2 | active_runtime_dependency | app/api/after-sales/service-requests/[id]/assign/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/service-requests/{request_id}/assign |
| P2 | active_runtime_dependency | app/api/after-sales/service-requests/[id]/close/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/service-requests/{request_id}/close |
| P2 | active_runtime_dependency | app/api/after-sales/service-requests/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/service-requests/{request_id} |
| P2 | active_runtime_dependency | app/api/after-sales/service-requests/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/service-requests |
| P2 | active_runtime_dependency | app/api/ai/action-guide/actions/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/ai/action-guide/actions |
| P2 | active_runtime_dependency | app/api/ai/action-guide/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/action-guide |
| P2 | active_runtime_dependency | app/api/ai/copilot/action-preview/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/ai/copilot/action-preview |
| P2 | active_runtime_dependency | app/api/ai/copilot/context/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/ai/copilot/context |
| P2 | active_runtime_dependency | app/api/ai/copilot/document-extract/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/ai/copilot/document-extract |
| P2 | active_runtime_dependency | app/api/ai/copilot/document-summary/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/ai/copilot/document-summary |
| P2 | active_runtime_dependency | app/api/ai/copilot/feedback/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/ai/copilot/feedback |
| P2 | active_runtime_dependency | app/api/ai/copilot/form-assist/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/ai/copilot/form-assist |
| P2 | active_runtime_dependency | app/api/ai/copilot/history/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/ai/copilot/history |
| P2 | active_runtime_dependency | app/api/ai/copilot/query/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/ai/copilot/query |
| P2 | active_runtime_dependency | app/api/ai/copilot/suggestions/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/ai/copilot/suggestions |
| P2 | needs_manual_review | app/api/ai/cv-extract/route.ts | manual_review | migration=guarded_proxy_to_fastapi; target=/api/v1/ai/cv-extract |
| P2 | active_runtime_dependency | app/api/approvals/[id]/approve/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/approvals/{id}/approve |
| P2 | active_runtime_dependency | app/api/approvals/[id]/reject/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/approvals/{id}/reject |
| P2 | active_runtime_dependency | app/api/approvals/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/approvals |
| P2 | active_runtime_dependency | app/api/audit/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/audit/{id} |
| P2 | active_runtime_dependency | app/api/audit/by-operation/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/audit/by-operation |
| P2 | active_runtime_dependency | app/api/audit/by-process/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/audit/by-process |
| P2 | active_runtime_dependency | app/api/audit/by-record/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/audit/by-record |
| P2 | active_runtime_dependency | app/api/audit/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/audit |
| P2 | active_runtime_dependency | app/api/auth/company-join/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/onboarding/company-join |
| P2 | keep_compatibility_adapter | app/api/auth/logout/route.ts | retain_explicit_adapter | migration=keep_session_bootstrap; target=none |
| P2 | keep_compatibility_adapter | app/api/auth/me/route.ts | retain_explicit_adapter | migration=keep_session_bootstrap; target=none |
| P2 | keep_compatibility_adapter | app/api/auth/otp/route.ts | retain_explicit_adapter | migration=keep_session_bootstrap; target=none |
| P2 | keep_compatibility_adapter | app/api/auth/otp/send/route.ts | retain_explicit_adapter | migration=keep_session_bootstrap; target=none |
| P2 | keep_compatibility_adapter | app/api/auth/tenant-access/route.ts | retain_explicit_adapter | migration=keep_session_bootstrap; target=none |
| P2 | active_runtime_dependency | app/api/auth/tenant-status/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/auth/tenant-status |
| P2 | active_runtime_dependency | app/api/automation/actions/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/automation/actions |
| P2 | active_runtime_dependency | app/api/automation/conditions/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/automation/conditions |
| P2 | active_runtime_dependency | app/api/automation/rules/[id]/activate/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/automation/rules/{rule_id}/activate |
| P2 | active_runtime_dependency | app/api/automation/rules/[id]/disable/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/automation/rules/{rule_id}/disable |
| P2 | active_runtime_dependency | app/api/automation/rules/[id]/pause/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/automation/rules/{rule_id}/pause |
| P2 | active_runtime_dependency | app/api/automation/rules/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/automation/rules/{rule_id} |
| P2 | active_runtime_dependency | app/api/automation/rules/[id]/run-now/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/automation/rules/{rule_id}/run-now |
| P2 | active_runtime_dependency | app/api/automation/rules/[id]/simulate/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/automation/rules/{rule_id}/simulate |
| P2 | active_runtime_dependency | app/api/automation/rules/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/automation/rules |
| P2 | active_runtime_dependency | app/api/automation/runs/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/automation/runs/{run_id} |
| P2 | active_runtime_dependency | app/api/automation/runs/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/automation/runs |
| P2 | active_runtime_dependency | app/api/automation/templates/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/automation/templates |
| P2 | active_runtime_dependency | app/api/automation/triggers/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/automation/triggers |
| P2 | active_runtime_dependency | app/api/bulk/actions/[id]/confirm/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/bulk/actions/{id}/confirm |
| P2 | active_runtime_dependency | app/api/bulk/actions/[id]/report/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/bulk/actions/{id}/report |
| P2 | active_runtime_dependency | app/api/bulk/actions/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/bulk/actions/{id} |
| P2 | active_runtime_dependency | app/api/bulk/actions/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/bulk/actions |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/capital-decreases/precheck/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/capital-decreases/precheck |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/capital-decreases/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/capital-decreases |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/capital-increases/precheck/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/capital-increases/precheck |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/capital-increases/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/capital-increases |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/current-ownership/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/current-ownership |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/deregistration-wizard/complete/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/deregistration-wizard/complete |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/deregistration-wizard/context/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/deregistration-wizard/context |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/lifecycle-events/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/lifecycle-events |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/lifecycle/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/lifecycle |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/liquidation-wizard/complete/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/liquidation-wizard/complete |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/liquidation-wizard/context/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/liquidation-wizard/context |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/nace-codes/[id]/passivate/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/nace-codes/{id}/passivate |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/nace-codes/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/nace-codes/{id} |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/nace-codes/[id]/set-primary/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/nace-codes/{id}/set-primary |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/nace-codes/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/nace-codes |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/official-changes/[change_type]/precheck/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/official-changes/{change_type}/precheck |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/official-changes/[change_type]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/official-changes/{change_type} |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/official-changes/activity-subject-change/precheck/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/official-changes/activity-subject-change/precheck |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/official-changes/activity-subject-change/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/official-changes/activity-subject-change |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/official-changes/address-change/precheck/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/official-changes/address-change/precheck |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/official-changes/address-change/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/official-changes/address-change |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/official-changes/branch-closing/precheck/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/branch-closings/precheck |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/official-changes/branch-closing/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/branch-closings |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/official-changes/branch-opening/precheck/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/branch-openings/precheck |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/official-changes/branch-opening/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/branch-openings |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/official-changes/nace-change/precheck/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/official-changes/nace-change/precheck |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/official-changes/nace-change/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/official-changes/nace-change |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/official-changes/public-registration-update/precheck/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/official-changes/public-registration-update/precheck |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/official-changes/public-registration-update/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/official-changes/public-registration-update |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/official-changes/title-change/precheck/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/official-changes/title-change/precheck |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/official-changes/title-change/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/official-changes/title-change |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/opening-wizard/complete/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/opening-wizard/complete |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/opening-wizard/context/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id}/opening-wizard/context |
| P2 | active_runtime_dependency | app/api/companies/[company_id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies/{company_id} |
| P2 | active_runtime_dependency | app/api/companies/branches/[id]/documents/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/branches/{id}/documents |
| P2 | active_runtime_dependency | app/api/companies/branches/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/branches/{id} |
| P2 | active_runtime_dependency | app/api/companies/branches/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/branches |
| P2 | active_runtime_dependency | app/api/companies/current-ownership/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/ownership/current |
| P2 | active_runtime_dependency | app/api/companies/partners/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/partners/{id} |
| P2 | active_runtime_dependency | app/api/companies/partners/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/partners |
| P2 | active_runtime_dependency | app/api/companies/representatives/[id]/authority-transactions/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/representatives/{id}/authority-transactions |
| P2 | active_runtime_dependency | app/api/companies/representatives/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/representatives/{id} |
| P2 | active_runtime_dependency | app/api/companies/representatives/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/representatives |
| P2 | active_runtime_dependency | app/api/companies/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/companies |
| P2 | active_runtime_dependency | app/api/companies/stakeholders/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/crm/stakeholders/{id} |
| P2 | active_runtime_dependency | app/api/companies/stakeholders/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/crm/stakeholders |
| P2 | active_runtime_dependency | app/api/companies/vehicles/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/after-sales/assets |
| P2 | active_runtime_dependency | app/api/contracts/[id]/activate/precheck/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/contracts/{id}/activate/precheck |
| P2 | active_runtime_dependency | app/api/contracts/[id]/activate/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/contracts/{id}/activate |
| P2 | active_runtime_dependency | app/api/contracts/[id]/amend/precheck/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/contracts/{id}/amend/precheck |
| P2 | active_runtime_dependency | app/api/contracts/[id]/amend/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/contracts/{id}/amend |
| P2 | active_runtime_dependency | app/api/contracts/[id]/archive/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/contracts/{id}/archive |
| P2 | active_runtime_dependency | app/api/contracts/[id]/documents/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/contracts/{id}/documents |
| P2 | active_runtime_dependency | app/api/contracts/[id]/documents/upload/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/contracts/{id}/documents/upload |
| P2 | active_runtime_dependency | app/api/contracts/[id]/events/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/contracts/{id}/events |
| P2 | active_runtime_dependency | app/api/contracts/[id]/obligations/[obligationId]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/contracts/{id}/obligations/{obligationId} |
| P2 | active_runtime_dependency | app/api/contracts/[id]/obligations/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/contracts/{id}/obligations |
| P2 | active_runtime_dependency | app/api/contracts/[id]/relations/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/contracts/{id}/relations |
| P2 | active_runtime_dependency | app/api/contracts/[id]/renew/precheck/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/contracts/{id}/renew/precheck |
| P2 | active_runtime_dependency | app/api/contracts/[id]/renew/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/contracts/{id}/renew |
| P2 | active_runtime_dependency | app/api/contracts/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/contracts/{id} |
| P2 | active_runtime_dependency | app/api/contracts/[id]/suspend/precheck/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/contracts/{id}/suspend/precheck |
| P2 | active_runtime_dependency | app/api/contracts/[id]/suspend/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/contracts/{id}/suspend |
| P2 | active_runtime_dependency | app/api/contracts/[id]/terminate/precheck/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/contracts/{id}/terminate/precheck |
| P2 | active_runtime_dependency | app/api/contracts/[id]/terminate/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/contracts/{id}/terminate |
| P2 | active_runtime_dependency | app/api/contracts/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/contracts |
| P2 | active_runtime_dependency | app/api/crm/[...path]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/crm/{path} |
| P2 | active_runtime_dependency | app/api/crm/master/organizations/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/crm/master/organizations |
| P2 | active_runtime_dependency | app/api/crm/master/organizations/search/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/crm/master/organizations/search |
| P2 | active_runtime_dependency | app/api/crm/master/persons/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/crm/master/persons |
| P2 | active_runtime_dependency | app/api/crm/master/persons/search/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/crm/master/persons/search |
| P2 | active_runtime_dependency | app/api/crm/stakeholders/[id]/create-cari-account/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/crm/stakeholders/{stakeholder_id}/create-cari-account |
| P2 | active_runtime_dependency | app/api/crm/stakeholders/[id]/create-followup-task/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/crm/stakeholders/{stakeholder_id}/create-followup-task |
| P2 | active_runtime_dependency | app/api/crm/stakeholders/[id]/interactions/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/crm/stakeholders/{stakeholder_id}/interactions |
| P2 | active_runtime_dependency | app/api/crm/stakeholders/[id]/related-records/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/crm/stakeholders/{stakeholder_id}/related-records |
| P2 | active_runtime_dependency | app/api/crm/stakeholders/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/crm/stakeholders/{stakeholder_id} |
| P2 | active_runtime_dependency | app/api/crm/stakeholders/[id]/summary/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/crm/stakeholders/{stakeholder_id}/summary |
| P2 | active_runtime_dependency | app/api/crm/stakeholders/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/crm/stakeholders |
| P2 | keep_compatibility_adapter | app/api/cron/document-thumbnails/route.ts | retain_explicit_adapter | migration=keep_upload_adapter; target=none |
| P2 | active_runtime_dependency | app/api/cron/outbox-dispatch/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/system/outbox/dispatch |
| P2 | active_runtime_dependency | app/api/cron/update-reference-data/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/system/reference-data/update |
| P2 | active_runtime_dependency | app/api/dashboard/[module]/summary/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/reporting/dashboard/module/{module}/summary |
| P2 | active_runtime_dependency | app/api/dashboard/[module]/widgets/[widgetId]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/reporting/dashboard/module/{module}/widgets/{widgetId} |
| P2 | active_runtime_dependency | app/api/dashboard/geographic-trade-reach/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/reporting/dashboard/geographic-trade-reach |
| P2 | active_runtime_dependency | app/api/data-quality/by-entity/[entity_type]/[entity_id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/data-quality/by-entity/{entity_type}/{entity_id} |
| P2 | active_runtime_dependency | app/api/data-quality/check/[entity_type]/[entity_id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/data-quality/check/{entity_type}/{entity_id} |
| P2 | active_runtime_dependency | app/api/data-quality/check/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/data-quality/check |
| P2 | active_runtime_dependency | app/api/data-quality/duplicates/[group_id]/dismiss/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/data-quality/duplicates/{group_id}/dismiss |
| P2 | active_runtime_dependency | app/api/data-quality/duplicates/[group_id]/false-positive/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/data-quality/duplicates/{group_id}/false-positive |
| P2 | active_runtime_dependency | app/api/data-quality/duplicates/[group_id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/data-quality/duplicates/{group_id} |
| P2 | active_runtime_dependency | app/api/data-quality/duplicates/detect/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/data-quality/duplicates/detect |
| P2 | active_runtime_dependency | app/api/data-quality/duplicates/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/data-quality/duplicates |
| P2 | active_runtime_dependency | app/api/data-quality/merge/[merge_id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/data-quality/merge/{merge_id} |
| P2 | active_runtime_dependency | app/api/data-quality/merge/confirm/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/data-quality/merge/confirm |
| P2 | active_runtime_dependency | app/api/data-quality/merge/preview/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/data-quality/merge/preview |
| P2 | active_runtime_dependency | app/api/data-quality/rules/[rule_key]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/data-quality/rules/{rule_key} |
| P2 | active_runtime_dependency | app/api/data-quality/rules/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/data-quality/rules |
| P2 | active_runtime_dependency | app/api/data-quality/summary/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/data-quality/summary |
| P2 | active_runtime_dependency | app/api/documents/[id]/access-logs/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/documents/{id}/access-logs |
| P2 | active_runtime_dependency | app/api/documents/[id]/download-url/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/documents/{id}/download-url |
| P2 | active_runtime_dependency | app/api/documents/[id]/media-access-url/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/documents/{document_id}/media-access-url |
| P2 | keep_compatibility_adapter | app/api/documents/[id]/new-version/route.ts | retain_explicit_adapter | migration=keep_upload_adapter; target=none |
| P2 | active_runtime_dependency | app/api/documents/[id]/preview-url/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/documents/{id}/preview-url |
| P2 | active_runtime_dependency | app/api/documents/[id]/reject/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/documents/{id}/reject |
| P2 | active_runtime_dependency | app/api/documents/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/documents/{id} |
| P2 | active_runtime_dependency | app/api/documents/[id]/verify/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/documents/{id}/verify |
| P2 | active_runtime_dependency | app/api/documents/by-entity/[entity_type]/[entity_id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/documents/by-entity/{entity_type}/{entity_id} |
| P2 | keep_compatibility_adapter | app/api/documents/by-entity/[entity_type]/[entity_id]/upload/route.ts | retain_explicit_adapter | migration=keep_upload_adapter; target=none |
| P2 | active_runtime_dependency | app/api/documents/expired/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/documents/expired |
| P2 | active_runtime_dependency | app/api/documents/expiring/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/documents/expiring |
| P2 | active_runtime_dependency | app/api/documents/requirements/[module_key]/[operation_key]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/documents/requirements/{module_key}/{operation_key} |
| P2 | active_runtime_dependency | app/api/documents/requirements/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/documents/requirements |
| P2 | active_runtime_dependency | app/api/documents/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/documents |
| P2 | keep_compatibility_adapter | app/api/documents/upload/route.ts | retain_explicit_adapter | migration=keep_upload_adapter; target=none |
| P2 | active_runtime_dependency | app/api/employees/[employeeId]/entry-wizard/complete-with-manual-sgk/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/hr/employees/{employeeId}/entry-wizard/complete-with-manual-sgk |
| P2 | active_runtime_dependency | app/api/employees/[employeeId]/entry-wizard/complete/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/hr/employees/{employeeId}/entry-wizard/complete |
| P2 | active_runtime_dependency | app/api/employees/[employeeId]/entry-wizard/context/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/hr/employees/{employeeId}/entry-wizard/context |
| P2 | active_runtime_dependency | app/api/employees/[employeeId]/exit-wizard/complete-with-manual-sgk/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/hr/employees/{employeeId}/exit-wizard/complete-with-manual-sgk |
| P2 | active_runtime_dependency | app/api/employees/[employeeId]/exit-wizard/complete/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/hr/employees/{employeeId}/exit-wizard/complete |
| P2 | active_runtime_dependency | app/api/employees/[employeeId]/exit-wizard/context/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/hr/employees/{employeeId}/exit-wizard/context |
| P2 | active_runtime_dependency | app/api/employees/[employeeId]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/hr/employees/{employeeId} |
| P2 | active_runtime_dependency | app/api/employees/[employeeId]/sgk-entry/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/hr/employees/{employeeId}/sgk-entry |
| P2 | active_runtime_dependency | app/api/employees/[employeeId]/sgk-exit/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/hr/employees/{employeeId}/sgk-exit |
| P2 | active_runtime_dependency | app/api/employees/[employeeId]/work-lifecycle-events/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/hr/employees/{employeeId}/work-lifecycle-events |
| P2 | active_runtime_dependency | app/api/employees/[employeeId]/work-relation/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/hr/employees/{employeeId}/work-relation |
| P2 | active_runtime_dependency | app/api/employees/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/hr/employees |
| P2 | active_runtime_dependency | app/api/entities/[entityKind]/[entityId]/bank-accounts/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/entities/{entityKind}/{entityId}/bank-accounts |
| P2 | active_runtime_dependency | app/api/entity-bank-accounts/[id]/history/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/entity-bank-accounts/{id}/history |
| P2 | active_runtime_dependency | app/api/entity-bank-accounts/[id]/passivate/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/entity-bank-accounts/{id}/passivate |
| P2 | active_runtime_dependency | app/api/entity-bank-accounts/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/entity-bank-accounts/{id} |
| P2 | active_runtime_dependency | app/api/entity-bank-accounts/[id]/set-default/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/entity-bank-accounts/{id}/set-default |
| P2 | active_runtime_dependency | app/api/entity-bank-accounts/form-priority-mode/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/entity-bank-accounts/form-priority-mode |
| P2 | active_runtime_dependency | app/api/entity-bank-accounts/parse-iban/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/entity-bank-accounts/parse-iban |
| P2 | active_runtime_dependency | app/api/entity-bank-accounts/validate-swift/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/accounting/entity-bank-accounts/validate-swift |
| P2 | active_runtime_dependency | app/api/export/jobs/[id]/download/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/export/jobs/{id}/download |
| P2 | active_runtime_dependency | app/api/export/jobs/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/export/jobs/{id} |
| P2 | active_runtime_dependency | app/api/export/jobs/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/export/jobs |
| P2 | active_runtime_dependency | app/api/facilities/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/facilities/{facility_id} |
| P2 | active_runtime_dependency | app/api/facilities/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/facilities |
| P2 | active_runtime_dependency | app/api/features/[feature_key]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/features/{feature_key} |
| P2 | active_runtime_dependency | app/api/features/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/features |
| P2 | active_runtime_dependency | app/api/hr/attendance/[id]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/hr/attendance/{id} |
| P2 | active_runtime_dependency | app/api/hr/attendance/import/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/hr/attendance/import |
| P2 | active_runtime_dependency | app/api/hr/attendance/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/hr/attendance |
| P2 | active_runtime_dependency | app/api/hr/company/[companyId]/summary/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/hr/company/{companyId}/summary |
| P2 | active_runtime_dependency | app/api/hr/employees/[id]/documents/[documentId]/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/hr/employees/{id}/documents/{documentId} |
| P2 | active_runtime_dependency | app/api/hr/employees/[id]/documents/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/hr/employees/{id}/documents |
| P2 | active_runtime_dependency | app/api/hr/employees/[id]/employment/assignment-change/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/hr/employees/{id}/employment/assignment-change |
| P2 | active_runtime_dependency | app/api/hr/employees/[id]/employment/start/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/hr/employees/{id}/employment/start |
| P2 | active_runtime_dependency | app/api/hr/employees/[id]/employment/terminate/route.ts | retain_fastapi_proxy | migration=proxy_to_fastapi; target=/api/v1/hr/employees/{id}/employment/terminate |

_Only first 300 rows shown._

## Supabase/Vercel/Old Runtime Residue Inventory

Total: 194

| Severity | Classification | File/Route | Decision | Evidence |
| --- | --- | --- | --- | --- |
| P2 | needs_manual_review | app/api/accounting/_banking.ts | manual_review_runtime_residue | Supabase, @supabase/supabase-js in app/api/accounting/_banking.ts |
| P2 | needs_manual_review | app/api/accounting/bank-accounts-cards/[id]/passivate/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/bank-accounts-cards/[id]/passivate/route.ts |
| P2 | needs_manual_review | app/api/accounting/bank-accounts-cards/[id]/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/bank-accounts-cards/[id]/route.ts |
| P2 | needs_manual_review | app/api/accounting/bank-accounts-cards/[id]/set-default/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/bank-accounts-cards/[id]/set-default/route.ts |
| P2 | needs_manual_review | app/api/accounting/bank-accounts-cards/_shared.ts | manual_review_runtime_residue | Supabase, @supabase/supabase-js in app/api/accounting/bank-accounts-cards/_shared.ts |
| P2 | needs_manual_review | app/api/accounting/bank-accounts-cards/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/bank-accounts-cards/route.ts |
| P2 | needs_manual_review | app/api/accounting/bank-accounts/[accountId]/passivate/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/bank-accounts/[accountId]/passivate/route.ts |
| P2 | needs_manual_review | app/api/accounting/bank-accounts/[accountId]/sync/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/bank-accounts/[accountId]/sync/route.ts |
| P2 | needs_manual_review | app/api/accounting/bank-card-transactions/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/bank-card-transactions/route.ts |
| P2 | needs_manual_review | app/api/accounting/bank-cards/[cardId]/passivate/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/bank-cards/[cardId]/passivate/route.ts |
| P2 | needs_manual_review | app/api/accounting/bank-cards/[cardId]/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/bank-cards/[cardId]/route.ts |
| P2 | needs_manual_review | app/api/accounting/bank-cards/[cardId]/sync/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/bank-cards/[cardId]/sync/route.ts |
| P2 | needs_manual_review | app/api/accounting/bank-connections/[id]/accounts/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/bank-connections/[id]/accounts/route.ts |
| P2 | needs_manual_review | app/api/accounting/bank-connections/[id]/cards/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/bank-connections/[id]/cards/route.ts |
| P2 | needs_manual_review | app/api/accounting/bank-connections/[id]/passivate/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/bank-connections/[id]/passivate/route.ts |
| P2 | needs_manual_review | app/api/accounting/bank-connections/[id]/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/bank-connections/[id]/route.ts |
| P2 | needs_manual_review | app/api/accounting/bank-connections/[id]/sync/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/bank-connections/[id]/sync/route.ts |
| P2 | needs_manual_review | app/api/accounting/bank-connections/[id]/test/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/bank-connections/[id]/test/route.ts |
| P2 | needs_manual_review | app/api/accounting/bank-connections/automation-preview/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/bank-connections/automation-preview/route.ts |
| P2 | needs_manual_review | app/api/accounting/bank-connections/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/bank-connections/route.ts |
| P2 | needs_manual_review | app/api/accounting/financial-institution-movements/[id]/create-pre-accounting/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/financial-institution-movements/[id]/create-pre-accounting/route.ts |
| P2 | needs_manual_review | app/api/accounting/financial-institution-movements/[id]/history/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/financial-institution-movements/[id]/history/route.ts |
| P2 | needs_manual_review | app/api/accounting/financial-institution-movements/[id]/match/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/financial-institution-movements/[id]/match/route.ts |
| P2 | needs_manual_review | app/api/accounting/financial-institution-movements/[id]/passivate/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/financial-institution-movements/[id]/passivate/route.ts |
| P2 | needs_manual_review | app/api/accounting/financial-institution-movements/[id]/review/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/financial-institution-movements/[id]/review/route.ts |
| P2 | needs_manual_review | app/api/accounting/financial-institution-movements/[id]/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/financial-institution-movements/[id]/route.ts |
| P2 | needs_manual_review | app/api/accounting/financial-institution-movements/[id]/unmatch/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/financial-institution-movements/[id]/unmatch/route.ts |
| P2 | needs_manual_review | app/api/accounting/financial-institution-movements/manual/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/financial-institution-movements/manual/route.ts |
| P2 | needs_manual_review | app/api/accounting/financial-institution-movements/route.ts | manual_review_runtime_residue | Supabase in app/api/accounting/financial-institution-movements/route.ts |
| P2 | needs_manual_review | app/api/ai/cv-extract/route.ts | manual_review_runtime_residue | Supabase in app/api/ai/cv-extract/route.ts |
| P2 | needs_manual_review | app/api/approvals/[id]/approve/route.ts | manual_review_runtime_residue | Supabase in app/api/approvals/[id]/approve/route.ts |
| P2 | needs_manual_review | app/api/approvals/[id]/reject/route.ts | manual_review_runtime_residue | Supabase in app/api/approvals/[id]/reject/route.ts |
| P2 | needs_manual_review | app/api/approvals/route.ts | manual_review_runtime_residue | Supabase in app/api/approvals/route.ts |
| P2 | needs_manual_review | app/api/audit/[id]/route.ts | manual_review_runtime_residue | Supabase in app/api/audit/[id]/route.ts |
| P2 | needs_manual_review | app/api/audit/by-operation/route.ts | manual_review_runtime_residue | Supabase in app/api/audit/by-operation/route.ts |
| P2 | needs_manual_review | app/api/audit/by-process/route.ts | manual_review_runtime_residue | Supabase in app/api/audit/by-process/route.ts |
| P2 | needs_manual_review | app/api/audit/by-record/route.ts | manual_review_runtime_residue | Supabase in app/api/audit/by-record/route.ts |
| P2 | needs_manual_review | app/api/audit/route.ts | manual_review_runtime_residue | Supabase in app/api/audit/route.ts |
| P2 | needs_manual_review | app/api/auth/company-join/route.ts | manual_review_runtime_residue | Supabase in app/api/auth/company-join/route.ts |
| P2 | needs_manual_review | app/api/auth/otp/send/route.ts | manual_review_runtime_residue | Vercel in app/api/auth/otp/send/route.ts |
| P2 | needs_manual_review | app/api/auth/tenant-status/route.ts | manual_review_runtime_residue | Supabase in app/api/auth/tenant-status/route.ts |
| P2 | needs_manual_review | app/api/companies/[company_id]/capital-decreases/precheck/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/[company_id]/capital-decreases/precheck/route.ts |
| P2 | needs_manual_review | app/api/companies/[company_id]/capital-decreases/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/[company_id]/capital-decreases/route.ts |
| P2 | needs_manual_review | app/api/companies/[company_id]/capital-increases/precheck/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/[company_id]/capital-increases/precheck/route.ts |
| P2 | needs_manual_review | app/api/companies/[company_id]/capital-increases/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/[company_id]/capital-increases/route.ts |
| P2 | needs_manual_review | app/api/companies/[company_id]/current-ownership/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/[company_id]/current-ownership/route.ts |
| P2 | needs_manual_review | app/api/companies/[company_id]/nace-codes/[id]/passivate/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/[company_id]/nace-codes/[id]/passivate/route.ts |
| P2 | needs_manual_review | app/api/companies/[company_id]/nace-codes/[id]/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/[company_id]/nace-codes/[id]/route.ts |
| P2 | needs_manual_review | app/api/companies/[company_id]/nace-codes/[id]/set-primary/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/[company_id]/nace-codes/[id]/set-primary/route.ts |
| P2 | needs_manual_review | app/api/companies/[company_id]/nace-codes/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/[company_id]/nace-codes/route.ts |
| P2 | needs_manual_review | app/api/companies/[company_id]/official-changes/activity-subject-change/precheck/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/[company_id]/official-changes/activity-subject-change/precheck/route.ts |
| P2 | needs_manual_review | app/api/companies/[company_id]/official-changes/activity-subject-change/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/[company_id]/official-changes/activity-subject-change/route.ts |
| P2 | needs_manual_review | app/api/companies/[company_id]/official-changes/address-change/precheck/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/[company_id]/official-changes/address-change/precheck/route.ts |
| P2 | needs_manual_review | app/api/companies/[company_id]/official-changes/address-change/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/[company_id]/official-changes/address-change/route.ts |
| P2 | needs_manual_review | app/api/companies/[company_id]/official-changes/branch-closing/precheck/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/[company_id]/official-changes/branch-closing/precheck/route.ts |
| P2 | needs_manual_review | app/api/companies/[company_id]/official-changes/branch-closing/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/[company_id]/official-changes/branch-closing/route.ts |
| P2 | needs_manual_review | app/api/companies/[company_id]/official-changes/branch-opening/precheck/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/[company_id]/official-changes/branch-opening/precheck/route.ts |
| P2 | needs_manual_review | app/api/companies/[company_id]/official-changes/branch-opening/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/[company_id]/official-changes/branch-opening/route.ts |
| P2 | needs_manual_review | app/api/companies/[company_id]/official-changes/nace-change/precheck/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/[company_id]/official-changes/nace-change/precheck/route.ts |
| P2 | needs_manual_review | app/api/companies/[company_id]/official-changes/nace-change/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/[company_id]/official-changes/nace-change/route.ts |
| P2 | needs_manual_review | app/api/companies/[company_id]/official-changes/public-registration-update/precheck/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/[company_id]/official-changes/public-registration-update/precheck/route.ts |
| P2 | needs_manual_review | app/api/companies/[company_id]/official-changes/public-registration-update/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/[company_id]/official-changes/public-registration-update/route.ts |
| P2 | needs_manual_review | app/api/companies/[company_id]/official-changes/title-change/precheck/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/[company_id]/official-changes/title-change/precheck/route.ts |
| P2 | needs_manual_review | app/api/companies/[company_id]/official-changes/title-change/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/[company_id]/official-changes/title-change/route.ts |
| P2 | needs_manual_review | app/api/companies/[company_id]/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/[company_id]/route.ts |
| P2 | needs_manual_review | app/api/companies/branches/[id]/documents/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/branches/[id]/documents/route.ts |
| P2 | needs_manual_review | app/api/companies/branches/[id]/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/branches/[id]/route.ts |
| P2 | needs_manual_review | app/api/companies/branches/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/branches/route.ts |
| P2 | needs_manual_review | app/api/companies/current-ownership/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/current-ownership/route.ts |
| P2 | needs_manual_review | app/api/companies/partners/[id]/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/partners/[id]/route.ts |
| P2 | needs_manual_review | app/api/companies/partners/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/partners/route.ts |
| P2 | needs_manual_review | app/api/companies/representatives/[id]/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/representatives/[id]/route.ts |
| P2 | needs_manual_review | app/api/companies/representatives/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/representatives/route.ts |
| P2 | needs_manual_review | app/api/companies/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/route.ts |
| P2 | needs_manual_review | app/api/companies/stakeholders/[id]/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/stakeholders/[id]/route.ts |
| P2 | needs_manual_review | app/api/companies/stakeholders/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/stakeholders/route.ts |
| P2 | needs_manual_review | app/api/companies/vehicles/route.ts | manual_review_runtime_residue | Supabase in app/api/companies/vehicles/route.ts |
| P2 | needs_manual_review | app/api/cron/outbox-dispatch/route.ts | manual_review_runtime_residue | Supabase in app/api/cron/outbox-dispatch/route.ts |
| P2 | needs_manual_review | app/api/cron/update-reference-data/route.ts | manual_review_runtime_residue | Supabase in app/api/cron/update-reference-data/route.ts |
| P2 | needs_manual_review | app/api/employees/[employeeId]/route.ts | manual_review_runtime_residue | Supabase in app/api/employees/[employeeId]/route.ts |
| P2 | needs_manual_review | app/api/employees/[employeeId]/work-lifecycle-events/route.ts | manual_review_runtime_residue | Supabase in app/api/employees/[employeeId]/work-lifecycle-events/route.ts |
| P2 | needs_manual_review | app/api/employees/[employeeId]/work-relation/route.ts | manual_review_runtime_residue | Supabase in app/api/employees/[employeeId]/work-relation/route.ts |
| P2 | needs_manual_review | app/api/employees/route.ts | manual_review_runtime_residue | Supabase in app/api/employees/route.ts |
| P2 | needs_manual_review | app/api/entities/[entityKind]/[entityId]/bank-accounts/route.ts | manual_review_runtime_residue | Supabase in app/api/entities/[entityKind]/[entityId]/bank-accounts/route.ts |
| P2 | needs_manual_review | app/api/entity-bank-accounts/[id]/history/route.ts | manual_review_runtime_residue | Supabase in app/api/entity-bank-accounts/[id]/history/route.ts |
| P2 | needs_manual_review | app/api/entity-bank-accounts/[id]/passivate/route.ts | manual_review_runtime_residue | Supabase in app/api/entity-bank-accounts/[id]/passivate/route.ts |
| P2 | needs_manual_review | app/api/entity-bank-accounts/[id]/route.ts | manual_review_runtime_residue | Supabase in app/api/entity-bank-accounts/[id]/route.ts |
| P2 | needs_manual_review | app/api/entity-bank-accounts/[id]/set-default/route.ts | manual_review_runtime_residue | Supabase in app/api/entity-bank-accounts/[id]/set-default/route.ts |
| P2 | needs_manual_review | app/api/entity-bank-accounts/form-priority-mode/route.ts | manual_review_runtime_residue | Supabase in app/api/entity-bank-accounts/form-priority-mode/route.ts |
| P2 | needs_manual_review | app/api/entity-bank-accounts/parse-iban/route.ts | manual_review_runtime_residue | Supabase in app/api/entity-bank-accounts/parse-iban/route.ts |
| P2 | needs_manual_review | app/api/entity-bank-accounts/validate-swift/route.ts | manual_review_runtime_residue | Supabase in app/api/entity-bank-accounts/validate-swift/route.ts |
| P2 | needs_manual_review | app/api/identity/resolve/route.ts | manual_review_runtime_residue | Supabase in app/api/identity/resolve/route.ts |
| P2 | needs_manual_review | app/api/import/jobs/[id]/upload/route.ts | manual_review_runtime_residue | Supabase in app/api/import/jobs/[id]/upload/route.ts |
| P2 | needs_manual_review | app/api/muhasebe/cari-kartlar/resolve/route.ts | manual_review_runtime_residue | Supabase in app/api/muhasebe/cari-kartlar/resolve/route.ts |
| P2 | needs_manual_review | app/api/muhasebe/cari-kartlar/route.ts | manual_review_runtime_residue | Supabase in app/api/muhasebe/cari-kartlar/route.ts |
| P2 | needs_manual_review | app/api/muhasebe/islemler/[id]/route.ts | manual_review_runtime_residue | Supabase in app/api/muhasebe/islemler/[id]/route.ts |
| P2 | needs_manual_review | app/api/muhasebe/islemler/route.ts | manual_review_runtime_residue | Supabase in app/api/muhasebe/islemler/route.ts |
| P2 | needs_manual_review | app/api/muhasebe/on-muhasebe-hareketleri/[id]/route.ts | manual_review_runtime_residue | Supabase in app/api/muhasebe/on-muhasebe-hareketleri/[id]/route.ts |
| P2 | needs_manual_review | app/api/muhasebe/on-muhasebe-hareketleri/route.ts | manual_review_runtime_residue | Supabase in app/api/muhasebe/on-muhasebe-hareketleri/route.ts |
| P2 | needs_manual_review | app/api/muhasebe/reference-search/route.ts | manual_review_runtime_residue | Supabase in app/api/muhasebe/reference-search/route.ts |
| P2 | needs_manual_review | app/api/onboarding/system-tour/_shared.ts | manual_review_runtime_residue | lib/supabase in app/api/onboarding/system-tour/_shared.ts |
| P2 | needs_manual_review | app/api/organization/route.ts | manual_review_runtime_residue | Supabase in app/api/organization/route.ts |
| P2 | needs_manual_review | app/api/ownership-transactions/[id]/approve/route.ts | manual_review_runtime_residue | Supabase in app/api/ownership-transactions/[id]/approve/route.ts |
| P2 | needs_manual_review | app/api/ownership-transactions/[id]/cancel/route.ts | manual_review_runtime_residue | Supabase in app/api/ownership-transactions/[id]/cancel/route.ts |
| P2 | needs_manual_review | app/api/ownership-transactions/[id]/history/route.ts | manual_review_runtime_residue | Supabase in app/api/ownership-transactions/[id]/history/route.ts |
| P2 | needs_manual_review | app/api/ownership-transactions/[id]/impact/route.ts | manual_review_runtime_residue | Supabase in app/api/ownership-transactions/[id]/impact/route.ts |
| P2 | needs_manual_review | app/api/ownership-transactions/[id]/reject/route.ts | manual_review_runtime_residue | Supabase in app/api/ownership-transactions/[id]/reject/route.ts |
| P2 | needs_manual_review | app/api/ownership-transactions/[id]/reverse/route.ts | manual_review_runtime_residue | Supabase in app/api/ownership-transactions/[id]/reverse/route.ts |
| P2 | needs_manual_review | app/api/ownership-transactions/[id]/route.ts | manual_review_runtime_residue | Supabase in app/api/ownership-transactions/[id]/route.ts |
| P2 | needs_manual_review | app/api/ownership-transactions/[id]/send-approval/route.ts | manual_review_runtime_residue | Supabase in app/api/ownership-transactions/[id]/send-approval/route.ts |
| P2 | needs_manual_review | app/api/ownership-transactions/route.ts | manual_review_runtime_residue | Supabase in app/api/ownership-transactions/route.ts |
| P2 | needs_manual_review | app/api/processes/[id]/cancel/route.ts | manual_review_runtime_residue | Supabase in app/api/processes/[id]/cancel/route.ts |
| P2 | needs_manual_review | app/api/processes/[id]/route.ts | manual_review_runtime_residue | Supabase in app/api/processes/[id]/route.ts |
| P2 | needs_manual_review | app/api/processes/[id]/start/route.ts | manual_review_runtime_residue | Supabase in app/api/processes/[id]/start/route.ts |
| P2 | needs_manual_review | app/api/processes/[id]/steps/[step_id]/complete/route.ts | manual_review_runtime_residue | Supabase in app/api/processes/[id]/steps/[step_id]/complete/route.ts |
| P2 | needs_manual_review | app/api/processes/route.ts | manual_review_runtime_residue | Supabase in app/api/processes/route.ts |
| P2 | needs_manual_review | app/api/reference/nace-codes/import/route.ts | manual_review_runtime_residue | Supabase in app/api/reference/nace-codes/import/route.ts |
| P2 | needs_manual_review | app/api/reference/nace-codes/route.ts | manual_review_runtime_residue | Supabase in app/api/reference/nace-codes/route.ts |
| P2 | needs_manual_review | app/api/reference/nace-codes/update-from-source/route.ts | manual_review_runtime_residue | Supabase in app/api/reference/nace-codes/update-from-source/route.ts |
| P2 | needs_manual_review | app/api/reference/nace-codes/update-logs/route.ts | manual_review_runtime_residue | Supabase in app/api/reference/nace-codes/update-logs/route.ts |
| P2 | needs_manual_review | app/api/reference/sgk-codes/route.ts | manual_review_runtime_residue | Supabase in app/api/reference/sgk-codes/route.ts |
| P2 | needs_manual_review | app/api/reference/tax-offices/route.ts | manual_review_runtime_residue | Supabase in app/api/reference/tax-offices/route.ts |
| P2 | needs_manual_review | app/api/reference/trade-registry-offices/route.ts | manual_review_runtime_residue | Supabase in app/api/reference/trade-registry-offices/route.ts |
| P2 | needs_manual_review | app/api/session/bootstrap/route.ts | manual_review_runtime_residue | Supabase in app/api/session/bootstrap/route.ts |
| P2 | needs_manual_review | app/api/settings/integration-parameters/[id]/credential/route.ts | manual_review_runtime_residue | Supabase in app/api/settings/integration-parameters/[id]/credential/route.ts |
| P2 | needs_manual_review | app/api/settings/integration-parameters/[id]/route.ts | manual_review_runtime_residue | Supabase in app/api/settings/integration-parameters/[id]/route.ts |
| P2 | needs_manual_review | app/api/settings/integration-parameters/[id]/test/route.ts | manual_review_runtime_residue | Supabase in app/api/settings/integration-parameters/[id]/test/route.ts |
| P2 | needs_manual_review | app/api/settings/integration-parameters/route.ts | manual_review_runtime_residue | Supabase in app/api/settings/integration-parameters/route.ts |
| P2 | needs_manual_review | app/api/settings/module-licenses/route.ts | manual_review_runtime_residue | Supabase in app/api/settings/module-licenses/route.ts |
| P2 | needs_manual_review | app/api/settings/setup-wizard/route.ts | manual_review_runtime_residue | Supabase in app/api/settings/setup-wizard/route.ts |
| P2 | needs_manual_review | app/api/settings/system-parameters/route.ts | manual_review_runtime_residue | Supabase in app/api/settings/system-parameters/route.ts |
| P2 | needs_manual_review | app/api/setup/actions/[action_key]/run/route.ts | manual_review_runtime_residue | Supabase in app/api/setup/actions/[action_key]/run/route.ts |
| P2 | needs_manual_review | app/api/setup/actions/route.ts | manual_review_runtime_residue | Supabase in app/api/setup/actions/route.ts |
| P2 | needs_manual_review | app/api/setup/readiness/[module_key]/route.ts | manual_review_runtime_residue | Supabase in app/api/setup/readiness/[module_key]/route.ts |
| P2 | needs_manual_review | app/api/setup/readiness/route.ts | manual_review_runtime_residue | Supabase in app/api/setup/readiness/route.ts |
| P2 | needs_manual_review | app/api/tasks/[id]/assign/route.ts | manual_review_runtime_residue | Supabase in app/api/tasks/[id]/assign/route.ts |
| P2 | needs_manual_review | app/api/tasks/[id]/comment/route.ts | manual_review_runtime_residue | Supabase in app/api/tasks/[id]/comment/route.ts |
| P2 | needs_manual_review | app/api/tasks/[id]/complete/route.ts | manual_review_runtime_residue | Supabase in app/api/tasks/[id]/complete/route.ts |
| P2 | needs_manual_review | app/api/tasks/[id]/route.ts | manual_review_runtime_residue | Supabase in app/api/tasks/[id]/route.ts |
| P2 | needs_manual_review | app/api/tasks/route.ts | manual_review_runtime_residue | Supabase in app/api/tasks/route.ts |
| P2 | needs_manual_review | app/api/tenants/current/route.ts | manual_review_runtime_residue | Supabase in app/api/tenants/current/route.ts |
| P2 | needs_manual_review | app/api/tenants/default/route.ts | manual_review_runtime_residue | Supabase in app/api/tenants/default/route.ts |
| P2 | needs_manual_review | app/api/tenants/options/route.ts | manual_review_runtime_residue | Supabase in app/api/tenants/options/route.ts |
| P2 | needs_manual_review | app/api/uploads/image-variants/route.ts | manual_review_runtime_residue | Supabase in app/api/uploads/image-variants/route.ts |
| P2 | needs_manual_review | app/api/user-registration-requests/[id]/approve/route.ts | manual_review_runtime_residue | Supabase in app/api/user-registration-requests/[id]/approve/route.ts |
| P2 | needs_manual_review | app/api/user-registration-requests/route.ts | manual_review_runtime_residue | Supabase in app/api/user-registration-requests/route.ts |
| P2 | needs_manual_review | app/api/user/preferences/route.ts | manual_review_runtime_residue | Supabase in app/api/user/preferences/route.ts |
| P2 | active_runtime_dependency | backend/app/core/config.py | approved_backend_security_or_auth_layer | NEXT_PUBLIC_SUPABASE, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET in backend/app/core/config.py |
| P2 | active_runtime_dependency | backend/app/core/security.py | approved_backend_security_or_auth_layer | Supabase in backend/app/core/security.py |
| P2 | needs_manual_review | backend/app/domains/admin/integrations.py | manual_review_runtime_residue | Supabase in backend/app/domains/admin/integrations.py |
| P2 | needs_manual_review | backend/app/domains/security/service.py | manual_review_runtime_residue | Supabase in backend/app/domains/security/service.py |
| P2 | needs_manual_review | backend/app/tests/test_auth_jwt.py | manual_review_runtime_residue | SUPABASE_JWT_SECRET in backend/app/tests/test_auth_jwt.py |
| P2 | needs_manual_review | lib/action-center/actionCenter.types.ts | manual_review_runtime_residue | Supabase in lib/action-center/actionCenter.types.ts |
| P2 | needs_manual_review | lib/audit/audit.types.ts | manual_review_runtime_residue | Supabase in lib/audit/audit.types.ts |
| P2 | needs_manual_review | lib/audit/auditLogService.ts | manual_review_runtime_residue | Supabase in lib/audit/auditLogService.ts |
| P2 | active_runtime_dependency | lib/auth/userRegistrationRequests.ts | approved_backend_security_or_auth_layer | Supabase, @supabase/supabase-js in lib/auth/userRegistrationRequests.ts |
| P2 | needs_manual_review | lib/documents/documentThumbnailBackfill.server.ts | manual_review_runtime_residue | Supabase, lib/supabase in lib/documents/documentThumbnailBackfill.server.ts |
| P2 | needs_manual_review | lib/documents/documentThumbnails.server.ts | manual_review_runtime_residue | Supabase, lib/supabase in lib/documents/documentThumbnails.server.ts |
| P2 | needs_manual_review | lib/integrity/crossDomainConsistency.ts | manual_review_runtime_residue | Supabase, @supabase/supabase-js in lib/integrity/crossDomainConsistency.ts |
| P2 | needs_manual_review | lib/integrity/integrity.types.ts | manual_review_runtime_residue | Supabase, @supabase/supabase-js in lib/integrity/integrity.types.ts |
| P2 | needs_manual_review | lib/media/mediaMetadata.server.ts | manual_review_runtime_residue | Supabase, @supabase/supabase-js in lib/media/mediaMetadata.server.ts |
| P2 | needs_manual_review | lib/modules/moduleContract.types.ts | manual_review_runtime_residue | Supabase, @supabase/supabase-js in lib/modules/moduleContract.types.ts |
| P2 | needs_manual_review | lib/modules/moduleFeatureResolver.ts | manual_review_runtime_residue | Supabase, @supabase/supabase-js in lib/modules/moduleFeatureResolver.ts |
| P2 | needs_manual_review | lib/modules/moduleGuards.ts | manual_review_runtime_residue | lib/supabase in lib/modules/moduleGuards.ts |
| P2 | needs_manual_review | lib/operations/operationRequestService.ts | manual_review_runtime_residue | Supabase, @supabase/supabase-js in lib/operations/operationRequestService.ts |
| P2 | needs_manual_review | lib/process/process.types.ts | manual_review_runtime_residue | Supabase in lib/process/process.types.ts |
| P2 | needs_manual_review | lib/read-models/projection.types.ts | manual_review_runtime_residue | Supabase in lib/read-models/projection.types.ts |
| P2 | needs_manual_review | lib/read-models/projections/branchList.projection.ts | manual_review_runtime_residue | Supabase, @supabase/supabase-js in lib/read-models/projections/branchList.projection.ts |
| P2 | needs_manual_review | lib/read-models/projections/branchSummary.projection.ts | manual_review_runtime_residue | Supabase, @supabase/supabase-js in lib/read-models/projections/branchSummary.projection.ts |
| P2 | needs_manual_review | lib/read-models/projections/companyDetail.projection.ts | manual_review_runtime_residue | Supabase, @supabase/supabase-js in lib/read-models/projections/companyDetail.projection.ts |
| P2 | needs_manual_review | lib/release/environment.ts | manual_review_runtime_residue | VERCEL_ENV in lib/release/environment.ts |
| P2 | active_runtime_dependency | lib/security/accessContext.ts | approved_backend_security_or_auth_layer | Supabase, @supabase/supabase-js in lib/security/accessContext.ts |
| P2 | active_runtime_dependency | lib/security/permissionProxy.ts | approved_backend_security_or_auth_layer | lib/supabase in lib/security/permissionProxy.ts |
| P2 | active_runtime_dependency | lib/security/policyEngine.ts | approved_backend_security_or_auth_layer | lib/supabase in lib/security/policyEngine.ts |
| P2 | active_runtime_dependency | lib/security/serverPermissions.ts | approved_backend_security_or_auth_layer | Supabase, @supabase/supabase-js in lib/security/serverPermissions.ts |
| P2 | needs_manual_review | lib/services/notifications/processNotification.server.ts | manual_review_runtime_residue | Supabase, @supabase/supabase-js in lib/services/notifications/processNotification.server.ts |
| P2 | needs_manual_review | lib/setup/moduleReadinessChecker.ts | manual_review_runtime_residue | Supabase, @supabase/supabase-js in lib/setup/moduleReadinessChecker.ts |
| P2 | needs_manual_review | lib/setup/moduleReadinessRegistry.ts | manual_review_runtime_residue | Supabase in lib/setup/moduleReadinessRegistry.ts |
| P2 | needs_manual_review | lib/setup/tenantReadinessService.ts | manual_review_runtime_residue | Supabase, @supabase/supabase-js in lib/setup/tenantReadinessService.ts |
| P2 | active_runtime_dependency | lib/supabase/client.ts | approved_backend_security_or_auth_layer | Supabase, NEXT_PUBLIC_SUPABASE, @supabase/ssr in lib/supabase/client.ts |
| P2 | active_runtime_dependency | lib/supabase/server.ts | approved_backend_security_or_auth_layer | Supabase, NEXT_PUBLIC_SUPABASE, SUPABASE_SERVICE_ROLE_KEY, @supabase/ssr in lib/supabase/server.ts |
| P2 | needs_manual_review | lib/tenancy/companyScopes.ts | manual_review_runtime_residue | Supabase in lib/tenancy/companyScopes.ts |
| P2 | needs_manual_review | lib/user-preferences/onboardingPreferences.ts | manual_review_runtime_residue | Supabase in lib/user-preferences/onboardingPreferences.ts |
| P2 | needs_manual_review | lib/user-state/server.ts | manual_review_runtime_residue | Supabase, @supabase/supabase-js, lib/supabase in lib/user-state/server.ts |
| P2 | needs_manual_review | scripts/audit-next-backend-boundary.js | manual_review_runtime_residue | Supabase, lib/supabase in scripts/audit-next-backend-boundary.js |
| P2 | needs_manual_review | scripts/check-backend-migration-status.js | manual_review_runtime_residue | SUPABASE_SERVICE_ROLE_KEY in scripts/check-backend-migration-status.js |
| P2 | needs_manual_review | scripts/check-code-legacy-inventory.js | manual_review_runtime_residue | Supabase, Vercel in scripts/check-code-legacy-inventory.js |
| P2 | needs_manual_review | scripts/check-database-target.js | manual_review_runtime_residue | VERCEL_ENV in scripts/check-database-target.js |
| P2 | needs_manual_review | scripts/check-import-boundaries.js | manual_review_runtime_residue | Supabase, SUPABASE_SERVICE_ROLE_KEY in scripts/check-import-boundaries.js |
| P2 | needs_manual_review | scripts/check-performance-contracts.js | manual_review_runtime_residue | Supabase in scripts/check-performance-contracts.js |
| P2 | needs_manual_review | scripts/check-release-env-safety.js | manual_review_runtime_residue | Supabase, NEXT_PUBLIC_SUPABASE, SUPABASE_SERVICE_ROLE_KEY, VERCEL_ENV in scripts/check-release-env-safety.js |
| P2 | needs_manual_review | scripts/check-security-reference-contracts.js | manual_review_runtime_residue | Supabase, SUPABASE_SERVICE_ROLE_KEY in scripts/check-security-reference-contracts.js |
| P2 | needs_manual_review | scripts/generate-code-legacy-inventory.js | manual_review_runtime_residue | Supabase, NEXT_PUBLIC_SUPABASE, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET, @supabase/supabase-js, @supabase/ssr, Vercel, VERCEL_ENV, lib/supabase, check-supabase-target, supabase:migrate in scripts/generate-code-legacy-inventory.js |
| P2 | needs_manual_review | scripts/generate-next-api-burndown-docs.js | manual_review_runtime_residue | Supabase in scripts/generate-next-api-burndown-docs.js |


## Generated/Blocked Contract Debt

Total: 140

| Severity | Classification | File/Route | Decision | Evidence |
| --- | --- | --- | --- | --- |
| P2 | needs_manual_review | app/page.tsx | manual_review | implementation=hidden; contractSource=generated_from_existing_page; release=hidden; placeholder/minimal page signals |
| P1 | needs_contractization | app/app/ayarlar/bildirimler/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present |
| P1 | needs_contractization | app/app/belgeler/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present |
| P2 | needs_manual_review | app/app/crm/firsatlar/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/crm/leadler/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/crm/paydaslar/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/crm/pipeline/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/crm/pipeline-ayarlari/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/crm/takipler/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/dashboard/page.tsx | manual_review | implementation=blocked; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/demo/document-slot-uploader/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development_demo; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/demo/image-slot-uploader/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development_demo; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/demo/user-avatar/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development_demo; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/design-lab/page.tsx | manual_review | implementation=hidden; contractSource=generated_from_existing_page; release=hidden; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/gorev-ve-proje-yonetimi/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/gorev-ve-proje-yonetimi/backlog/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/gorev-ve-proje-yonetimi/gorevler/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/gorev-ve-proje-yonetimi/is-akislari/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/gorev-ve-proje-yonetimi/kanban-board/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/gorev-ve-proje-yonetimi/projeler/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/gorev-ve-proje-yonetimi/raporlar/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/gorev-ve-proje-yonetimi/sprintler/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/gorev-ve-proje-yonetimi/takvim/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/gorev-ve-proje-yonetimi/zaman-takibi/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/ik/calisma-planlari/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/ik/devam-devamsizlik/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/ik/employees/page.tsx | manual_review | implementation=blocked; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/ik/izin-bakiyeleri/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/ik/izin-turleri/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/ik/izinler/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P1 | needs_contractization | app/app/ik/personel/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P2 | needs_manual_review | app/app/ik/personel-ekle/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=coming_soon; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/ik/personel/[id]/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=coming_soon; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/ik/puantaj/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/ik/teskilat/page.tsx | manual_review | implementation=blocked; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P1 | needs_contractization | app/app/muhasebe/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P2 | needs_manual_review | app/app/muhasebe/banka-hareketleri/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/muhasebe/banka-hesaplari/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P1 | needs_contractization | app/app/muhasebe/banka-hesaplari-ve-kartlari/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P1 | needs_contractization | app/app/muhasebe/banka-kart-hareketleri/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P1 | needs_contractization | app/app/muhasebe/borclar/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P1 | needs_contractization | app/app/muhasebe/cari-hareketler/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P1 | needs_contractization | app/app/muhasebe/cari-kartlar/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P1 | needs_contractization | app/app/muhasebe/dashboard/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P2 | needs_manual_review | app/app/muhasebe/e-fatura-e-arsiv/page.tsx | manual_review | implementation=blocked; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P1 | needs_contractization | app/app/muhasebe/hesap-ve-kart-hareketleri/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P1 | needs_contractization | app/app/muhasebe/hesaplar/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P1 | needs_contractization | app/app/muhasebe/islemler/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P2 | needs_manual_review | app/app/muhasebe/mutabakat/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P1 | needs_contractization | app/app/muhasebe/on-muhasebe-hareketleri/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P1 | needs_contractization | app/app/muhasebe/projeler/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P2 | needs_manual_review | app/app/muhasebe/sermaye-mutabakati/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/onboarding/page.tsx | manual_review | implementation=blocked; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/raporlama/ozel-raporlar/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development_internal; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/raporlama/zamanlanmis-raporlar/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development_internal; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/satis-sonrasi/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/satis-sonrasi/bakim-planlari/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/satis-sonrasi/bakim-sozlesme-takip/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/satis-sonrasi/bakimi-gelenler/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/satis-sonrasi/checklistler/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/satis-sonrasi/garanti-takip/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/satis-sonrasi/kurulu-urunler/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/satis-sonrasi/lisans-takip/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/satis-sonrasi/mobil-servis/[assignment_id]/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/satis-sonrasi/musterideki-urunler/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/satis-sonrasi/saha-gorevleri/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/satis-sonrasi/servis-destek-kayitlari/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/satis-sonrasi/servis-kayitlari/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/satis-sonrasi/servis-talepleri/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/satis/sozlesmeler/page.tsx | manual_review | implementation=hidden; contractSource=generated_from_existing_page; release=hidden; real UI signals present |
| P1 | needs_contractization | app/app/sirket/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P1 | needs_contractization | app/app/sirket/araclar/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P1 | needs_contractization | app/app/sirket/companies/stakeholders/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P1 | needs_manual_review | app/app/sirket/demirbas/page.tsx | planned_page_has_real_ui_signals | implementation=planned; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P2 | needs_manual_review | app/app/sirket/paydaslar/page.tsx | manual_review | implementation=hidden; contractSource=generated_from_existing_page; release=hidden; placeholder/minimal page signals |
| P1 | needs_contractization | app/app/sirket/surecler/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P1 | needs_contractization | app/app/sirket/tesisler/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P1 | needs_contractization | app/app/sirket/teskilat/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P2 | needs_manual_review | app/app/sistem/page.tsx | manual_review | implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/sistem/ai-copilot/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development_internal; placeholder/minimal page signals |
| P1 | needs_contractization | app/app/sistem/audit/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present |
| P1 | needs_contractization | app/app/sistem/e-postalar/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present |
| P1 | needs_contractization | app/app/sistem/entegrasyon-ayarlari/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present |
| P2 | needs_manual_review | app/app/sistem/entegrasyonlar/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development_internal; placeholder/minimal page signals |
| P1 | needs_contractization | app/app/sistem/export/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present |
| P2 | needs_manual_review | app/app/sistem/genel/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development_internal; placeholder/minimal page signals |
| P1 | needs_contractization | app/app/sistem/import/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present |
| P1 | needs_contractization | app/app/sistem/kullanici-talepleri/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present |
| P2 | needs_manual_review | app/app/sistem/kullanicilar/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development_internal; placeholder/minimal page signals |
| P1 | needs_contractization | app/app/sistem/lisanslar/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present |
| P2 | needs_manual_review | app/app/sistem/login-sayfasi/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=coming_soon; placeholder/minimal page signals |
| P1 | needs_contractization | app/app/sistem/module-licenses/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present |
| P2 | needs_manual_review | app/app/sistem/moduller/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development_internal; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/sistem/otomasyonlar/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development_internal; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/sistem/outbox/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development_internal; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/sistem/ozellikler/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development_internal; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/sistem/roller/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development_internal; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/sistem/saglik/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development_internal; placeholder/minimal page signals |
| P1 | needs_contractization | app/app/sistem/system-parameters/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present |
| P2 | needs_manual_review | app/app/sistem/teknik/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development_internal; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/sistem/temalar/page.tsx | manual_review | implementation=hidden; contractSource=generated_from_existing_page; release=hidden; real UI signals present |
| P1 | needs_contractization | app/app/sistem/veri-kalitesi/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present |
| P2 | needs_manual_review | app/app/sistem/yetkiler/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development_internal; placeholder/minimal page signals |
| P1 | needs_contractization | app/app/sozlesmeler/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P2 | needs_manual_review | app/app/sozlesmeler/[id]/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P1 | needs_manual_review | app/app/sozlesmeler/fesihler/page.tsx | planned_page_has_real_ui_signals | implementation=planned; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P1 | needs_manual_review | app/app/sozlesmeler/turler/page.tsx | planned_page_has_real_ui_signals | implementation=planned; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P1 | needs_manual_review | app/app/sozlesmeler/yeni/page.tsx | planned_page_has_real_ui_signals | implementation=planned; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P1 | needs_manual_review | app/app/sozlesmeler/yenilemeler/page.tsx | planned_page_has_real_ui_signals | implementation=planned; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P1 | needs_contractization | app/app/surecler/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present |
| P1 | needs_contractization | app/app/surecler/[id]/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; real UI signals present |
| P2 | needs_manual_review | app/app/urun-ve-hizmetler/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/urun-ve-hizmetler/bakim-paketleri/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/urun-ve-hizmetler/garanti-sablonlari/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/urun-ve-hizmetler/hizmet-kartlari/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/urun-ve-hizmetler/katalog/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/urun-ve-hizmetler/lisans-abonelik-urunleri/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/urun-ve-hizmetler/seri-numarali-urunler/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P2 | needs_manual_review | app/app/urun-ve-hizmetler/urun-kartlari/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development; placeholder/minimal page signals |
| P1 | needs_contractization | app/app/yardim/page.tsx | contractize_real_ui_before_promotion | implementation=blocked; contractSource=generated_from_existing_page; release=development; real UI signals present |
| P2 | needs_manual_review | app/ayarlar/entegrasyon-ayarlari/page.tsx | manual_review | implementation=hidden; contractSource=generated_from_existing_page; release=hidden; placeholder/minimal page signals |
| P2 | needs_manual_review | app/ik/personel/page.tsx | manual_review | implementation=hidden; contractSource=generated_from_existing_page; release=hidden; placeholder/minimal page signals |
| P2 | needs_manual_review | app/muhasebe/page.tsx | manual_review | implementation=hidden; contractSource=generated_from_existing_page; release=hidden; placeholder/minimal page signals |
| P2 | needs_manual_review | app/muhasebe/banka-hesaplari-ve-kartlari/page.tsx | manual_review | implementation=hidden; contractSource=generated_from_existing_page; release=hidden; placeholder/minimal page signals |
| P2 | needs_manual_review | app/muhasebe/banka-kart-hareketleri/page.tsx | manual_review | implementation=hidden; contractSource=generated_from_existing_page; release=hidden; placeholder/minimal page signals |
| P2 | needs_manual_review | app/muhasebe/cari-hareketler/page.tsx | manual_review | implementation=hidden; contractSource=generated_from_existing_page; release=hidden; placeholder/minimal page signals |
| P2 | needs_manual_review | app/muhasebe/cari-kartlar/page.tsx | manual_review | implementation=hidden; contractSource=generated_from_existing_page; release=hidden; placeholder/minimal page signals |
| P2 | needs_manual_review | app/muhasebe/hesap-ve-kart-hareketleri/page.tsx | manual_review | implementation=hidden; contractSource=generated_from_existing_page; release=hidden; placeholder/minimal page signals |
| P2 | needs_manual_review | app/muhasebe/on-muhasebe-hareketleri/page.tsx | manual_review | implementation=hidden; contractSource=generated_from_existing_page; release=hidden; placeholder/minimal page signals |
| P2 | needs_manual_review | app/portal/page.tsx | manual_review | implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; placeholder/minimal page signals |
| P2 | needs_manual_review | app/portal/dashboard/page.tsx | manual_review | implementation=blocked; contractSource=generated_from_existing_page; release=development_internal; placeholder/minimal page signals |
| P2 | needs_manual_review | app/portal/documents/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development_internal; placeholder/minimal page signals |
| P2 | needs_manual_review | app/portal/products/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development_internal; placeholder/minimal page signals |
| P2 | needs_manual_review | app/portal/products/[id]/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development_internal; placeholder/minimal page signals |
| P2 | needs_manual_review | app/portal/profile/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development_internal; placeholder/minimal page signals |
| P2 | needs_manual_review | app/portal/service-records/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development_internal; placeholder/minimal page signals |
| P2 | needs_manual_review | app/portal/service-requests/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development_internal; placeholder/minimal page signals |
| P2 | needs_manual_review | app/portal/service-requests/[id]/page.tsx | manual_review | implementation=planned; contractSource=generated_from_existing_page; release=development_internal; placeholder/minimal page signals |
| P2 | needs_manual_review | app/release-not-available/page.tsx | manual_review | implementation=hidden; contractSource=generated_from_existing_page; release=hidden; placeholder/minimal page signals |
| P1 | needs_manual_review | app/test/page.tsx | planned_page_has_real_ui_signals | implementation=planned; contractSource=generated_from_existing_page; release=development_demo; real UI signals present |


## Orphan Code Candidates

Total: 0

| Severity | Classification | File/Route | Decision | Evidence |
| --- | --- | --- | --- | --- |
| - | - | - | - | - |


