# CRUD Wizard Lifecycle Compliance Report

Audit date: 2026-05-31

Goal: verify the architectural rule that CRUD edits safe card/profile/contact fields, while official/lifecycle/operational changes go through wizard/operation endpoints.

## Overall Assessment

| decision | status | evidence | risk |
| --- | --- | --- | --- |
| Add creates draft | partial | Company lifecycle tests and draft/opening flows exist; some non-core modules create active-looking MVP rows directly. | P1 |
| Card fields separate from operation fields | partial/compliant in core | `backend/app/policies/field_control.py`, guard tests for company/partner/representative. | P1 |
| Lifecycle/official operations use wizard/operation endpoints | partial/compliant in core | Company official changes, branch opening/closing, capital, HR entry/exit endpoints/components exist. | P1 |
| Operation-controlled fields rejected by normal PATCH | partial/compliant in core | Field-control registry and tests cover core areas; every Next fallback route still needs staging smoke. | P1 |

## Company

| check | status | evidence | priority |
| --- | --- | --- | --- |
| Company card draft creation | partial | company card CRUD and lifecycle/opening tests exist | P1 |
| Active company title/address/NACE/capital locked from normal edit | partial/compliant | field-control registry covers title, address, NACE, capital, public registry fields | P1 |
| Title change wizard | implemented | official-change title endpoints and UI wizard components | P1 |
| Address change wizard | implemented | official-change address endpoints | P1 |
| NACE/activity change wizard | implemented | NACE and activity-subject operation endpoints | P1 |
| Capital increase/decrease wizard | implemented | capital endpoints, precheck routes and tests | P1 |
| Liquidation/deregistration wizard/precheck | implemented | lifecycle context/complete endpoints and guards | P1 |

## Partner / Ownership

| check | status | evidence | priority |
| --- | --- | --- | --- |
| Partner card vs ownership rights separated | partial/compliant | ownership domain, current ownership projections, partner patch guard tests | P1 |
| Share/vote/profit/capital not changed by card PATCH | partial/compliant | field-control registry and partner patch guard tests | P1 |
| Initial partnership entry wizard/operation | implemented | ownership transaction endpoints and service tests | P1 |
| Share transfer / ownership exit transaction | implemented | ownership transactions, approval/reverse/cancel endpoints | P1 |
| Current ownership read model | implemented | projection modules and tests | P1 |

## Representative

| check | status | evidence | priority |
| --- | --- | --- | --- |
| Representative card vs authority separated | partial/compliant | representatives authority/scope modules and field-control registry | P1 |
| Authority fields blocked from normal PATCH | partial/compliant | representative authority validation and field-control tests | P1 |
| Authority start/limit/scope/suspend/terminate operation | implemented | representative authority transaction tests and API routes | P1 |
| Card status vs authority status separated | partial | registry distinguishes record/authority/effect/transaction status; UI smoke still needed | P1 |

## Branch

| check | status | evidence | priority |
| --- | --- | --- | --- |
| Branch not freely created outside policy | partial/compliant | branch opening validation tests, operation endpoints and field-control registry | P1 |
| Branch opening wizard | implemented | company official changes branch-opening precheck/route and wizard component | P1 |
| Branch closing wizard | implemented | branch-closing precheck/route and validation tests | P1 |
| Official branch fields blocked from card PATCH | partial/compliant | field-control registry covers official branch fields | P1 |
| Facility/organization links | partial | facility and organization domains exist; page smoke still needed | P1 |

## Other Domains

| domain | status | notes | priority |
| --- | --- | --- | --- |
| Accounting | partial | Reconciliation/import/export operations exist, but several Next routes still migrate-to-FastAPI. | P1 |
| HR | partial/compliant in employee lifecycle | Employee entry/exit wizard endpoints and tests exist; broader leave/timesheet operations need UI smoke. | P1 |
| Project/task | partial | Task transition operations exist; UI uses MVP/local forms in places. | P1 |
| Documents | partial | verify/reject/download routes exist; permission and signed URL smoke required. | P1 |
| Admin | partial | feature/module/outbox operations exist; strong role gating required. | P1 |

## Findings

- Core company lifecycle, ownership, representative authority and branch operations match the intended architecture at backend/service level.
- Field-control registry is substantial and explicit.
- Remaining concern is uniform enforcement across temporary Next fallback routes and non-core MVP UI forms.

## Risks

- P1: a Next fallback route could behave differently than FastAPI for a locked field.
- P1: local UI forms can offer operation-controlled inputs even if backend rejects them, creating confusing UX.
- P1: branch free-create must remain protected by operation policy in every route variant.

## Recommended Fixes

- Add route smoke tests that attempt locked-field PATCH on company/partner/representative/branch endpoints.
- Block live promotion for any page where operation-controlled fields are editable in a normal form.
- Remove temporary Next fallbacks for lifecycle operations after FastAPI staging verification.
- Add UI contract tests for wizard confirmation before mutation.

## P0/P1/P2 Priority

- P0: none confirmed by tests/build.
- P1: fallback parity tests, locked-field UI cleanup, branch create smoke.
- P2: extend canonical wizard pattern to non-core operational modules.

## Suggested Next Prompt

`Critical Operation Guard Smoke Tests ekle: company, partner, representative ve branch endpointlerinde locked-field PATCH, free branch create ve wizard confirmation bypass denemelerini test et.`
