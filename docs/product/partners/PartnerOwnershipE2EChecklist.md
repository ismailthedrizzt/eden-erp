# Partner Ownership E2E Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

Playwright is not wired as a required productization script yet. This checklist is the current E2E/regression gate for `Ortaklarimiz`; it can be converted to `tests/e2e/partners-ownership.spec.ts` when the authenticated staging fixture is ready.

## Required Seed Data

- active company with committed capital,
- draft partner,
- active partner A,
- active partner B,
- current ownership totaling 100%,
- company with single active owner,
- capital increase test company,
- ownership transaction suitable for correction/reversal,
- user with partner/ownership operation permission.

## Checklist

1. Open `/app/sirket/companies/partners`.
2. Verify list uses server-side pagination and does not full-load all partners.
3. Verify list columns show status, partner name, company, current share/vote/profit/capital, share units, privilege/control, last transaction and warnings.
4. Use `+ Ekle`.
5. Verify draft notice explains that rights are created by ownership transactions.
6. Create a partner card draft.
7. Open the draft detail.
8. Verify product summary panel says draft card has no rights.
9. Verify Initial Partnership Entry is available.
10. Verify Share Transfer and Ownership Exit are not presented as draft card edit operations.
11. Complete Initial Partnership Entry.
12. Verify partner becomes active.
13. Verify current ownership values update in list and detail.
14. Open active partner.
15. Verify share/vote/profit/capital fields are read-only or operation-controlled.
16. Verify field helper points to Initial Partnership Entry, Share Transfer, Capital Increase or Correction.
17. Start Share Transfer.
18. Verify source/target partner choices are same-company scoped.
19. Enter a valid transfer amount.
20. Verify before/after table and total share check.
21. Complete transfer.
22. Verify current ownership changes for both partners.
23. Start Ownership Exit for an active partner.
24. Verify share destination/distribution is required.
25. Try single-owner exit without replacement plan.
26. Verify blocking message explains that the company cannot be left ownerless.
27. Complete a valid exit.
28. Verify exiting partner becomes passive and cannot be hard-deleted as a normal active record.
29. Start Hak / Imtiyaz Degisikligi.
30. Verify old/new values and total effect are visible.
31. Start Correction/Reversal where test data supports it.
32. Verify reason is required and current ownership validity is checked.
33. Complete Companies Capital Increase scenario.
34. Return to partner detail and verify capital increase impact.
35. Verify audit/history appears in the history tab.
36. Verify user never sees raw DB/stack errors.

## API/Contract Checks

- `GET /api/v1/partners`
- `POST /api/v1/partners`
- `GET /api/v1/partners/{partner_id}`
- `PATCH /api/v1/partners/{partner_id}`
- `DELETE /api/v1/partners/{partner_id}`
- `GET /api/v1/companies/{company_id}/current-ownership`
- `POST /api/v1/ownership/transactions`

Each route should have:

- auth/tenant scope,
- permission/readiness guard where relevant,
- field-control guard for card PATCH,
- transaction history/audit/outbox behavior where relevant,
- Next BFF proxy path,
- OpenAPI schema coverage.
