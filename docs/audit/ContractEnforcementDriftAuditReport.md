# Contract Enforcement Drift Audit Report

Date: 2026-06-13

Canonical repository: `/home/edengrup-app1/htdocs/app1.edengrup.com`

## 1. Previous Failing Counts

Latest audit before this cleanup:

```text
npm run contracts:check: pass
npm run page-flow:contract:check: pass
npm run frontend:standard:check: pass
npm run release:check: pass
npm run contract:usage: pass with 3 warnings
npm run contract:backend-drift: fail with 116 errors
npm run contract:lifecycle: fail with 10 errors
npm run validate:contracts: fail at contract:backend-drift
```

## 2. Backend Drift Fixed By Category

- A. Frontend service path mismatch: HR employee contracts now use `/api/hr/...`; ownership and theme management service files now call their declared frontend paths.
- B. BFF route missing/wrong proxy target: HR, branch official-change, organization, ownership, and theme BFF routes now visibly map to the declared target path or local-only mode.
- C. FastAPI route missing: ownership transaction list/get/approved routes, branch document route, organization units, and dynamic official-change dispatch routes were aligned with actual FastAPI handlers.
- D. API contract permission mismatch: `backendAuthorization` now matches backend `ensure_permission(...)` checks, including HR legacy permission keys, company, branch, partner, representative, ownership, and organization permissions.
- E. Backend request schema mismatch: contract entries now declare the backend request models used by FastAPI routes.
- F. Backend response schema too generic: critical HR/company/branch/partner/representative/ownership/organization endpoints now expose typed response DTOs instead of only generic dict payloads.
- G. Uncontrolled `extra="allow"`: contract-ready HR, company, branch, partner, representative, and ownership request models were moved to explicit fields with `extra="forbid"` where safe.
- K. Guard false positives/detection: backend route parsing now handles multiline decorators, registered router prefixes, local-only backend mode, and correct backend authorization fallback.

## 3. Lifecycle Drift Fixed By Category

- H. Missing `operation_id` / `process_instance_id`: HR employment lifecycle operations and ownership transactions now write non-null operation linkage.
- I. Transaction table mismatch: employee lifecycle now writes `hr_employee_lifecycle_events`; ownership lifecycle uses `ownership_transactions`; theme management is explicitly development/local-only.
- J. Direct lifecycle/status mutation: employee draft delete and accounting cari delete now create operation records before status projection updates. Data quality merge now creates a merge operation before source status updates. Branch/facility/partner projection helpers are detected through operation-bound caller flows.
- K. Guard false positives/detection: lifecycle guard now detects real SQL `UPDATE public... SET lifecycle_field = ...` mutations, avoids function-name false positives, and follows operation/audit/event evidence through direct caller chains.

## 4. Permission Decisions

Smallest safe alignment was used. Frontend canonical permissions remain in `authorization`, while backend checks use the actual backend keys in `backendAuthorization`.

Examples:

```text
hr.employee.read -> backend hr.view
hr.employee.create -> backend hr.employeeCreate
hr.employee.update -> backend hr.edit
hr.employment.start -> backend hr.employmentStart
hr.employment.terminate -> backend hr.employmentTerminate
hr.assignment.change -> backend hr.assignmentChange
hr.sgk.manage -> backend hr.employmentStart / hr.employmentTerminate by operation
hr.documents.manage -> backend hr.documentsManage
```

No broad permission alias was added.

## 5. API Path Decisions

- HR frontend and BFF paths are canonicalized under `/api/hr/...`.
- HR FastAPI paths are under `/api/v1/hr/...`.
- Company/branch/partner/representative BFF paths keep the existing `/api/companies/...` frontend namespace and proxy to typed FastAPI endpoints.
- Ownership lifecycle APIs use `/api/ownership/transactions...` to `/api/v1/ownership/transactions...`.
- Theme management is development/local-only and uses `/api/theme/import` and `/api/theme/export`; it no longer pretends to persist through admin settings FastAPI endpoints.

## 6. Request Schema Changes

Contract-ready request models now reject unknown fields unless an explicit payload field is present. Added explicit fields such as `client_request_id`, `base_version`, `base_updated_at`, `document_files`, `metadata_json`, and `payload_json` where needed.

Representative authority request handling preserves direct-constructor Turkish labels for legacy compatibility, while `model_validate` and operation execution normalize to canonical transaction keys.

## 7. Response Schema Changes

Added/used typed response DTOs including:

```text
EmployeeListResponse
EmployeeRecordResponse
EmployeeDocumentResponse
CompanyListResponse
CompanyRecordResponse
CompanyDetailResponse
CompanyPrecheckResponse
BranchListResponse
BranchRecordResponse
PartnerListResponse
PartnerRecordResponse
RepresentativeListResponse
RepresentativeRecordResponse
OwnershipTransactionListResponse
OwnershipTransactionRecordResponse
OwnershipTransactionMutationResponse
OrganizationListResponse
```

## 8. Lifecycle Operation Record Implementation

- HR employment start, termination, assignment change, SGK entry completed, and SGK exit completed create operation requests and write `hr_employee_lifecycle_events`.
- HR employment transactions now carry operation/process linkage instead of both values being null.
- Ownership transaction inserts now include `operation_id` / `process_instance_id`.
- Data quality merge writes the `merge_operations` operation row before source status mutation.
- Employee draft delete and accounting cari delete are operation-recorded before projection status updates.

## 9. Remaining Warnings

`contract:usage` still passes with 3 warnings:

```text
/app/ik/calisanlar
/app/sirket/companies
/app/sirket/companies/partners
```

`npm run build` also reports pre-existing Next/ESLint warnings for missing hook dependencies and `<img>` usage. These are warnings, not build blockers.

Backend pytest reports 4 deprecation warnings from dependencies/tests and 7 skipped live DB schema tests.

## 10. Remaining Exceptions Or Aliases

No permission aliases were added.

Theme management lifecycle is explicitly `persistenceMode: 'development_local_only'` with `operationRecordRequired: false`; this matches the current local-storage/development-only implementation instead of faking backend persistence.

The source encoding guard now ignores generated `.next-releases` output, matching the existing `.next`, `dist`, and `build` generated-output exclusions.

## 11. Commands Run

Required command sequence was run on the canonical remote repo:

```text
npm run contracts:check
npm run contract:usage
npm run contract:backend-drift
npm run contract:lifecycle
npm run validate:contracts
npm run build
```

Backend tests:

```text
cd backend && .venv/bin/python -m pytest
```

## 12. Exact Results

```text
npm run contracts:check: pass
  total page routes: 152
  total release registry routes: 152
  page contracts found: 152
  missing page contracts: 0
  production-visible routes without full contracts: 0

npm run contract:usage: pass
  warnings: 3
  errors: 0

npm run contract:backend-drift: pass
  API contract files: 6
  backend API files: 49
  Next BFF route files: 552
  frontend service files: 96
  warnings: 0
  errors: 0

npm run contract:lifecycle: pass
  lifecycle contract files: 6
  backend files scanned: 506
  warnings: 0
  errors: 0

npm run validate:contracts: pass

npm run build: pass
  validate:contracts: pass
  encoding:guard: pass, 0 errors
  backend:boundary:enforce: pass
  next build: pass

cd backend && .venv/bin/python -m pytest: pass
  280 passed
  7 skipped
  4 warnings
```

Final P0 status:

```text
contract:backend-drift errors: 0
contract:lifecycle errors: 0
validate:contracts: PASS
build: PASS
backend pytest: PASS
```
