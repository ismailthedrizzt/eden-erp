# Cleanup Sprint 1 Command Baseline

Date: 2026-06-06
Environment: remote server

## npm run typecheck
- Status: PASS
- Exit code: 0
```text
> eden-erp@0.1.0 typecheck
> npm run typecheck:local


> eden-erp@0.1.0 typecheck:local
> npm run typecheck:shared && npm run typecheck:fast


> eden-erp@0.1.0 typecheck:shared
> tsc --noEmit -p tsconfig.shared.json


> eden-erp@0.1.0 typecheck:fast
> node scripts/typecheck-targeted.js

Targeted TypeScript check passed (1 file).
```

## npm run build
- Status: PASS
- Exit code: 0
```text
l/profile                                                                     180 B         169 kB
├ ○ /portal/service-records                                                             178 B         169 kB
├ ○ /portal/service-requests                                                            178 B         169 kB
├ ƒ /portal/service-requests/[id]                                                       180 B         169 kB
├ ƒ /release-not-available                                                            1.63 kB         107 kB
└ ○ /test                                                                               575 B         103 kB
+ First Load JS shared by all                                                          102 kB
  ├ chunks/31255-2cfcc5bcc43ce501.js                                                  45.7 kB
  ├ chunks/4bd1b696-bad92808725a934a.js                                               54.2 kB
  └ other shared chunks (total)                                                       2.02 kB


ƒ Middleware                                                                          40.2 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

## npm run release:check
- Status: PASS
- Exit code: 0
```text
> eden-erp@0.1.0 release:check
> node scripts/check-release-registry.js

Release registry check: 146 registry routes, 146 page routes
PASS
```

## npm run env:safety
- Status: PASS
- Exit code: 0
```text
> eden-erp@0.1.0 env:safety
> node scripts/check-release-env-safety.js

Release environment safety check: env=release
PASS
```

## npm run db:target:check
- Status: PASS
- Exit code: 0
```text
> eden-erp@0.1.0 db:target:check
> node scripts/check-database-target.js

Database target check: env=release
Database target: postgresql://***:***@localhost:5432/app1db
Database name: app1db
Database class: release
Command context: db:target:check
PASS
```

## npm run migration:status
- Status: PASS
- Exit code: 0
```text
> eden-erp@0.1.0 migration:status
> node scripts/check-backend-migration-status.js

Route files: 521
Explicit migration headers: 422
Missing migration headers: 99
P0 missing headers: 0
Temporary fallback routes: 0
Proxy-only boundary violations: 0
Proxy-only routes without proxy helper: 0
Status counts:
  keep_ui_adapter: 17
  local_reference_fallback: 1
  migrate_to_fastapi: 82
  proxy_to_fastapi: 421
Client direct backend-risk files: 0
```

## npm run boundaries:check
- Status: PASS
- Exit code: 0
```text
t-management/ProjectTaskMvpPages.tsx imports TS backend-core helpers; keep only frontend/shared contracts here
WARNING components/modules/reporting/AdvancedReportingPages.tsx imports TS backend-core helpers; keep only frontend/shared contracts here
WARNING components/modules/security/SecurityRbacAdminPage.tsx imports TS backend-core helpers; keep only frontend/shared contracts here
WARNING components/modules/sirket/PartnersTab.tsx imports TS backend-core helpers; keep only frontend/shared contracts here
WARNING components/modules/sirket/RepresentativesTab.tsx imports TS backend-core helpers; keep only frontend/shared contracts here
WARNING components/notifications/NotificationBell.tsx imports TS backend-core helpers; keep only frontend/shared contracts here
WARNING components/notifications/NotificationItem.tsx imports TS backend-core helpers; keep only frontend/shared contracts here
WARNING components/notifications/NotificationPanel.tsx imports TS backend-core helpers; keep only frontend/shared contracts here
WARNING components/notifications/NotificationPreferencesForm.tsx imports TS backend-core helpers; keep only frontend/shared contracts here
WARNING ... 82 more warnings omitted
```

## npm run openapi:drift
- Status: PASS
- Exit code: 0
```text
> eden-erp@0.1.0 openapi:drift
> npm run openapi:refresh && git diff --exit-code backend/openapi.json lib/generated/backend-client/types.ts


> eden-erp@0.1.0 openapi:refresh
> npm run openapi:export && npm run openapi:generate


> eden-erp@0.1.0 openapi:export
> cd backend && .venv/bin/python scripts/export_openapi.py

Wrote /home/edengrup-app1/htdocs/app1.edengrup.com/backend/openapi.json

> eden-erp@0.1.0 openapi:generate
> openapi-typescript backend/openapi.json -o lib/generated/backend-client/types.ts && node scripts/mark-generated-openapi-client.js

✨ openapi-typescript 7.13.0
🚀 backend/openapi.json → lib/generated/backend-client/types.ts [2.8s]
```

## backend ruff
- Status: PASS
- Exit code: 0
```text
All checks passed!
```

## backend mypy
- Status: PASS
- Exit code: 0
```text
Success: no issues found in 476 source files
```

## backend pytest
- Status: PASS
- Exit code: 0
```text
test_integration_event_registry_is_constrained
  /home/edengrup-app1/htdocs/app1.edengrup.com/backend/app/tests/test_integration_hub_mvp.py:39: DeprecationWarning: 'HTTP_422_UNPROCESSABLE_ENTITY' is deprecated. Use 'HTTP_422_UNPROCESSABLE_CONTENT' instead.
    validate_event_types(["unsafe.sql.executed"])

app/tests/test_integration_hub_mvp.py::test_webhook_validation_blocks_secret_headers_and_unsafe_targets
  /home/edengrup-app1/htdocs/app1.edengrup.com/backend/app/tests/test_integration_hub_mvp.py:57: DeprecationWarning: 'HTTP_422_UNPROCESSABLE_ENTITY' is deprecated. Use 'HTTP_422_UNPROCESSABLE_CONTENT' instead.
    sanitize_headers({"Authorization": "Bearer secret"})

app/tests/test_integration_hub_mvp.py::test_webhook_validation_blocks_secret_headers_and_unsafe_targets
  /home/edengrup-app1/htdocs/app1.edengrup.com/backend/app/tests/test_integration_hub_mvp.py:61: DeprecationWarning: 'HTTP_422_UNPROCESSABLE_ENTITY' is deprecated. Use 'HTTP_422_UNPROCESSABLE_CONTENT' instead.
    validate_target_url("ftp://example.com/webhook")

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
======================= 229 passed, 4 warnings in 31.20s =======================
```
