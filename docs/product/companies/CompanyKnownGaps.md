# Company Known Gaps

## P1 Before First Customer

| gap | current state | target state | removal condition |
| --- | --- | --- | --- |
| Temporary Next fallbacks | Company routes still report temporary fallback in proxy coverage. | Production uses FastAPI canonical path without TS fallback for migrated company flows. | Staging E2E smoke passes with `FASTAPI_BASE_URL`; fallback headers removed or disabled. |
| Lifecycle deep FastAPI coverage | Opening/liquidation/deregistration context routes still have fallback debt in proxy matrix. | Full Python lifecycle endpoints or explicit replacement flow. | Python tests + company lifecycle E2E pass. |
| Capital decrease mutation | Capital decrease is precheck/preparation level. | Full official capital decrease operation. | Domain model, audit/outbox, ownership impact and tests complete. |
| Document requirements | Required document rules are partially static in UI. | Configurable per company type/operation. | Module readiness config and backend validation agree. |
| Public registration completeness | Product readiness panel uses basic required-field heuristic. | Backend read model exposes canonical completeness score. | FastAPI detail response includes `public_registration_summary`. |

## P2 After Pilot

| gap | current state | target state |
| --- | --- | --- |
| Accounting reconciliation | Capital payment/accounting reconciliation is outside company module. | Accounting domain links paid capital and payment evidence. |
| Advanced dashboards | Company dashboard widget is preliminary. | Production dashboard includes lifecycle, risk, missing docs, pending work and branch/ownership KPIs. |
| Generated client adoption | `companyService` still uses stable BFF wrapper. | Company service methods are typed end-to-end through generated OpenAPI client adapter. |
| Action Guide resolver | Intent matching remains TS bridge. | Python Action Guide resolver is canonical. |
| E2E automation | Checklist exists; Playwright not wired as required script. | `tests/e2e/companies.spec.ts` runs in CI/staging. |

## Non-Gaps / Intentional Boundaries

- Ownership rights are managed in Partners/Ownership, not Company card edit.
- Representative authority is managed in Representatives, not Company card edit.
- Branch detail management happens in Branches, not Company detail.
- Organization staffing and facility detail operations remain separate modules.
