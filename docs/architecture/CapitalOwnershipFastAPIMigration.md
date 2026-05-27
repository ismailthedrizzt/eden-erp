# Capital Increase + Ownership FastAPI Migration

Status: Step 5 implemented as the next core-backend migration slice.

## Migrated Endpoints

- `GET /api/v1/companies/{company_id}/capital-increases/precheck`
- `POST /api/v1/companies/{company_id}/capital-increases`
- `GET /api/v1/companies/{company_id}/current-ownership`
- `GET /api/v1/ownership/current?company_id=...`

The existing Next.js routes remain as BFF/proxy bridges. When `FASTAPI_BASE_URL` is set, they proxy to FastAPI. Without it, the marked TS fallback remains temporary migration infrastructure.

## Ownership Dependency

Capital Increase is not a plain company field update. It requires an active company, active partners, readable current ownership, total current share ratio equal to 100%, valid proportional/manual distribution, and ownership transaction records.

If partners/current ownership is unavailable, the backend returns a blocking business error instead of exposing database details.

## Distribution Rules

Proportional distribution keeps current share ratios and distributes the increase by current ownership.

Manual distribution must satisfy:

- all active partners are represented,
- no unknown partner is included,
- total distributed increase equals the requested increase,
- total new capital equals requested new capital,
- total new share ratio equals 100%,
- no partner receives a negative share/capital movement in a capital increase.

## Paid Capital Rule

Paid capital is separate from legal capital increase. By default, `paid_capital_amount` is not increased automatically. If `paid_amount` is explicitly sent, FastAPI applies it as a controlled update and records operation context. Accounting reconciliation remains a later Accounting Domain integration.

## Side Effects

The FastAPI operation writes, inside the transaction boundary:

- company committed capital update,
- partner capital/share state update,
- company capital increase transaction,
- ownership transaction rows,
- company lifecycle event,
- outbox events `company.capital_increased` and `ownership.transaction_completed`,
- audit best-effort record.

## Known Gaps

- DB integration tests need a seeded PostgreSQL/Supabase test database.
- Next.js legacy fallback should be removed after FastAPI deployment is standard.
- OpenAPI-generated frontend client is still pending.
- Capital decrease remains a later migration slice.
- Accounting/payment reconciliation is not part of this phase.
