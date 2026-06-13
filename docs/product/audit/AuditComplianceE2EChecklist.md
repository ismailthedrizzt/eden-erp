# Audit Compliance E2E Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

- Audit list opens for authorized audit viewer.
- Normal user without `audit.view` cannot access audit admin data.
- Default date range limits the initial result set.
- User/module/action/result/severity filters work.
- Entity type/id filter opens record-specific audit view.
- Audit detail drawer opens from a row.
- Old/new values are masked.
- Request ID can be copied.
- Operation and process links are visible when ids exist.
- Permission denied audit appears after a real API attempt.
- UI eligibility checks do not create audit records.
- Export button stays disabled until `audit.export` is implemented.
- Record detail audit timeline can fetch by entity type/id.
- Technical errors are not shown to the user.

Seed data:

- Company address change audit.
- Representative authority audit.
- Ownership transfer audit.
- Process approval audit.
- Permission denied audit.
- Failed operation/system warning audit.
