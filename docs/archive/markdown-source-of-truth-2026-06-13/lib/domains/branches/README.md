# Branch Domain

Branch Domain owns company branch records and branch opening/closing/document update operations.

A branch is not a separate legal company, not an organization unit and not a facility. Branch opening may request Organization and Facility Domain services, but it does not own their internal lifecycle.

## Owns

- `company_branches`
- Branch opening/closing state on branch records
- Branch document update operation metadata

## Does Not Own

- Company legal identity
- Organization unit hierarchy
- Facility physical lifecycle
- Representative authority scope
- Employee assignments

## Service Functions

- `getBranchById`
- `listBranches`
- `createBranch`
- `closeBranch`
- `updateBranchCard`
- `getBranchSummaryForCompany`
- `getBranchesForCompany`
- `assertBranchBelongsToCompany`
- `assertBranchActive`
- `buildBranchDisplayLabel`
- `getBranchRepresentativeSummary`

## Cross-Domain Rules

- Branch opening can call Organization Domain Service to create a branch organization unit.
- Branch opening can call Facility Domain Service to create or link a physical location.
- Branch closing must not update employees or representative authorities directly; it should expose impact through Integrity Guard and Action Center.

## Events

- `company.branch_opened`
- `company.branch_closed`
- `company.branch_documents_updated`
- `company.branch_updated`
