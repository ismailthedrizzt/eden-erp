# Next Proxy Coverage Matrix

Generated from `app/api/**/route.ts` by `npm run proxy:coverage`. Status values are normalized for the productization gate: existing `proxy_to_fastapi_with_legacy_fallback` route headers are shown as `proxy_to_fastapi_with_temporary_fallback` because the fallback is not a permanent architecture role.

## Summary

- Route files: 482
- deprecated_wrapper: 11
- keep_session_bootstrap: 1
- keep_ui_adapter: 24
- keep_upload_adapter: 3
- migrate_to_fastapi: 164
- proxy_to_fastapi: 204
- proxy_to_fastapi_with_temporary_fallback: 75

## Matrix

| route path | status | target FastAPI endpoint | business logic present? | domain/orchestrator import? | removal condition | priority |
| --- | --- | --- | --- | --- | --- | --- |
| `/api/accounting/bank-accounts-cards/[id]/history` | `migrate_to_fastapi` | `/api/v1/accounting/bank-accounts-cards/{id}/history` | yes | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/bank-accounts-cards/[id]/passivate` | `migrate_to_fastapi` | `/api/v1/accounting/bank-accounts-cards/{id}/passivate` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/bank-accounts-cards/[id]` | `migrate_to_fastapi` | `/api/v1/accounting/bank-accounts-cards/{id}` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/bank-accounts-cards/[id]/set-default` | `migrate_to_fastapi` | `/api/v1/accounting/bank-accounts-cards/{id}/set-default` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/bank-accounts-cards` | `migrate_to_fastapi` | `/api/v1/accounting/bank-accounts-cards` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/bank-accounts/[accountId]/passivate` | `migrate_to_fastapi` | `/api/v1/accounting/bank-accounts/{accountId}/passivate` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/bank-accounts/[accountId]` | `proxy_to_fastapi` | `/api/v1/accounting/bank-accounts/{accountId}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/bank-accounts/[accountId]/sync` | `migrate_to_fastapi` | `/api/v1/accounting/bank-accounts/{accountId}/sync` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/bank-accounts` | `proxy_to_fastapi` | `/api/v1/accounting/bank-accounts` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/bank-card-transactions` | `migrate_to_fastapi` | `/api/v1/accounting/bank-card-transactions` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/bank-cards/[cardId]/passivate` | `migrate_to_fastapi` | `/api/v1/accounting/bank-cards/{cardId}/passivate` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/bank-cards/[cardId]` | `migrate_to_fastapi` | `/api/v1/accounting/bank-cards/{cardId}` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/bank-cards/[cardId]/sync` | `migrate_to_fastapi` | `/api/v1/accounting/bank-cards/{cardId}/sync` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/bank-connections/[id]/accounts` | `migrate_to_fastapi` | `/api/v1/accounting/bank-connections/{id}/accounts` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/bank-connections/[id]/cards` | `migrate_to_fastapi` | `/api/v1/accounting/bank-connections/{id}/cards` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/bank-connections/[id]/passivate` | `migrate_to_fastapi` | `/api/v1/accounting/bank-connections/{id}/passivate` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/bank-connections/[id]` | `migrate_to_fastapi` | `/api/v1/accounting/bank-connections/{id}` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/bank-connections/[id]/sync` | `migrate_to_fastapi` | `/api/v1/accounting/bank-connections/{id}/sync` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/bank-connections/[id]/test` | `migrate_to_fastapi` | `/api/v1/accounting/bank-connections/{id}/test` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/bank-connections/automation-preview` | `migrate_to_fastapi` | `/api/v1/accounting/bank-connections/automation-preview` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/bank-connections` | `migrate_to_fastapi` | `/api/v1/accounting/bank-connections` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/bank-transactions/[id]/ignore` | `proxy_to_fastapi` | `/api/v1/accounting/bank-transactions/{id}/ignore` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/bank-transactions/[id]/match` | `proxy_to_fastapi` | `/api/v1/accounting/bank-transactions/{id}/match` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/bank-transactions/[id]` | `proxy_to_fastapi` | `/api/v1/accounting/bank-transactions/{id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/bank-transactions/import` | `proxy_to_fastapi` | `/api/v1/accounting/bank-transactions/import` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/bank-transactions` | `proxy_to_fastapi` | `/api/v1/accounting/bank-transactions` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/capital-reconciliation/[id]/match-payment` | `proxy_to_fastapi` | `/api/v1/accounting/capital-reconciliation/{id}/match-payment` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/capital-reconciliation/[id]` | `proxy_to_fastapi` | `/api/v1/accounting/capital-reconciliation/{id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/capital-reconciliation` | `proxy_to_fastapi` | `/api/v1/accounting/capital-reconciliation` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/card-transactions` | `proxy_to_fastapi` | `/api/v1/accounting/card-transactions` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/cari-accounts/[id]` | `proxy_to_fastapi` | `/api/v1/accounting/cari-accounts/{id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/cari-accounts/[id]/summary` | `proxy_to_fastapi` | `/api/v1/accounting/cari-accounts/{id}/summary` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/cari-accounts` | `proxy_to_fastapi` | `/api/v1/accounting/cari-accounts` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/cari-transactions/[id]` | `proxy_to_fastapi` | `/api/v1/accounting/cari-transactions/{id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/cari-transactions` | `proxy_to_fastapi` | `/api/v1/accounting/cari-transactions` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/company/[companyId]/summary` | `proxy_to_fastapi` | `/api/v1/accounting/company/{companyId}/summary` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/e-documents/[id]/match` | `proxy_to_fastapi` | `/api/v1/accounting/e-documents/{id}/match` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/e-documents/[id]/reject` | `proxy_to_fastapi` | `/api/v1/accounting/e-documents/{id}/reject` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/e-documents/[id]` | `proxy_to_fastapi` | `/api/v1/accounting/e-documents/{id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/e-documents/import` | `proxy_to_fastapi` | `/api/v1/accounting/e-documents/import` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/e-documents` | `proxy_to_fastapi` | `/api/v1/accounting/e-documents` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/financial-institution-movements/[id]/create-pre-accounting` | `migrate_to_fastapi` | `/api/v1/accounting/financial-institution-movements/{id}/create-pre-accounting` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/financial-institution-movements/[id]/history` | `migrate_to_fastapi` | `/api/v1/accounting/financial-institution-movements/{id}/history` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/financial-institution-movements/[id]/match` | `migrate_to_fastapi` | `/api/v1/accounting/financial-institution-movements/{id}/match` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/financial-institution-movements/[id]/passivate` | `migrate_to_fastapi` | `/api/v1/accounting/financial-institution-movements/{id}/passivate` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/financial-institution-movements/[id]/review` | `migrate_to_fastapi` | `/api/v1/accounting/financial-institution-movements/{id}/review` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/financial-institution-movements/[id]` | `migrate_to_fastapi` | `/api/v1/accounting/financial-institution-movements/{id}` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/financial-institution-movements/[id]/unmatch` | `migrate_to_fastapi` | `/api/v1/accounting/financial-institution-movements/{id}/unmatch` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/financial-institution-movements/manual` | `migrate_to_fastapi` | `/api/v1/accounting/financial-institution-movements/manual` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/financial-institution-movements` | `migrate_to_fastapi` | `/api/v1/accounting/financial-institution-movements` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/accounting/reconciliation/match` | `proxy_to_fastapi` | `/api/v1/accounting/reconciliation/match` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/reconciliation/suggestions` | `proxy_to_fastapi` | `/api/v1/accounting/reconciliation/suggestions` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/reconciliation/summary` | `proxy_to_fastapi` | `/api/v1/accounting/reconciliation/summary` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/reconciliation/unmatch` | `proxy_to_fastapi` | `/api/v1/accounting/reconciliation/unmatch` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/accounting/reconciliation/unmatched` | `proxy_to_fastapi` | `/api/v1/accounting/reconciliation/unmatched` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/action-center/by-record` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/action-center/by-record` | no | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/action-center/counts` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/action-center/counts` | no | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/action-center` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/action-center` | no | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/action-center/summary` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/action-center/summary` | no | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/admin/features/[feature_key]` | `proxy_to_fastapi` | `/api/v1/admin/features/{feature_key}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/admin/features` | `proxy_to_fastapi` | `/api/v1/admin/features` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/admin/health/deep` | `proxy_to_fastapi` | `/api/v1/admin/health/deep` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/admin/health` | `proxy_to_fastapi` | `/api/v1/admin/health` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/admin/integrations/[integration_key]/test` | `proxy_to_fastapi` | `/api/v1/admin/integrations/{integration_key}/test` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/admin/integrations` | `proxy_to_fastapi` | `/api/v1/admin/integrations` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/admin/modules/[module_key]/activation` | `proxy_to_fastapi` | `/api/v1/admin/modules/{module_key}/activation` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/admin/modules/[module_key]` | `proxy_to_fastapi` | `/api/v1/admin/modules/{module_key}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/admin/modules` | `proxy_to_fastapi` | `/api/v1/admin/modules` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/admin/outbox/[event_id]/retry` | `proxy_to_fastapi` | `/api/v1/admin/outbox/{event_id}/retry` | yes | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/admin/outbox/dispatch-once` | `proxy_to_fastapi` | `/api/v1/admin/outbox/dispatch-once` | yes | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/admin/outbox` | `proxy_to_fastapi` | `/api/v1/admin/outbox` | yes | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/admin/portal/invitations` | `proxy_to_fastapi` | `/api/v1/admin/portal/invitations` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/admin/portal/users/[id]` | `proxy_to_fastapi` | `/api/v1/admin/portal/users/{portal_user_id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/admin/portal/users` | `proxy_to_fastapi` | `/api/v1/admin/portal/users` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/admin` | `proxy_to_fastapi` | `/api/v1/admin` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/admin/settings/[settings_key]` | `proxy_to_fastapi` | `/api/v1/admin/settings/{settings_key}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/admin/settings` | `proxy_to_fastapi` | `/api/v1/admin/settings` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/admin/workspace-settings` | `proxy_to_fastapi` | `/api/v1/admin/workspace-settings` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/assets/[id]` | `proxy_to_fastapi` | `/api/v1/after-sales/assets/{asset_id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/assets/[id]/service-history` | `proxy_to_fastapi` | `/api/v1/after-sales/assets/{asset_id}/service-history` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/assets/[id]/warranty-check` | `proxy_to_fastapi` | `/api/v1/after-sales/assets/{id}/warranty-check` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/assets` | `proxy_to_fastapi` | `/api/v1/after-sales/assets` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/checklist-templates` | `proxy_to_fastapi` | `/api/v1/after-sales/checklist-templates` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/company/[companyId]/summary` | `proxy_to_fastapi` | `/api/v1/after-sales/company/{company_id}/summary` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/field-assignments/[id]/accept` | `proxy_to_fastapi` | `/api/v1/after-sales/field-assignments/{id}/accept` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/field-assignments/[id]/reject` | `proxy_to_fastapi` | `/api/v1/after-sales/field-assignments/{id}/reject` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/field-assignments/[id]` | `proxy_to_fastapi` | `/api/v1/after-sales/field-assignments/{id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/field-assignments/[id]/status` | `proxy_to_fastapi` | `/api/v1/after-sales/field-assignments/{id}/status` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/field-assignments` | `proxy_to_fastapi` | `/api/v1/after-sales/field-assignments` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/maintenance-due/[id]/create-service-request` | `proxy_to_fastapi` | `/api/v1/after-sales/maintenance-due/{id}/create-service-request` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/maintenance-due/[id]/skip` | `proxy_to_fastapi` | `/api/v1/after-sales/maintenance-due/{id}/skip` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/maintenance-due` | `proxy_to_fastapi` | `/api/v1/after-sales/maintenance-due` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/maintenance-plans/[id]` | `proxy_to_fastapi` | `/api/v1/after-sales/maintenance-plans/{plan_id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/maintenance-plans` | `proxy_to_fastapi` | `/api/v1/after-sales/maintenance-plans` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/service-records/[id]/checklist` | `proxy_to_fastapi` | `/api/v1/after-sales/service-records/{id}/checklist` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/service-records/[id]/complete` | `proxy_to_fastapi` | `/api/v1/after-sales/service-records/{service_id}/complete` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/service-records/[id]/photos` | `proxy_to_fastapi` | `/api/v1/after-sales/service-records/{id}/photos` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/service-records/[id]/report` | `proxy_to_fastapi` | `/api/v1/after-sales/service-records/{id}/report` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/service-records/[id]` | `proxy_to_fastapi` | `/api/v1/after-sales/service-records/{service_id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/service-records/[id]/start` | `proxy_to_fastapi` | `/api/v1/after-sales/service-records/{id}/start` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/service-records` | `proxy_to_fastapi` | `/api/v1/after-sales/service-records` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/service-requests/[id]/assign-technician` | `proxy_to_fastapi` | `/api/v1/after-sales/service-requests/{id}/assign-technician` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/service-requests/[id]/assign` | `proxy_to_fastapi` | `/api/v1/after-sales/service-requests/{request_id}/assign` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/service-requests/[id]/close` | `proxy_to_fastapi` | `/api/v1/after-sales/service-requests/{request_id}/close` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/service-requests/[id]` | `proxy_to_fastapi` | `/api/v1/after-sales/service-requests/{request_id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/after-sales/service-requests` | `proxy_to_fastapi` | `/api/v1/after-sales/service-requests` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/ai/action-guide/actions` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/action-guide/actions` | no | no | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P2 |
| `/api/ai/action-guide` | `keep_ui_adapter` | `/api/v1/action-guide` | yes | yes | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/ai/copilot/action-preview` | `proxy_to_fastapi` | `/api/v1/ai/copilot/action-preview` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/ai/copilot/context` | `proxy_to_fastapi` | `/api/v1/ai/copilot/context` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/ai/copilot/document-extract` | `proxy_to_fastapi` | `/api/v1/ai/copilot/document-extract` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/ai/copilot/document-summary` | `proxy_to_fastapi` | `/api/v1/ai/copilot/document-summary` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/ai/copilot/feedback` | `proxy_to_fastapi` | `/api/v1/ai/copilot/feedback` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/ai/copilot/form-assist` | `proxy_to_fastapi` | `/api/v1/ai/copilot/form-assist` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/ai/copilot/history` | `proxy_to_fastapi` | `/api/v1/ai/copilot/history` | yes | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/ai/copilot/query` | `proxy_to_fastapi` | `/api/v1/ai/copilot/query` | yes | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/ai/copilot/suggestions` | `proxy_to_fastapi` | `/api/v1/ai/copilot/suggestions` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/ai/cv-extract` | `migrate_to_fastapi` | `/api/v1/ai/cv-extract` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/approvals/[id]/approve` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/approvals/{approval_id}/approve` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/approvals/[id]/reject` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/approvals/{approval_id}/reject` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/approvals` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/approvals` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/audit/[id]` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/audit/{audit_id}` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/audit/by-operation` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/audit/by-operation` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/audit/by-process` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/audit/by-process` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/audit/by-record` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/audit/by-record` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/audit` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/audit` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/auth/company-join` | `keep_ui_adapter` | `/api/v1/auth/company-join` | yes | yes | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/auth/logout` | `keep_ui_adapter` | `/api/v1/auth/logout` | yes | no | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/auth/otp` | `keep_ui_adapter` | `/api/v1/auth/otp` | yes | yes | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/auth/otp/send` | `keep_ui_adapter` | `/api/v1/auth/otp/send` | yes | no | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/auth/tenant-access` | `keep_ui_adapter` | `/api/v1/auth/tenant-access` | no | no | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/auth/tenant-status` | `keep_ui_adapter` | `/api/v1/auth/tenant-status` | yes | yes | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/automation/actions` | `proxy_to_fastapi` | `/api/v1/automation/actions` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/automation/conditions` | `proxy_to_fastapi` | `/api/v1/automation/conditions` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/automation/rules/[id]/activate` | `proxy_to_fastapi` | `/api/v1/automation/rules/{rule_id}/activate` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/automation/rules/[id]/disable` | `proxy_to_fastapi` | `/api/v1/automation/rules/{rule_id}/disable` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/automation/rules/[id]/pause` | `proxy_to_fastapi` | `/api/v1/automation/rules/{rule_id}/pause` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/automation/rules/[id]` | `proxy_to_fastapi` | `/api/v1/automation/rules/{rule_id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/automation/rules/[id]/run-now` | `proxy_to_fastapi` | `/api/v1/automation/rules/{rule_id}/run-now` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/automation/rules/[id]/simulate` | `proxy_to_fastapi` | `/api/v1/automation/rules/{rule_id}/simulate` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/automation/rules` | `proxy_to_fastapi` | `/api/v1/automation/rules` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/automation/runs/[id]` | `proxy_to_fastapi` | `/api/v1/automation/runs/{run_id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/automation/runs` | `proxy_to_fastapi` | `/api/v1/automation/runs` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/automation/templates` | `proxy_to_fastapi` | `/api/v1/automation/templates` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/automation/triggers` | `proxy_to_fastapi` | `/api/v1/automation/triggers` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/bulk/actions/[id]/confirm` | `migrate_to_fastapi` | `/api/v1/bulk/actions/{id}/confirm` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/bulk/actions/[id]/report` | `migrate_to_fastapi` | `/api/v1/bulk/actions/{id}/report` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/bulk/actions/[id]` | `migrate_to_fastapi` | `/api/v1/bulk/actions/{id}` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/bulk/actions` | `migrate_to_fastapi` | `/api/v1/bulk/actions` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/companies/[company_id]/capital-decreases/precheck` | `deprecated_wrapper` | `/api/v1/companies/{company_id}/capital-decreases/precheck` | yes | yes | Delete after canonical route or generated/shared contract has no imports. | P0 |
| `/api/companies/[company_id]/capital-decreases` | `deprecated_wrapper` | `/api/v1/companies/{company_id}/capital-decreases` | yes | yes | Delete after canonical route or generated/shared contract has no imports. | P0 |
| `/api/companies/[company_id]/capital-increases/precheck` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/capital-increases/precheck` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P0 |
| `/api/companies/[company_id]/capital-increases` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/capital-increases` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P0 |
| `/api/companies/[company_id]/current-ownership` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/current-ownership` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/companies/[company_id]/deregistration-wizard/complete` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/deregistration-wizard/complete` | no | no | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/companies/[company_id]/deregistration-wizard/context` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/deregistration-wizard/context` | no | no | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/companies/[company_id]/lifecycle-events` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/lifecycle-events` | no | no | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/companies/[company_id]/lifecycle` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/lifecycle` | no | no | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/companies/[company_id]/liquidation-wizard/complete` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/liquidation-wizard/complete` | no | no | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/companies/[company_id]/liquidation-wizard/context` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/liquidation-wizard/context` | no | no | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/companies/[company_id]/nace-codes/[id]/passivate` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/nace-codes/{id}/passivate` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/companies/[company_id]/nace-codes/[id]` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/nace-codes/{id}` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/companies/[company_id]/nace-codes/[id]/set-primary` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/nace-codes/{id}/set-primary` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/companies/[company_id]/nace-codes` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/nace-codes` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/companies/[company_id]/official-changes/activity-subject-change/precheck` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/official-changes/activity-subject-change/precheck` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P0 |
| `/api/companies/[company_id]/official-changes/activity-subject-change` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/official-changes/activity-subject-change` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P0 |
| `/api/companies/[company_id]/official-changes/address-change/precheck` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/official-changes/address-change/precheck` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P0 |
| `/api/companies/[company_id]/official-changes/address-change` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/official-changes/address-change` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P0 |
| `/api/companies/[company_id]/official-changes/branch-closing/precheck` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/branch-closings/precheck` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P0 |
| `/api/companies/[company_id]/official-changes/branch-closing` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/branch-closings` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P0 |
| `/api/companies/[company_id]/official-changes/branch-opening/precheck` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/branch-openings/precheck` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P0 |
| `/api/companies/[company_id]/official-changes/branch-opening` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/branch-openings` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P0 |
| `/api/companies/[company_id]/official-changes/nace-change/precheck` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/official-changes/nace-change/precheck` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P0 |
| `/api/companies/[company_id]/official-changes/nace-change` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/official-changes/nace-change` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P0 |
| `/api/companies/[company_id]/official-changes/public-registration-update/precheck` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/official-changes/public-registration-update/precheck` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P0 |
| `/api/companies/[company_id]/official-changes/public-registration-update` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/official-changes/public-registration-update` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P0 |
| `/api/companies/[company_id]/official-changes/title-change/precheck` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/official-changes/title-change/precheck` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P0 |
| `/api/companies/[company_id]/official-changes/title-change` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/official-changes/title-change` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P0 |
| `/api/companies/[company_id]/opening-wizard/complete` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/opening-wizard/complete` | no | no | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/companies/[company_id]/opening-wizard/context` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/opening-wizard/context` | no | no | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/companies/[company_id]` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/companies/branches/[id]/documents` | `deprecated_wrapper` | `/api/v1/branches/{branch_id}/documents` | yes | yes | Delete after canonical route or generated/shared contract has no imports. | P0 |
| `/api/companies/branches/[id]` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/branches/{branch_id}` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P0 |
| `/api/companies/branches` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/branches` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P0 |
| `/api/companies/current-ownership` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/{company_id}/current-ownership` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/companies/partners/[id]` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/partners/{partner_id}` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/companies/partners` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/partners` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/companies/representatives/[id]` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/representatives/{representative_id}` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P0 |
| `/api/companies/representatives` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/representatives` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P0 |
| `/api/companies` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/companies/stakeholders/[id]` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/stakeholders/{id}` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/companies/stakeholders` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/stakeholders` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/companies/vehicles` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/companies/vehicles` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/crm/[...path]` | `proxy_to_fastapi` | `/api/v1/crm/{path}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/crm/master/organizations` | `proxy_to_fastapi` | `/api/v1/crm/master/organizations` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/crm/master/organizations/search` | `proxy_to_fastapi` | `/api/v1/crm/master/organizations/search` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/crm/master/persons` | `proxy_to_fastapi` | `/api/v1/crm/master/persons` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/crm/master/persons/search` | `proxy_to_fastapi` | `/api/v1/crm/master/persons/search` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/crm/stakeholders/[id]/create-cari-account` | `proxy_to_fastapi` | `/api/v1/crm/stakeholders/{stakeholder_id}/create-cari-account` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/crm/stakeholders/[id]/create-followup-task` | `proxy_to_fastapi` | `/api/v1/crm/stakeholders/{stakeholder_id}/create-followup-task` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/crm/stakeholders/[id]/interactions` | `proxy_to_fastapi` | `/api/v1/crm/stakeholders/{stakeholder_id}/interactions` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/crm/stakeholders/[id]/related-records` | `proxy_to_fastapi` | `/api/v1/crm/stakeholders/{stakeholder_id}/related-records` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/crm/stakeholders/[id]` | `proxy_to_fastapi` | `/api/v1/crm/stakeholders/{stakeholder_id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/crm/stakeholders/[id]/summary` | `proxy_to_fastapi` | `/api/v1/crm/stakeholders/{stakeholder_id}/summary` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/crm/stakeholders` | `proxy_to_fastapi` | `/api/v1/crm/stakeholders` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/cron/document-thumbnails` | `migrate_to_fastapi` | `/api/v1/cron/document-thumbnails` | yes | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/cron/outbox-dispatch` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/system/outbox/dispatch` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/cron/update-reference-data` | `migrate_to_fastapi` | `/api/v1/cron/update-reference-data` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/dashboard/[module]/summary` | `migrate_to_fastapi` | `/api/v1/dashboard/{module}/summary` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/dashboard/[module]/widgets/[widgetId]` | `migrate_to_fastapi` | `/api/v1/dashboard/{module}/widgets/{widgetId}` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/dashboard/geographic-trade-reach` | `migrate_to_fastapi` | `/api/v1/dashboard/geographic-trade-reach` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/data-quality/by-entity/[entity_type]/[entity_id]` | `migrate_to_fastapi` | `/api/v1/data-quality/by-entity/{entity_type}/{entity_id}` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/data-quality/check/[entity_type]/[entity_id]` | `migrate_to_fastapi` | `/api/v1/data-quality/check/{entity_type}/{entity_id}` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/data-quality/check` | `migrate_to_fastapi` | `/api/v1/data-quality/check` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/data-quality/duplicates/[group_id]/dismiss` | `migrate_to_fastapi` | `/api/v1/data-quality/duplicates/{group_id}/dismiss` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/data-quality/duplicates/[group_id]/false-positive` | `migrate_to_fastapi` | `/api/v1/data-quality/duplicates/{group_id}/false-positive` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/data-quality/duplicates/[group_id]` | `migrate_to_fastapi` | `/api/v1/data-quality/duplicates/{group_id}` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/data-quality/duplicates/detect` | `migrate_to_fastapi` | `/api/v1/data-quality/duplicates/detect` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/data-quality/duplicates` | `migrate_to_fastapi` | `/api/v1/data-quality/duplicates` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/data-quality/merge/[merge_id]` | `migrate_to_fastapi` | `/api/v1/data-quality/merge/{merge_id}` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/data-quality/merge/confirm` | `migrate_to_fastapi` | `/api/v1/data-quality/merge/confirm` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/data-quality/merge/preview` | `migrate_to_fastapi` | `/api/v1/data-quality/merge/preview` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/data-quality/rules/[rule_key]` | `migrate_to_fastapi` | `/api/v1/data-quality/rules/{rule_key}` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/data-quality/rules` | `migrate_to_fastapi` | `/api/v1/data-quality/rules` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/data-quality/summary` | `migrate_to_fastapi` | `/api/v1/data-quality/summary` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/documents/[id]/access-logs` | `migrate_to_fastapi` | `/api/v1/documents/{id}/access-logs` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/documents/[id]/download-url` | `migrate_to_fastapi` | `/api/v1/documents/{id}/download-url` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/documents/[id]/new-version` | `migrate_to_fastapi` | `/api/v1/documents/{id}/new-version` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/documents/[id]/preview-url` | `migrate_to_fastapi` | `/api/v1/documents/{id}/preview-url` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/documents/[id]/reject` | `migrate_to_fastapi` | `/api/v1/documents/{id}/reject` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/documents/[id]` | `migrate_to_fastapi` | `/api/v1/documents/{id}` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/documents/[id]/verify` | `migrate_to_fastapi` | `/api/v1/documents/{id}/verify` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/documents/by-entity/[entity_type]/[entity_id]` | `migrate_to_fastapi` | `/api/v1/documents/by-entity/{entity_type}/{entity_id}` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/documents/by-entity/[entity_type]/[entity_id]/upload` | `migrate_to_fastapi` | `/api/v1/documents/by-entity/{entity_type}/{entity_id}/upload` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/documents/expired` | `migrate_to_fastapi` | `/api/v1/documents/expired` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/documents/expiring` | `migrate_to_fastapi` | `/api/v1/documents/expiring` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/documents/requirements/[module_key]/[operation_key]` | `migrate_to_fastapi` | `/api/v1/documents/requirements/{module_key}/{operation_key}` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/documents/requirements` | `migrate_to_fastapi` | `/api/v1/documents/requirements` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/documents` | `migrate_to_fastapi` | `/api/v1/documents` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/documents/upload` | `migrate_to_fastapi` | `/api/v1/documents/upload` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/employees/[employeeId]/entry-wizard/complete-with-manual-sgk` | `migrate_to_fastapi` | `/api/v1/employees/{employeeId}/entry-wizard/complete-with-manual-sgk` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/employees/[employeeId]/entry-wizard/complete` | `migrate_to_fastapi` | `/api/v1/employees/{employeeId}/entry-wizard/complete` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/employees/[employeeId]/entry-wizard/context` | `migrate_to_fastapi` | `/api/v1/employees/{employeeId}/entry-wizard/context` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/employees/[employeeId]/exit-wizard/complete-with-manual-sgk` | `migrate_to_fastapi` | `/api/v1/employees/{employeeId}/exit-wizard/complete-with-manual-sgk` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/employees/[employeeId]/exit-wizard/complete` | `migrate_to_fastapi` | `/api/v1/employees/{employeeId}/exit-wizard/complete` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/employees/[employeeId]/exit-wizard/context` | `migrate_to_fastapi` | `/api/v1/employees/{employeeId}/exit-wizard/context` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/employees/[employeeId]` | `migrate_to_fastapi` | `/api/v1/employees/{employeeId}` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/employees/[employeeId]/sgk-entry` | `migrate_to_fastapi` | `/api/v1/employees/{employeeId}/sgk-entry` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/employees/[employeeId]/sgk-exit` | `migrate_to_fastapi` | `/api/v1/employees/{employeeId}/sgk-exit` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/employees/[employeeId]/work-lifecycle-events` | `migrate_to_fastapi` | `/api/v1/employees/{employeeId}/work-lifecycle-events` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/employees/[employeeId]/work-relation` | `migrate_to_fastapi` | `/api/v1/employees/{employeeId}/work-relation` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/employees` | `migrate_to_fastapi` | `/api/v1/employees` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/entities/[entityKind]/[entityId]/bank-accounts` | `migrate_to_fastapi` | `/api/v1/entities/{entityKind}/{entityId}/bank-accounts` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/entity-bank-accounts/[id]/history` | `migrate_to_fastapi` | `/api/v1/entity-bank-accounts/{id}/history` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/entity-bank-accounts/[id]/passivate` | `migrate_to_fastapi` | `/api/v1/entity-bank-accounts/{id}/passivate` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/entity-bank-accounts/[id]` | `migrate_to_fastapi` | `/api/v1/entity-bank-accounts/{id}` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/entity-bank-accounts/[id]/set-default` | `migrate_to_fastapi` | `/api/v1/entity-bank-accounts/{id}/set-default` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/entity-bank-accounts/form-priority-mode` | `migrate_to_fastapi` | `/api/v1/entity-bank-accounts/form-priority-mode` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/entity-bank-accounts/parse-iban` | `migrate_to_fastapi` | `/api/v1/entity-bank-accounts/parse-iban` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/entity-bank-accounts/validate-swift` | `migrate_to_fastapi` | `/api/v1/entity-bank-accounts/validate-swift` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/export/jobs/[id]/download` | `migrate_to_fastapi` | `/api/v1/export/jobs/{id}/download` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/export/jobs/[id]` | `migrate_to_fastapi` | `/api/v1/export/jobs/{id}` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/export/jobs` | `migrate_to_fastapi` | `/api/v1/export/jobs` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/facilities/[id]` | `proxy_to_fastapi` | `/api/v1/facilities/{facility_id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/facilities` | `proxy_to_fastapi` | `/api/v1/facilities` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/features/[feature_key]` | `proxy_to_fastapi` | `/api/v1/features/{feature_key}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/features` | `proxy_to_fastapi` | `/api/v1/features` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/attendance/[id]` | `proxy_to_fastapi` | `/api/v1/hr/attendance/{id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/attendance/import` | `proxy_to_fastapi` | `/api/v1/hr/attendance/import` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/attendance` | `proxy_to_fastapi` | `/api/v1/hr/attendance` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/company/[companyId]/summary` | `proxy_to_fastapi` | `/api/v1/hr/company/{companyId}/summary` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/employees/[id]/documents/[documentId]` | `proxy_to_fastapi` | `/api/v1/hr/employees/{id}/documents/{documentId}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/employees/[id]/documents` | `proxy_to_fastapi` | `/api/v1/hr/employees/{id}/documents` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/employees/[id]/employment/assignment-change` | `proxy_to_fastapi` | `/api/v1/hr/employees/{id}/employment/assignment-change` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/employees/[id]/employment/start` | `proxy_to_fastapi` | `/api/v1/hr/employees/{id}/employment/start` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/employees/[id]/employment/terminate` | `proxy_to_fastapi` | `/api/v1/hr/employees/{id}/employment/terminate` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/employees/[id]/leave-balances/recalculate` | `proxy_to_fastapi` | `/api/v1/hr/employees/{id}/leave-balances/recalculate` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/employees/[id]/leave-balances` | `proxy_to_fastapi` | `/api/v1/hr/employees/{id}/leave-balances` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/employees/[id]` | `proxy_to_fastapi` | `/api/v1/hr/employees/{id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/employees/[id]/sgk/entry-completed` | `proxy_to_fastapi` | `/api/v1/hr/employees/{id}/sgk/entry-completed` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/employees/[id]/sgk/exit-completed` | `proxy_to_fastapi` | `/api/v1/hr/employees/{id}/sgk/exit-completed` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/employees/[id]/work-schedule-assignment` | `proxy_to_fastapi` | `/api/v1/hr/employees/{id}/work-schedule-assignment` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/employees` | `proxy_to_fastapi` | `/api/v1/hr/employees` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/employees/summary` | `proxy_to_fastapi` | `/api/v1/hr/employees/summary` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/leave-balances/[id]/adjust` | `proxy_to_fastapi` | `/api/v1/hr/leave-balances/{id}/adjust` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/leave-requests/[id]/approve` | `proxy_to_fastapi` | `/api/v1/hr/leave-requests/{id}/approve` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/leave-requests/[id]/cancel` | `proxy_to_fastapi` | `/api/v1/hr/leave-requests/{id}/cancel` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/leave-requests/[id]/reject` | `proxy_to_fastapi` | `/api/v1/hr/leave-requests/{id}/reject` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/leave-requests/[id]` | `proxy_to_fastapi` | `/api/v1/hr/leave-requests/{id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/leave-requests/[id]/submit` | `proxy_to_fastapi` | `/api/v1/hr/leave-requests/{id}/submit` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/leave-requests` | `proxy_to_fastapi` | `/api/v1/hr/leave-requests` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/leave-types/[id]` | `proxy_to_fastapi` | `/api/v1/hr/leave-types/{id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/leave-types` | `proxy_to_fastapi` | `/api/v1/hr/leave-types` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/payroll-prep/[id]/mark-ready` | `proxy_to_fastapi` | `/api/v1/hr/payroll-prep/{id}/mark-ready` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/payroll-prep/[id]` | `proxy_to_fastapi` | `/api/v1/hr/payroll-prep/{id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/payroll-prep` | `proxy_to_fastapi` | `/api/v1/hr/payroll-prep` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/timesheets/[id]/approve` | `proxy_to_fastapi` | `/api/v1/hr/timesheets/{id}/approve` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/timesheets/[id]/calculate` | `proxy_to_fastapi` | `/api/v1/hr/timesheets/{id}/calculate` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/timesheets/[id]/lock` | `proxy_to_fastapi` | `/api/v1/hr/timesheets/{id}/lock` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/timesheets/[id]` | `proxy_to_fastapi` | `/api/v1/hr/timesheets/{id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/timesheets` | `proxy_to_fastapi` | `/api/v1/hr/timesheets` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/work-schedules/[id]` | `proxy_to_fastapi` | `/api/v1/hr/work-schedules/{id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/hr/work-schedules` | `proxy_to_fastapi` | `/api/v1/hr/work-schedules` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/identity/resolve` | `keep_ui_adapter` | `/api/v1/identity/resolve` | yes | yes | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/import/jobs/[id]/cancel` | `migrate_to_fastapi` | `/api/v1/import/jobs/{id}/cancel` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/import/jobs/[id]/confirm` | `migrate_to_fastapi` | `/api/v1/import/jobs/{id}/confirm` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/import/jobs/[id]/error-report` | `migrate_to_fastapi` | `/api/v1/import/jobs/{id}/error-report` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/import/jobs/[id]/mapping` | `migrate_to_fastapi` | `/api/v1/import/jobs/{id}/mapping` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/import/jobs/[id]` | `migrate_to_fastapi` | `/api/v1/import/jobs/{id}` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/import/jobs/[id]/upload` | `migrate_to_fastapi` | `/api/v1/import/jobs/{id}/upload` | yes | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/import/jobs/[id]/validate` | `migrate_to_fastapi` | `/api/v1/import/jobs/{id}/validate` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/import/jobs` | `migrate_to_fastapi` | `/api/v1/import/jobs` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/import/templates/[template_key]/download` | `migrate_to_fastapi` | `/api/v1/import/templates/{template_key}/download` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/import/templates/[template_key]` | `migrate_to_fastapi` | `/api/v1/import/templates/{template_key}` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/import/templates` | `migrate_to_fastapi` | `/api/v1/import/templates` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/integrity/check` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/integrity/check` | yes | no | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P2 |
| `/api/integrity/operation/[operation_key]` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/integrity/operation/{operation_key}` | yes | no | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P2 |
| `/api/media/metadata` | `keep_ui_adapter` | `/api/v1/media/metadata` | yes | yes | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/media/open` | `keep_ui_adapter` | `/api/v1/media/open` | yes | yes | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/modules/[module_key]/activation` | `proxy_to_fastapi` | `/api/v1/modules/{module_key}/activation` | yes | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/modules/[module_key]` | `proxy_to_fastapi` | `/api/v1/modules/{module_key}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/modules` | `proxy_to_fastapi` | `/api/v1/modules` | yes | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/muhasebe/cari-kartlar/resolve` | `migrate_to_fastapi` | `/api/v1/muhasebe/cari-kartlar/resolve` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/muhasebe/cari-kartlar` | `migrate_to_fastapi` | `/api/v1/muhasebe/cari-kartlar` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/muhasebe/islemler/[id]` | `migrate_to_fastapi` | `/api/v1/muhasebe/islemler/{id}` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/muhasebe/islemler` | `migrate_to_fastapi` | `/api/v1/muhasebe/islemler` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/muhasebe/on-muhasebe-hareketleri/[id]` | `migrate_to_fastapi` | `/api/v1/muhasebe/on-muhasebe-hareketleri/{id}` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/muhasebe/on-muhasebe-hareketleri` | `migrate_to_fastapi` | `/api/v1/muhasebe/on-muhasebe-hareketleri` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/muhasebe/reference-search` | `migrate_to_fastapi` | `/api/v1/muhasebe/reference-search` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/notifications/[id]/archive` | `migrate_to_fastapi` | `/api/v1/notifications/{id}/archive` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/notifications/[id]/dismiss` | `migrate_to_fastapi` | `/api/v1/notifications/{id}/dismiss` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/notifications/[id]/read` | `migrate_to_fastapi` | `/api/v1/notifications/{id}/read` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/notifications/[id]` | `migrate_to_fastapi` | `/api/v1/notifications/{id}` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/notifications/counts` | `migrate_to_fastapi` | `/api/v1/notifications/counts` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/notifications/pending-actions` | `migrate_to_fastapi` | `/api/v1/notifications/pending-actions` | no | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/notifications/preferences` | `migrate_to_fastapi` | `/api/v1/notifications/preferences` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/notifications/read-all` | `migrate_to_fastapi` | `/api/v1/notifications/read-all` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/notifications` | `migrate_to_fastapi` | `/api/v1/notifications` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/onboarding/system-tour/complete` | `keep_ui_adapter` | `/api/v1/onboarding/system-tour/complete` | no | no | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/onboarding/system-tour/postpone` | `keep_ui_adapter` | `/api/v1/onboarding/system-tour/postpone` | no | no | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/onboarding/system-tour/skip` | `keep_ui_adapter` | `/api/v1/onboarding/system-tour/skip` | no | no | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/onboarding/system-tour/start` | `keep_ui_adapter` | `/api/v1/onboarding/system-tour/start` | no | no | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/onboarding/system-tour/step` | `keep_ui_adapter` | `/api/v1/onboarding/system-tour/step` | no | no | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/onboarding/user/complete-tour` | `keep_ui_adapter` | `/api/v1/onboarding/user/complete-tour` | no | no | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/onboarding/user/dismiss-hint` | `keep_ui_adapter` | `/api/v1/onboarding/user/dismiss-hint` | no | no | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/onboarding/user/reset-help` | `keep_ui_adapter` | `/api/v1/onboarding/user/reset-help` | no | no | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/onboarding/user` | `keep_ui_adapter` | `/api/v1/onboarding/user` | no | no | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/onboarding/workspace/complete-step` | `keep_ui_adapter` | `/api/v1/onboarding/workspace/complete-step` | no | no | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/onboarding/workspace/reset` | `keep_ui_adapter` | `/api/v1/onboarding/workspace/reset` | no | no | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/onboarding/workspace` | `keep_ui_adapter` | `/api/v1/onboarding/workspace` | no | no | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/onboarding/workspace/skip` | `keep_ui_adapter` | `/api/v1/onboarding/workspace/skip` | no | no | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/organization` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/organization/units` | yes | yes | Classify owner before adding behavior. | P2 |
| `/api/ownership-transactions/[id]/approve` | `deprecated_wrapper` | `/api/v1/ownership-transactions/{transaction_id}/approve` | yes | yes | Delete after canonical route or generated/shared contract has no imports. | P0 |
| `/api/ownership-transactions/[id]/cancel` | `deprecated_wrapper` | `/api/v1/ownership-transactions/{transaction_id}/cancel` | yes | yes | Delete after canonical route or generated/shared contract has no imports. | P0 |
| `/api/ownership-transactions/[id]/history` | `deprecated_wrapper` | `/api/v1/ownership-transactions/{transaction_id}/history` | yes | yes | Delete after canonical route or generated/shared contract has no imports. | P0 |
| `/api/ownership-transactions/[id]/impact` | `deprecated_wrapper` | `/api/v1/ownership-transactions/{transaction_id}/impact` | yes | yes | Delete after canonical route or generated/shared contract has no imports. | P0 |
| `/api/ownership-transactions/[id]/reject` | `deprecated_wrapper` | `/api/v1/ownership-transactions/{transaction_id}/reject` | yes | yes | Delete after canonical route or generated/shared contract has no imports. | P0 |
| `/api/ownership-transactions/[id]/reverse` | `deprecated_wrapper` | `/api/v1/ownership-transactions/{transaction_id}/reverse` | yes | yes | Delete after canonical route or generated/shared contract has no imports. | P0 |
| `/api/ownership-transactions/[id]` | `deprecated_wrapper` | `/api/v1/ownership-transactions/{transaction_id}` | yes | yes | Delete after canonical route or generated/shared contract has no imports. | P0 |
| `/api/ownership-transactions/[id]/send-approval` | `deprecated_wrapper` | `/api/v1/ownership-transactions/{transaction_id}/send-approval` | yes | yes | Delete after canonical route or generated/shared contract has no imports. | P0 |
| `/api/ownership-transactions` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/ownership/transactions` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P0 |
| `/api/policy/action-eligibility` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/policy/action-eligibility` | yes | no | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P2 |
| `/api/policy/evaluate` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/policy/evaluate` | yes | no | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P2 |
| `/api/portal/dashboard` | `proxy_to_fastapi` | `/api/v1/portal/dashboard` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/portal/documents/[id]/download-url` | `proxy_to_fastapi` | `/api/v1/portal/documents/{document_id}/download-url` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/portal/documents` | `proxy_to_fastapi` | `/api/v1/portal/documents` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/portal/documents/upload` | `proxy_to_fastapi` | `/api/v1/portal/documents/upload` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/portal/me` | `proxy_to_fastapi` | `/api/v1/portal/me` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/portal/notifications/[id]/read` | `proxy_to_fastapi` | `/api/v1/portal/notifications/{notification_id}/read` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/portal/notifications` | `proxy_to_fastapi` | `/api/v1/portal/notifications` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/portal/products/[id]` | `proxy_to_fastapi` | `/api/v1/portal/products/{asset_id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/portal/products` | `proxy_to_fastapi` | `/api/v1/portal/products` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/portal/service-records/[id]` | `proxy_to_fastapi` | `/api/v1/portal/service-records/{service_id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/portal/service-records` | `proxy_to_fastapi` | `/api/v1/portal/service-records` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/portal/service-requests/[id]/attachments` | `proxy_to_fastapi` | `/api/v1/portal/service-requests/{request_id}/attachments` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/portal/service-requests/[id]/comments` | `proxy_to_fastapi` | `/api/v1/portal/service-requests/{request_id}/comments` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/portal/service-requests/[id]` | `proxy_to_fastapi` | `/api/v1/portal/service-requests/{request_id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/portal/service-requests` | `proxy_to_fastapi` | `/api/v1/portal/service-requests` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/processes/[id]/cancel` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/processes/{process_id}/cancel` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/processes/[id]` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/processes/{process_id}` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/processes/[id]/start` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/processes` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/processes/[id]/steps/[step_id]/complete` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/processes/{process_id}/steps/{step_key}/complete` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/processes` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/processes` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/products/[id]` | `proxy_to_fastapi` | `/api/v1/products/{product_id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/products` | `proxy_to_fastapi` | `/api/v1/products` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/products/summary` | `proxy_to_fastapi` | `/api/v1/products/summary` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/project-tasks/[id]/assign` | `proxy_to_fastapi` | `/api/v1/tasks/project-tasks/{id}/assign` | yes | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/project-tasks/[id]/attachments` | `proxy_to_fastapi` | `/api/v1/tasks/project-tasks/{id}/attachments` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/project-tasks/[id]/comments` | `proxy_to_fastapi` | `/api/v1/tasks/project-tasks/{id}/comments` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/project-tasks/[id]` | `proxy_to_fastapi` | `/api/v1/tasks/project-tasks/{id}` | yes | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/project-tasks/[id]/transition` | `proxy_to_fastapi` | `/api/v1/tasks/project-tasks/{id}/transition` | yes | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/project-tasks` | `proxy_to_fastapi` | `/api/v1/tasks/project-tasks` | yes | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/projects/[id]` | `proxy_to_fastapi` | `/api/v1/projects/{id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/projects/[id]/summary` | `proxy_to_fastapi` | `/api/v1/projects/{id}/summary` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/projects` | `proxy_to_fastapi` | `/api/v1/projects` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/projects/summary` | `proxy_to_fastapi` | `/api/v1/projects/summary` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/reference/nace-codes/import` | `migrate_to_fastapi` | `/api/v1/reference/nace-codes/import` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/reference/nace-codes` | `migrate_to_fastapi` | `/api/v1/reference/nace-codes` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/reference/nace-codes/update-from-source` | `migrate_to_fastapi` | `/api/v1/reference/nace-codes/update-from-source` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/reference/nace-codes/update-logs` | `migrate_to_fastapi` | `/api/v1/reference/nace-codes/update-logs` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/reference/sgk-codes` | `migrate_to_fastapi` | `/api/v1/reference/sgk-codes` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/reference/tax-offices` | `migrate_to_fastapi` | `/api/v1/reference/tax-offices` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/reference/trade-registry-offices` | `migrate_to_fastapi` | `/api/v1/reference/trade-registry-offices` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/reference/turkey-locations` | `migrate_to_fastapi` | `/api/v1/reference/turkey-locations` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/reminders/[id]/cancel` | `migrate_to_fastapi` | `/api/v1/reminders/{id}/cancel` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/reminders/[id]/dismiss` | `migrate_to_fastapi` | `/api/v1/reminders/{id}/dismiss` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/reminders` | `migrate_to_fastapi` | `/api/v1/reminders` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/reporting/custom-reports/[id]` | `proxy_to_fastapi` | `/api/v1/reporting/custom-reports/{report_id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/reporting/custom-reports` | `proxy_to_fastapi` | `/api/v1/reporting/custom-reports` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/reporting/dashboard/module/[module]` | `proxy_to_fastapi` | `/api/v1/reporting/dashboard/module/{module_key}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/reporting/dashboard/preferences` | `proxy_to_fastapi` | `/api/v1/reporting/dashboard/preferences` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/reporting/dashboard` | `proxy_to_fastapi` | `/api/v1/reporting/dashboard` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/reporting/dashboard/summary` | `proxy_to_fastapi` | `/api/v1/reporting/dashboard/summary` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/reporting/exports/[id]/download-url` | `proxy_to_fastapi` | `/api/v1/reporting/exports/{export_id}/download-url` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/reporting/exports/[id]` | `proxy_to_fastapi` | `/api/v1/reporting/exports/{export_id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/reporting/exports` | `proxy_to_fastapi` | `/api/v1/reporting/exports` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/reporting/kpis/[module]` | `proxy_to_fastapi` | `/api/v1/reporting/kpis/{module_key}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/reporting/reports/[report_key]/export` | `proxy_to_fastapi` | `/api/v1/reporting/reports/{report_key}/export` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/reporting/reports/[report_key]/query` | `proxy_to_fastapi` | `/api/v1/reporting/reports/{report_key}/query` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/reporting/reports/[report_key]` | `proxy_to_fastapi` | `/api/v1/reporting/reports/{report_key}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/reporting/reports/catalog` | `proxy_to_fastapi` | `/api/v1/reporting/reports/catalog` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/reporting/reports` | `proxy_to_fastapi` | `/api/v1/reporting/reports` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/reporting/saved-views/[id]/pin` | `proxy_to_fastapi` | `/api/v1/reporting/saved-views/{view_id}/pin` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/reporting/saved-views/[id]` | `proxy_to_fastapi` | `/api/v1/reporting/saved-views/{view_id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/reporting/saved-views/[id]/set-default` | `proxy_to_fastapi` | `/api/v1/reporting/saved-views/{view_id}/set-default` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/reporting/saved-views` | `proxy_to_fastapi` | `/api/v1/reporting/saved-views` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/reporting/scheduled-reports/[id]/pause` | `proxy_to_fastapi` | `/api/v1/reporting/scheduled-reports/{schedule_id}/pause` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/reporting/scheduled-reports/[id]/resume` | `proxy_to_fastapi` | `/api/v1/reporting/scheduled-reports/{schedule_id}/resume` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/reporting/scheduled-reports/[id]` | `proxy_to_fastapi` | `/api/v1/reporting/scheduled-reports/{schedule_id}` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/reporting/scheduled-reports/[id]/run-now` | `proxy_to_fastapi` | `/api/v1/reporting/scheduled-reports/{schedule_id}/run-now` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/reporting/scheduled-reports` | `proxy_to_fastapi` | `/api/v1/reporting/scheduled-reports` | no | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P2 |
| `/api/search/by-entity/[entity_type]/[entity_id]` | `migrate_to_fastapi` | `/api/v1/search/by-entity/{entity_type}/{entity_id}` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/search/command-palette` | `migrate_to_fastapi` | `/api/v1/search/command-palette` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/search/commands` | `migrate_to_fastapi` | `/api/v1/search/commands` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/search/query` | `migrate_to_fastapi` | `/api/v1/search/query` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/search/recent` | `migrate_to_fastapi` | `/api/v1/search/recent` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/search` | `migrate_to_fastapi` | `/api/v1/search` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/search/suggestions` | `migrate_to_fastapi` | `/api/v1/search/suggestions` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/security/access-summary` | `migrate_to_fastapi` | `/api/v1/security/access-summary` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/security/permission-denials` | `migrate_to_fastapi` | `/api/v1/security/permission-denials` | yes | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/security/permissions/matrix` | `migrate_to_fastapi` | `/api/v1/security/permissions/matrix` | yes | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/security/permissions` | `migrate_to_fastapi` | `/api/v1/security/permissions` | yes | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/security/policy-test` | `migrate_to_fastapi` | `/api/v1/security/policy-test` | yes | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/security/roles/[id]/permissions` | `migrate_to_fastapi` | `/api/v1/security/roles/{id}/permissions` | yes | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/security/roles/[id]` | `migrate_to_fastapi` | `/api/v1/security/roles/{id}` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/security/roles` | `migrate_to_fastapi` | `/api/v1/security/roles` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/security/users/[id]/roles/[roleId]` | `migrate_to_fastapi` | `/api/v1/security/users/{id}/roles/{roleId}` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/security/users/[id]/roles` | `migrate_to_fastapi` | `/api/v1/security/users/{id}/roles` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/security/users/[id]` | `migrate_to_fastapi` | `/api/v1/security/users/{id}` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/security/users/[id]/scopes` | `migrate_to_fastapi` | `/api/v1/security/users/{id}/scopes` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/security/users` | `migrate_to_fastapi` | `/api/v1/security/users` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/session/bootstrap` | `keep_session_bootstrap` | `n/a` | yes | yes | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/settings/integration-parameters/[id]/credential` | `migrate_to_fastapi` | `/api/v1/settings/integration-parameters/{id}/credential` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/settings/integration-parameters/[id]` | `migrate_to_fastapi` | `/api/v1/settings/integration-parameters/{id}` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/settings/integration-parameters/[id]/test` | `migrate_to_fastapi` | `/api/v1/settings/integration-parameters/{id}/test` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/settings/integration-parameters` | `migrate_to_fastapi` | `/api/v1/settings/integration-parameters` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/settings/module-licenses` | `migrate_to_fastapi` | `/api/v1/settings/module-licenses` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/settings/setup-wizard` | `migrate_to_fastapi` | `/api/v1/settings/setup-wizard` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/settings/system-parameters` | `migrate_to_fastapi` | `/api/v1/settings/system-parameters` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/setup/actions/[action_key]/run` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/setup/actions/{action_key}/run` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/setup/actions` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/setup/actions` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/setup/readiness/[module_key]` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/setup/readiness/{module_key}` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/setup/readiness` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/setup/readiness` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/system/email/messages/[id]/retry` | `migrate_to_fastapi` | `/api/v1/system/email/messages/{id}/retry` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/system/email/messages` | `migrate_to_fastapi` | `/api/v1/system/email/messages` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/system/email/test` | `migrate_to_fastapi` | `/api/v1/system/email/test` | no | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/tasks/[id]/assign` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/tasks/{task_id}/assign` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/tasks/[id]/comment` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/tasks/{task_id}/comment` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/tasks/[id]/complete` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/tasks/{task_id}/complete` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/tasks/[id]` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/tasks/{task_id}` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/tasks/my-project-tasks` | `proxy_to_fastapi` | `/api/v1/tasks/my-project-tasks` | yes | no | Keep until frontend generated client/direct FastAPI strategy replaces BFF route. | P1 |
| `/api/tasks` | `proxy_to_fastapi_with_temporary_fallback` | `/api/v1/tasks` | yes | yes | Remove TS fallback after FastAPI endpoint is verified in staging and frontend E2E/smoke passes. | P1 |
| `/api/tenants/current` | `migrate_to_fastapi` | `/api/v1/tenants/current` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/tenants/default` | `migrate_to_fastapi` | `/api/v1/tenants/default` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/tenants/options` | `migrate_to_fastapi` | `/api/v1/tenants/options` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/tenants/switch` | `migrate_to_fastapi` | `/api/v1/tenants/switch` | yes | yes | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/uploads/documents` | `keep_upload_adapter` | `n/a` | yes | yes | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/uploads/documents/signed-url` | `keep_upload_adapter` | `n/a` | yes | yes | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/uploads/image-variants` | `keep_upload_adapter` | `n/a` | yes | yes | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |
| `/api/user-registration-requests/[id]/approve` | `migrate_to_fastapi` | `/api/v1/user-registration-requests/{id}/approve` | yes | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/user-registration-requests` | `migrate_to_fastapi` | `/api/v1/user-registration-requests` | yes | no | Implement FastAPI equivalent, then convert route to proxy or remove. | P2 |
| `/api/user/preferences` | `keep_ui_adapter` | `/api/v1/user/preferences` | yes | no | Permanent adapter/shared contract; keep thin and do not add ERP domain mutation. | P2 |

## Gate Rules

- `proxy_to_fastapi` routes must not import TS backend/domain modules or direct DB code.
- `proxy_to_fastapi_with_temporary_fallback` routes are accepted only as P1 migration debt.
- `keep_ui_adapter`, `keep_session_bootstrap` and `keep_upload_adapter` routes may remain, but must stay frontend-adjacent.
- `migrate_to_fastapi` and `deprecated_wrapper` entries are not productization-ready backend homes.
