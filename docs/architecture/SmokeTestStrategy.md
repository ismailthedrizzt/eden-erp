# Smoke Test Strategy

<!-- source-of-truth-standard: contract overrides markdown -->

Smoke tests prove that deployed components can talk to each other before deeper QA.

## Script

```bash
npm run smoke:test
npm run smoke:test:dry
```

Environment:

- `SMOKE_BASE_URL`
- `SMOKE_FASTAPI_URL`
- `SMOKE_TOKEN`
- `SMOKE_TENANT_ID`
- `SMOKE_COMPANY_ID`

## Checks

- Next app boots.
- FastAPI `/health`.
- FastAPI `/api/v1/health`.
- Setup readiness.
- Companies list.
- Company detail when `SMOKE_COMPANY_ID` exists.
- Branch list.
- Action center counts.

## Optional Staging Checks

- Action Guide query.
- Outbox dispatch dry run or one-shot worker in controlled staging.
- Audit write/read test with seeded tenant.
