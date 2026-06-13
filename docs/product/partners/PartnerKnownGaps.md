# Partner / Ownership Known Gaps

<!-- source-of-truth-standard: contract overrides markdown -->

## P1 Before First Customer

| gap | current state | target state | removal condition |
| --- | --- | --- | --- |
| Temporary Next fallbacks | Partner and ownership routes still report temporary fallbacks/deprecated wrappers in proxy coverage. | Production uses FastAPI canonical path without TS fallback for migrated partner/ownership flows. | Staging E2E smoke passes with `FASTAPI_BASE_URL`; fallback headers removed or disabled. |
| Ownership workflow subroutes | Approve/reject/cancel/reverse/history/impact wrappers remain TS/deprecated. | Python endpoint or explicit replacement workflow. | Python tests + ownership workflow E2E pass. |
| Current ownership completeness scoring | UI derives warnings from available projection rows. | Backend exposes canonical company ownership completeness summary. | FastAPI current ownership response includes total share/vote/profit and blocking state. |
| Single-owner exit deep validation | Business rule is documented and UI-guided; backend depth depends on current transaction service coverage. | Python ownership service blocks ownerless company in all paths. | Backend tests cover single-owner exit blocking. |
| Correction/reversal product flow | Action is documented and routed, but subroute workflow remains P1. | Auditable correction/reversal operation fully Python-backed. | Correction/reversal E2E and current ownership rebuild pass. |

## P2 After Pilot

| gap | current state | target state |
| --- | --- | --- |
| Accounting reconciliation | Capital payment/collection reconciliation is outside Partners. | Accounting domain links partner commitments and payments. |
| Advanced privilege model | Privilege/control flags are supported at product summary level. | Multi-class shares, certificate/register book and board nomination details become structured domain models. |
| Beneficial ownership depth | Basic beneficial owner fields exist. | Complex UBO chain modeling and compliance reports. |
| Document requirements | Document slots are visible but not fully configurable by operation/company type. | Backend readiness config defines required documents per ownership transaction. |
| Generated client adoption | `companyService` still wraps BFF routes. | Partner/ownership service methods use generated OpenAPI client adapter end to end. |
| Automated E2E | Checklist exists; Playwright spec is not required in CI. | `tests/e2e/partners-ownership.spec.ts` runs in staging/CI. |

## Non-Gaps / Intentional Boundaries

- Company capital increase is owned by Companies/Capital.
- Partner card edit does not change ownership rights.
- Representative authority is not managed in Partners.
- Master person/legal entity management remains a separate identity/master-data concern.
- Share transfer/exit/correction are transaction flows, not table-cell edits.
