# Contract Enforcement Drift Audit Report

Date: 2026-06-12

## 1. Contract Usage Guard Results

Added `scripts/check-contract-usage-guard.js` and wired it into `npm run validate:contracts`.

Current local result:

```text
npm run contract:usage
pages scanned: 15
registry entries: 152
warnings: 4
errors: 50
```

The guard now fails on:

- `void SomeContract` fake usage.
- Generated placeholder contracts marked as `contract_ready`.
- Real `SmartDataTable` pages using ID-only generated list contracts.
- Local columns arrays that are not derived from list contracts.
- Local form fields/tabs that are not derived from form contracts.
- Lifecycle UI without lifecycle/wizard contract coverage.
- Page service calls not listed in API contracts.

## 2. Pages That Imported Contracts But Did Not Use Them

The direct fake usage pattern was removed from the currently detected app pages:

- `app/app/profil/page.tsx`
- `app/app/sistem/temalar/page.tsx`
- `app/app/sistem/lisanslar/page.tsx`
- `app/app/sistem/kurulum/page.tsx`
- `app/app/aboneligim/page.tsx`
- `app/app/sirket/teskilat/page.tsx`
- `app/app/sirket/tesisler/page.tsx`
- `app/app/sirket/companies/stakeholders/page.tsx`
- `app/app/sirket/companies/representatives/page.tsx`
- `app/app/sirket/companies/page.tsx`
- `app/app/sirket/companies/branches/page.tsx`
- `app/app/sirket/companies/partners/page.tsx`
- `app/app/satis/sozlesmeler/page.tsx`

The guard now prevents this pattern from being reintroduced.

## 3. Pages With Local Columns Despite List Contracts

Current blocking findings include:

- `/app/sirket/companies/stakeholders`
- `/app/sirket/tesisler`
- `/app/sirket/teskilat`
- `/app/sistem/lisanslar`

These pages have real list UI but generated ID-only list contracts or local columns. They need real list contracts and `SmartDataTable` columns derived from those contracts.

## 4. Pages With Local Forms Despite Form Contracts

Current blocking findings include:

- `/app/ik/calisanlar`
- `/app/sirket/companies`
- `/app/sirket/companies/branches`
- `/app/sirket/companies/partners`
- `/app/sirket/companies/representatives`
- `/app/sirket/companies/stakeholders`
- `/app/sirket/tesisler`
- `/app/sirket/teskilat`

These pages must move field/tab definitions into form contracts or explicitly map renderer-only adapters from contract field IDs.

## 5. Pages With Lifecycle Actions Not Contract-Covered

Current blocking findings include:

- `/app/sirket/companies/stakeholders`

Warnings also indicate lifecycle-like status field writes that must be verified by the backend lifecycle guard:

- `/app/ik/calisanlar`
- `/app/sirket/companies`
- `/app/sirket/companies/partners`
- `/app/sirket/tesisler`

## 6. API Service To BFF To FastAPI Mapping Results

Added `scripts/check-backend-contract-drift.js` and wired it into `npm run validate:contracts`.

Current local result:

```text
npm run contract:backend-drift
API contract files: 6
backend API files: 7
Next BFF route files: 43
frontend service files: 5
errors: 64
```

The guard now requires critical API contracts to declare:

- `frontendPath`
- `bffPath`
- `fastApiPath`
- `serviceFunction`
- backend request/response schema references where applicable

Current blockers are mostly old-style API contracts that only declare `endpointPath`.

## 7. API Permission Drift Findings

The guard now compares contract authorization to backend `ensure_permission(...)` when the corresponding FastAPI route exists.

Known existing drift remains:

- HR employee API contracts use canonical values such as `hr.employee.read`.
- Backend implementation is absent from the local code tree or uses different permission names in deployments.

This must be resolved by choosing canonical permission names and updating backend/frontend/contracts, or by adding narrowly scoped permission aliases with owner and expiry.

## 8. Backend Schema Drift Findings

The guard now rejects uncontrolled `ConfigDict(extra="allow")` for contract-ready backend request schemas when the schema is referenced by API contracts.

Local HR FastAPI files are not present under `backend/app/api/v1`, so schema drift cannot be fully validated locally for HR until the backend route files are restored into the repo.

## 9. Lifecycle Operation Record Findings

Added `scripts/check-lifecycle-operation-guard.js` and wired it into `npm run validate:contracts`.

Current local result:

```text
npm run contract:lifecycle
lifecycle contract files: 6
backend files scanned: 57
errors: 7
```

Blocking findings:

- `contracts/lifecycle/hr/employee.lifecycle.contract.ts` requires operation records but no insert into `hr_employee_lifecycle_events` exists locally.
- `contracts/lifecycle/system/theme-management.lifecycle.contract.ts` requires operation records but no insert into `workspace_theme_lifecycle_events` exists locally.
- Some lifecycle contracts point to transaction/event tables while backend inserts are generic or table names differ.
- `backend/app/domains/partners/service.py` mutates lifecycle/status fields without a visible paired transaction/event insert in the same service path.

## 10. Response Schema Findings

The backend drift guard now fails critical endpoints that use only generic response schemas such as:

- `ApiSuccess[dict[str, Any]]`
- `dict[str, Any]`

Typed business DTOs are required for contract-ready/release endpoints.

## 11. Fixed Violations

Fixed in this pass:

- Added `contract:usage`, `contract:backend-drift`, and `contract:lifecycle` scripts.
- Wired all three into `validate:contracts`.
- Removed existing `void ...Contract` fake usage lines from detected app pages.
- Extended `EdenApiContract` with strict path/schema/auth/lifecycle fields.
- Extended page contract registry typing with:
  - `contractDepth`
  - `contractSource`
  - `businessCriticality`
- Strengthened `check-contract-standardization.js` to reject generated placeholder contracts marked as `contract_ready`.

## 12. Remaining Exceptions With Owner And Expiry

No broad exceptions were added.

`contracts/allowlists/contract-exceptions.ts` remains empty.

## 13. Commands Run

```text
npm run contract:usage
npm run contract:backend-drift
npm run contract:lifecycle
```

## 14. Exact Results

Current result is intentionally failing because the new guards expose real P0 drift:

- `contract:usage`: 50 errors
- `contract:backend-drift`: 64 errors
- `contract:lifecycle`: 7 errors
- `contracts:check`: 7 errors for generated placeholder contracts marked `contract_ready`

`npm run validate:contracts` will fail until these violations are resolved.

## 15. Remaining P0/P1/P2 Backlog

### P0

- Convert real list pages with generated ID-only list contracts to real list contracts.
- Move real form field/tab definitions into form contracts for core company/personnel/theme-related pages.
- Add API contract path chain fields for critical APIs.
- Restore or implement local FastAPI HR route files so API drift can be validated against source.
- Align lifecycle contracts with backend operation/event tables.
- Enforce non-null operation/process linkage for lifecycle operation records.

### P1

- Add permission alias contract only where legacy permissions are still unavoidable.
- Add typed response DTOs for critical backend endpoints currently returning generic dict payloads.
- Add frontend test files that exercise guard failures on fixture pages.

### P2

- Replace the current static scanner internals with TypeScript compiler AST traversal for richer diagnostics.
- Add source maps from page registry to exact contract symbols for friendlier error output.
