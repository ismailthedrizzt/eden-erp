# Field Test Cleanup Plan

Date: 2026-06-06
Environment: Remote server + local PostgreSQL/local DB; FastAPI canonical backend; Next.js UI/BFF/proxy; local document storage; release registry enabled.
Test user / role: Manual field tester: business user / admin-capable tester unless scenario says otherwise.

Standard finding fields: tested module, expected behavior, actual behavior, result, priority, recommended fix.


## Cleanup Order
1. P0 Auth / DB / Release Guard
2. P0 Lifecycle / Operation data integrity
3. P0 Permission / Scope / Tenant
4. P0 Document media/security
5. P1 Wizard / DocumentSlot / Audit
6. P1 UI template consistency
7. P1 Action Center / Search / Reporting
8. P2 UX polish

## Cleanup Sprint Table
| Issue ID | Module / files | Expected behavior | Actual behavior | Result | Priority | Recommended solution | Risk | Test scenario | Retest step | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FT-0001 | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | a??k |

## Batch Verification Commands
After each cleanup batch run: `npm run typecheck`, `npm run build`, `npm run release:check`, `npm run env:safety`, `npm run db:target:check`, `npm run migration:status`, `npm run boundaries:check`, `npm run openapi:drift`; backend: `cd backend && python -m ruff check .`, `cd backend && python -m mypy app`, `cd backend && python -m pytest`.
