# Representative Authority E2E Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

Use this checklist for manual or Playwright-backed verification after staging data is available.

## Test Data

- active company,
- active branch,
- closed branch,
- active organization unit,
- active facility/location,
- draft representative,
- active representative with current authority,
- representative with suspended authority,
- representative with terminated/expired authority.

## Checklist

- [ ] `Temsilcilerimiz` list opens without technical errors.
- [ ] `+ Ekle` creates a representative card draft.
- [ ] Draft notice explains that authority, signature, limit and scope are separate transactions.
- [ ] Authority fields are locked in card edit.
- [ ] Locked helper suggests Representation Start, Scope Change or Limit Change.
- [ ] Representation Start works for a draft card.
- [ ] Company-wide scope works and clears branch/unit/facility targets.
- [ ] Branch scope works for active branches.
- [ ] Closed branch scope is blocked.
- [ ] Organization unit scope works.
- [ ] Facility/location scope works.
- [ ] Negative limits are blocked.
- [ ] Limit with missing currency is blocked.
- [ ] Joint signature and alone approval conflict is blocked.
- [ ] Limit Change shows old/new values and updates current authority.
- [ ] Scope Change shows old/new scope and updates current authority.
- [ ] Suspension changes authority status to suspended without confusing card status.
- [ ] Resume/Renew changes authority status back to active.
- [ ] Termination changes authority status to terminated.
- [ ] Duplicate representative card is blocked or existing card is suggested.
- [ ] Authority status filter works.
- [ ] Branch filter can include company-wide authorities.
- [ ] Authority history/audit is visible where data exists.
- [ ] Technical backend errors are normalized into business-language messages.

## Suggested Playwright Spec

Create `tests/e2e/representatives-authority.spec.ts` when authenticated staging fixtures are available.

Candidate tests:

- representative draft create,
- authority field lock helper,
- representation start,
- branch scope,
- closed branch blocked,
- organization scope,
- facility scope,
- limit change,
- scope change,
- suspend,
- resume,
- terminate,
- authority status filter,
- branch filter with include company-wide.
