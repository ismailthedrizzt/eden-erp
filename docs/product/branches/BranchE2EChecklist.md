# Branch E2E Checklist

## Preconditions

Seed or prepare:

- active company,
- active official branch,
- closed branch,
- organization unit linked to a branch,
- facility linked to a branch,
- branch-scoped representative authority,
- company-wide representative authority.

## E2E Cases

- Branch list opens.
- Server-side pagination/search/sort works.
- Company, branch type, official/operational and city filters work.
- Free branch POST/create is rejected with `USE_BRANCH_OPENING_WIZARD`.
- `Yeni Sube Ac` opens Branch Opening flow or routes to company detail operation.
- Branch detail opens and shows company, organization unit and facility links.
- Branch card allowed fields update successfully.
- Branch official fields show locked helper text.
- Branch official fields are rejected by backend PATCH.
- Branch Opening official branch completes.
- Branch Opening operation point completes.
- Branch Closing with unit deactivate completes.
- Branch Closing with unit reassign validates same-company/cycle rules.
- Branch Closing with facility reuse completes.
- Active representative authority impact appears in precheck/detail.
- Closed branch cannot be closed again.
- Branch document update routes through official document update operation.
- Company branch summary updates after opening/closing.
- No technical database/auth error is shown to the user.

## Suggested Playwright File

`tests/e2e/branches.spec.ts`

Recommended test blocks:

- `branch list and filters`
- `branch free create forbidden`
- `branch detail hydration`
- `branch card update allowed fields`
- `branch official field locking`
- `branch opening official`
- `branch opening operation point`
- `branch closing impact actions`
- `branch summary refresh`

## Manual Smoke

1. Open `Subelerimiz`.
2. Verify no free branch create exists.
3. Open active branch detail.
4. Confirm missing facility/unit warnings if links are absent.
5. Try to edit `branch_short_name`, `phone`, `email`.
6. Try to submit an official field through dev tooling/API and verify `OPERATION_CONTROLLED_FIELDS`.
7. Start Branch Closing and inspect impact analysis.
8. Open linked Organization, Facility and Representatives pages from detail links.
