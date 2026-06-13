# Integrity Migration

Current role: TypeScript integrity checks provide cross-domain consistency prechecks.

Target role: Python integrity services under `backend/app/domains/**` or `backend/app/services/**`.

Temporary allowed use:
- Keep current operation prechecks and Action Guide eligibility consistent.
- Use checks as migration contract for Python implementation.

Not allowed:
- Do not create new long-lived TS-only integrity rules.
- Do not mix permission decisions with data consistency decisions.

Priority: P1, with branch closing and capital increase checks pulled forward as needed for P0 operations.
