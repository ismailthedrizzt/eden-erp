# Contract Enforcement Drift Audit Report

Date: 2026-06-13

## 1. Current Guard Results On Remote

The remote repository at `/home/edengrup-app1/htdocs/app1.edengrup.com` was used for the latest checks.

```text
npm run contracts:check: pass
npm run page-flow:contract:check: pass (22 flows)
npm run frontend:standard:check: pass (152 pages, 2 strict routes, 0 errors)
npm run release:check: pass (152 registry routes, 152 page routes)
npm run contract:usage: pass with 3 warnings, 0 errors
npm run contract:backend-drift: fail with 116 errors
npm run contract:lifecycle: fail with 10 errors
npm run validate:contracts: fail at contract:backend-drift
```

`npm run build` was not run after this point because `validate:contracts` is still failing.

## 2. Fixed In This Cleanup Pass

- Removed generated fake contract instrumentation from app page files.
- `void someContract` / `void someContractReady` usage is no longer used to satisfy guards.
- Updated generated page coverage semantics so generated/scaffolded routes are not marked as runtime contract-ready.
- Kept strict runtime contract usage checks for implemented/manual business contract pages.
- Restored real Employee and Theme Management form contracts after the previous generator overwrite.
- Fixed generator behavior so it no longer overwrites manual form/page contract files.
- Added form contract sections to company, partner, representative, and branch page contracts.
- Added form-field assertion support for legacy V1 company form pages.
- Connected company, partner, and branch registry entries to their API/lifecycle contract files.
- Fixed `contract:usage` export resolution so it detects the actual `*FormContract` export instead of the first schema export.
- Employee and Theme Management strict frontend standard checks now pass.

## 3. Remaining Backend Drift Blockers

`contract:backend-drift` still fails with 116 errors. Main groups:

- Several API contracts point to FastAPI routes that do not currently exist.
- Several frontend service paths differ from the contract `frontendPath`.
- Several Next BFF routes are missing or do not visibly proxy to the declared FastAPI path.
- Several critical endpoints still use generic `ApiSuccess[dict[str, Any]]`/generic DTO patterns instead of typed business response schemas.
- Theme management API contracts currently describe admin settings based persistence, but the actual BFF/FastAPI chain is not fully aligned.

These are real backend/BFF/API contract drift items and were not converted into warnings.

## 4. Remaining Lifecycle Blockers

`contract:lifecycle` still fails with 10 errors:

- Employee lifecycle contract requires operation records, but backend does not visibly insert into `hr_employee_lifecycle_events`.
- Partner ownership transactions lack visible non-null `operation_id` / `process_instance_id` linkage.
- Theme management lifecycle contract requires operation records, but backend has no visible `workspace_theme_lifecycle_events` insert.
- Multiple backend services still mutate lifecycle/status fields without a visible transaction/event insert in the same service path.

These are real lifecycle architecture blockers and were not bypassed.

## 5. Contract Usage Warnings

`contract:usage` passes with 3 warnings:

- `/app/ik/calisanlar`
- `/app/sirket/companies`
- `/app/sirket/companies/partners`

Each warning indicates a page writes lifecycle-like status fields; backend lifecycle guard must cover the path. Since `contract:lifecycle` is still failing, these remain part of the P0 backend/lifecycle backlog.

## 6. Remaining P0

- Backend API/BFF/FastAPI drift: open.
- Lifecycle operation record enforcement: open.

## 7. Commands Run

```text
npm run frontend:standard:check
npm run contracts:check
npm run contract:usage
npm run validate:contracts
npm run contract:lifecycle
```

## 8. Final Status

Frontend contract coverage and usage guard cleanup is complete enough to pass the frontend/usage gates.

Full release-grade contract validation is not yet complete because backend drift and lifecycle operation guards still fail.
