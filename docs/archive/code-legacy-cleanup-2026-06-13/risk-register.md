# Code Legacy Cleanup Risk Register

<!-- source-of-truth-standard: contract overrides markdown -->

Generated: 2026-06-13T15:10:41.320Z

## Related Contracts

- `contracts/**`
- `contracts/page-flow-contracts.json`

## Related Guards

- `scripts/check-code-legacy-inventory.js`
- `npm run legacy:check`

| Severity | Risk | File/Route | Classification | Mitigation |
| --- | --- | --- | --- | --- |
| P1 | contractize_before_promotion | lib/services/accountingService.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/companyService.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/companyVehicleService.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/facilityService.ts | needs_contractization | contractize_before_promotion |
| P1 | contractize_before_promotion | lib/services/organizationService.ts | needs_contractization | contractize_before_promotion |
| P1 | add_migration_header_or_contractize | app/api/accounting/bank-accounts-cards/[id]/history/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/auth/logout/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/auth/me/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/auth/otp/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/auth/otp/send/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/auth/tenant-access/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/bulk/actions/[id]/confirm/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/bulk/actions/[id]/report/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/bulk/actions/[id]/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/bulk/actions/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/cron/document-thumbnails/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/data-quality/by-entity/[entity_type]/[entity_id]/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/data-quality/check/[entity_type]/[entity_id]/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/data-quality/check/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/data-quality/duplicates/[group_id]/dismiss/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/data-quality/duplicates/[group_id]/false-positive/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/data-quality/duplicates/[group_id]/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/data-quality/duplicates/detect/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/data-quality/duplicates/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/data-quality/merge/[merge_id]/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/data-quality/merge/confirm/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/data-quality/merge/preview/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/data-quality/rules/[rule_key]/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/data-quality/rules/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/data-quality/summary/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/documents/[id]/access-logs/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/documents/[id]/download-url/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/documents/[id]/new-version/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/documents/[id]/preview-url/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/documents/[id]/reject/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/documents/[id]/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/documents/[id]/verify/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/documents/by-entity/[entity_type]/[entity_id]/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/documents/by-entity/[entity_type]/[entity_id]/upload/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/documents/expired/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/documents/expiring/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/documents/requirements/[module_key]/[operation_key]/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/documents/requirements/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/documents/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/documents/upload/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/export/jobs/[id]/download/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/export/jobs/[id]/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/export/jobs/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/import/jobs/[id]/cancel/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/import/jobs/[id]/confirm/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/import/jobs/[id]/error-report/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/import/jobs/[id]/mapping/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/import/jobs/[id]/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/import/jobs/[id]/validate/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/import/jobs/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/import/templates/[template_key]/download/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/import/templates/[template_key]/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/import/templates/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/licensing/current/features/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/licensing/current/modules/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/licensing/current/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/licensing/plans/[planId]/features/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/licensing/plans/[planId]/modules/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/licensing/plans/[planId]/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/licensing/products/[productId]/plans/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/licensing/products/[productId]/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/licensing/products/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/licensing/tenant-licenses/[licenseId]/archive/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/licensing/tenant-licenses/[licenseId]/cancel/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/licensing/tenant-licenses/[licenseId]/change-plan/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/licensing/tenant-licenses/[licenseId]/payments/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/licensing/tenant-licenses/[licenseId]/reactivate/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/licensing/tenant-licenses/[licenseId]/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/licensing/tenant-licenses/[licenseId]/suspend/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/licensing/tenant-licenses/[licenseId]/usage-snapshot/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/licensing/tenant-licenses/[licenseId]/usage/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/licensing/tenant-licenses/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/notifications/[id]/archive/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/notifications/[id]/dismiss/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/notifications/[id]/read/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/notifications/[id]/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/notifications/counts/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/notifications/preferences/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/notifications/read-all/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/notifications/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/onboarding/system-tour/complete/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/onboarding/system-tour/postpone/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/onboarding/system-tour/skip/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/onboarding/system-tour/start/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/onboarding/system-tour/step/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/onboarding/user/complete-tour/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/onboarding/user/dismiss-hint/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/onboarding/user/reset-help/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/onboarding/user/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/onboarding/workspace/complete-step/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/onboarding/workspace/reset/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/onboarding/workspace/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/onboarding/workspace/skip/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/reminders/[id]/cancel/route.ts | needs_contractization | add_migration_header_or_contractize |
| P1 | add_migration_header_or_contractize | app/api/reminders/[id]/dismiss/route.ts | needs_contractization | add_migration_header_or_contractize |
