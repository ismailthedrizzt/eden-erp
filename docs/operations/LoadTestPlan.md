# Load Test Plan

## Amac

Pilot-to-production gecisinde Eden ERP'nin API, DB, worker and BFF davranisini yuk altinda olcmek.

## Hazirlik

- Staging ortaminda production benzeri DB, pool, workers and secrets.
- Fixture tenant, users, company ids, documents, service requests, reports.
- `scripts/load-test.js` smoke scenarios ready.
- Production target disinda calistirma; `ALLOW_PRODUCTION_LOAD_TEST=true` sadece onayli maintenance window'da.

## Scenarios

- login/session.
- dashboard.
- company list/detail.
- global search.
- action center.
- audit list.
- reporting dashboard.
- document upload/download.
- bank reconciliation list.
- service request create.
- task transition.
- webhook delivery batch.
- outbox backlog.
- notification/email batch.

## Targets

- API p95: <= 800ms for hot reads.
- API error rate: < 1% non-2xx excluding expected auth/scope negative tests.
- DB connections within budget.
- CPU/memory below sustained saturation.
- Worker backlog recovers within configured SLA.
- Outbox delivery rate keeps up with generated events.

## Commands

```bash
npm run load:test:scenarios
npm run load:test:platform-smoke
npm run load:test:company-list
```

Use `LOAD_TEST_BASE_URL`, `LOAD_TEST_AUTH_TOKEN`, `LOAD_TEST_TENANT_ID`, `LOAD_TEST_COMPANY_ID` for authenticated scenarios.

## Exit Criteria

- No P0 security/scope leak under load.
- No DB pool exhaustion.
- No unbounded worker backlog.
- Query plan red flags reviewed.
