# Next FastAPI Boundary Debt Report

- Tarih: 2026-06-06
- Branch: main
- Commit hash: 3c089be p1_stabilization_backend_ops_proof
- Kapsam: app, components, lib, backend, scripts, docs, docker-compose, package.json, next.config.js, middleware.ts, README.md
- Çalışma tipi: audit only; kod silme/refactor yok

## Official Status

- Route files: 521
- Explicit migration headers: 422
- Missing migration headers: 99
- P0 missing headers: 0
- Temporary fallback routes: 0
- Proxy-only boundary violations: 0
- Status counts: proxy_to_fastapi 421, keep_ui_adapter 17, local_reference_fallback 1, migrate_to_fastapi 82
- boundaries:check warnings: 162
- boundaries:check critical errors: 0

## Warning Category Breakdown

Not: script only classified warnings printed by the checker before `... 82 more warnings omitted`; official count remains 162.

| kategori | count | risk | önerilen aksiyon | release etkisi |
| --- | --- | --- | --- | --- |
| shared_ui_other | 18 | development/false-positive candidate | shared frontend contract extraction and per-module burn-down | must review before RC |
| document_media | 6 | real P1 debt | shared frontend contract extraction and per-module burn-down | must review before RC |
| release_scope_lifecycle | 16 | real P1 debt | shared frontend contract extraction and per-module burn-down | must review before RC |
| admin_audit_export | 8 | real P1 debt | shared frontend contract extraction and per-module burn-down | must review before RC |
| development_only | 27 | development/false-positive candidate | shared frontend contract extraction and per-module burn-down | keep development-only hidden |
| action_center | 6 | real P1 debt | shared frontend contract extraction and per-module burn-down | must review before RC |

## Route Debt Samples

| route path | file path | current status | desired status | risk | release impact | recommended cleanup | priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| /api/accounting/bank-accounts-cards/[id]/history | app/api/accounting/bank-accounts-cards/[id]/history/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/auth/logout | app/api/auth/logout/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/auth/otp | app/api/auth/otp/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/auth/otp/send | app/api/auth/otp/send/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/auth/tenant-access | app/api/auth/tenant-access/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/bulk/actions/[id]/confirm | app/api/bulk/actions/[id]/confirm/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/bulk/actions/[id]/report | app/api/bulk/actions/[id]/report/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/bulk/actions/[id] | app/api/bulk/actions/[id]/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/bulk/actions | app/api/bulk/actions/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/cron/document-thumbnails | app/api/cron/document-thumbnails/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/data-quality/by-entity/[entity_type]/[entity_id] | app/api/data-quality/by-entity/[entity_type]/[entity_id]/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/data-quality/check/[entity_type]/[entity_id] | app/api/data-quality/check/[entity_type]/[entity_id]/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/data-quality/check | app/api/data-quality/check/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/data-quality/duplicates/[group_id]/dismiss | app/api/data-quality/duplicates/[group_id]/dismiss/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/data-quality/duplicates/[group_id]/false-positive | app/api/data-quality/duplicates/[group_id]/false-positive/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/data-quality/duplicates/[group_id] | app/api/data-quality/duplicates/[group_id]/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/data-quality/duplicates/detect | app/api/data-quality/duplicates/detect/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/data-quality/duplicates | app/api/data-quality/duplicates/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/data-quality/merge/[merge_id] | app/api/data-quality/merge/[merge_id]/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/data-quality/merge/confirm | app/api/data-quality/merge/confirm/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/data-quality/merge/preview | app/api/data-quality/merge/preview/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/data-quality/rules/[rule_key] | app/api/data-quality/rules/[rule_key]/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/data-quality/rules | app/api/data-quality/rules/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/data-quality/summary | app/api/data-quality/summary/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/documents/[id]/access-logs | app/api/documents/[id]/access-logs/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/documents/[id]/download-url | app/api/documents/[id]/download-url/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/documents/[id]/new-version | app/api/documents/[id]/new-version/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/documents/[id]/preview-url | app/api/documents/[id]/preview-url/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/documents/[id]/reject | app/api/documents/[id]/reject/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/documents/[id] | app/api/documents/[id]/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/documents/[id]/verify | app/api/documents/[id]/verify/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/documents/by-entity/[entity_type]/[entity_id] | app/api/documents/by-entity/[entity_type]/[entity_id]/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/documents/by-entity/[entity_type]/[entity_id]/upload | app/api/documents/by-entity/[entity_type]/[entity_id]/upload/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/documents/expired | app/api/documents/expired/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/documents/expiring | app/api/documents/expiring/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/documents/requirements/[module_key]/[operation_key] | app/api/documents/requirements/[module_key]/[operation_key]/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/documents/requirements | app/api/documents/requirements/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/documents | app/api/documents/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/documents/upload | app/api/documents/upload/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/export/jobs/[id]/download | app/api/export/jobs/[id]/download/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/export/jobs/[id] | app/api/export/jobs/[id]/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/export/jobs | app/api/export/jobs/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/import/jobs/[id]/cancel | app/api/import/jobs/[id]/cancel/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/import/jobs/[id]/confirm | app/api/import/jobs/[id]/confirm/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/import/jobs/[id]/error-report | app/api/import/jobs/[id]/error-report/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/import/jobs/[id]/mapping | app/api/import/jobs/[id]/mapping/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/import/jobs/[id] | app/api/import/jobs/[id]/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/import/jobs/[id]/validate | app/api/import/jobs/[id]/validate/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/import/jobs | app/api/import/jobs/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/import/templates/[template_key]/download | app/api/import/templates/[template_key]/download/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/import/templates/[template_key] | app/api/import/templates/[template_key]/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/import/templates | app/api/import/templates/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/notifications/[id]/archive | app/api/notifications/[id]/archive/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/notifications/[id]/dismiss | app/api/notifications/[id]/dismiss/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/notifications/[id]/read | app/api/notifications/[id]/read/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/notifications/[id] | app/api/notifications/[id]/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/notifications/counts | app/api/notifications/counts/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/notifications/preferences | app/api/notifications/preferences/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/notifications/read-all | app/api/notifications/read-all/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/notifications | app/api/notifications/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/onboarding/system-tour/complete | app/api/onboarding/system-tour/complete/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/onboarding/system-tour/postpone | app/api/onboarding/system-tour/postpone/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/onboarding/system-tour/skip | app/api/onboarding/system-tour/skip/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/onboarding/system-tour/start | app/api/onboarding/system-tour/start/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/onboarding/system-tour/step | app/api/onboarding/system-tour/step/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/onboarding/user/complete-tour | app/api/onboarding/user/complete-tour/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/onboarding/user/dismiss-hint | app/api/onboarding/user/dismiss-hint/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/onboarding/user/reset-help | app/api/onboarding/user/reset-help/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/onboarding/user | app/api/onboarding/user/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/onboarding/workspace/complete-step | app/api/onboarding/workspace/complete-step/route.ts | missing_header | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |
| /api/reference/turkey-locations | app/api/reference/turkey-locations/route.ts | local_reference_fallback | classify header and proxy/adapter role | P1 documentation/boundary ambiguity | low unless release route visible | add migration header or mark hidden/deprecated | P1/P2 |

## Karar

Release blocker boundary finding yok; ancak P1 architectural debt devam ediyor. İlk boundary cleanup, release-scope lifecycle/document/admin/action-center warnings ve 99 missing header üzerinde yapılmalı.
