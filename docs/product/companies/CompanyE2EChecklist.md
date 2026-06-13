# Company E2E Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

Playwright is not added as a hard dependency in this pass. Until the test runner is introduced, this checklist is the regression gate for company product hardening.

## Smoke Setup

- `FASTAPI_BASE_URL` points to the FastAPI backend.
- Test user has company view/edit/lifecycle permissions.
- Tenant contains:
  - one draft company,
  - one active company with public/registry data,
  - one active company with current ownership totaling 100%,
  - one active representative authority,
  - one active branch with organization/facility links.

## E2E Cases

| case | expected result |
| --- | --- |
| Company list opens | Server-side pagination loads, status widgets render, no technical error shown. |
| Draft create | `+ Ekle` opens create form, draft notice is visible, save creates draft. |
| Company opening | Draft detail shows Company Opening, official opening completes and status becomes active. |
| Locked field helper | Active company trade name/address/capital/NACE fields are locked and explain the correct wizard. |
| OPERATION_CONTROLLED_FIELDS | Direct active PATCH of official fields returns field errors and business-language toast. |
| Title change | Precheck opens, old/new summary is shown, no-op is blocked, completion refreshes detail. |
| Address change | Turkey address requires city/district, completion refreshes address and history. |
| Public registration update | VKN is not changed, at least one public/registry field must change. |
| NACE change | Primary NACE is required, duplicate NACE is rejected, activity subject changes redirect to the correct wizard. |
| Capital increase precheck | Missing ownership blocks; valid 100% ownership allows wizard. |
| Capital increase completion | Company capital and ownership transactions update. |
| Branch opening | Active company can start branch opening; branch appears in branch list. |
| Branch closing | Active branch closing shows impact analysis and closes branch after confirmation. |
| Liquidation precheck | Open branches/authorities/tasks appear as blocking or warning reasons. |
| Deregistration precheck | Open branch or active authority blocks final deregistration. |
| Product readiness panel | Detail shows lifecycle, opening, capital, ownership, representative, branch, public/registration and document signals. |

## Future Playwright Spec

Target file when Playwright is introduced:

- `tests/e2e/companies.spec.ts`

Recommended tags:

- `@company`
- `@field-control`
- `@official-change`
- `@capital`
- `@branch`
- `@lifecycle`

## Manual Evidence

For each release candidate, capture:

- company list screenshot,
- draft detail screenshot,
- active detail with readiness panel,
- locked field helper screenshot,
- one completed official operation toast,
- one failed precheck/business warning,
- history/audit tab after operation.
