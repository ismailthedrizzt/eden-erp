# Release Candidate Preparation

<!-- source-of-truth-standard: contract overrides markdown -->

Date: 2026-06-06
Environment: Remote server + local PostgreSQL/local DB; FastAPI canonical backend; Next.js UI/BFF/proxy; local document storage; release registry enabled.
Test user / role: Manual field tester: business user / admin-capable tester unless scenario says otherwise.

Standard finding fields: tested module, expected behavior, actual behavior, result, priority, recommended fix.


## Entry Criteria
- Field test A scope has no open P0.
- The 20 core flows are `ge?ti` or `k?smen ge?ti`.
- Release registry check passes.
- Auth, DB target guard and document media security have no open blocker.
- User-facing errors are business-safe.

## Required Evidence
| Evidence | Expected behavior | Actual behavior | Result | Priority | Recommended fix |
| --- | --- | --- | --- | --- | --- |
| Manual findings register | All findings classified. | TBD | TBD | TBD | TBD |
| P0/P1/P2 risk register | No open P0 for RC. | TBD | TBD | TBD | TBD |
| Release registry | Only approved surface visible. | TBD | TBD | TBD | TBD |
| Build/test baseline | Cleanup batch commands recorded. | TBD | TBD | TBD | TBD |
| Known limitations | Communicated as scope notes. | TBD | TBD | TBD | TBD |

## RC Decision
Use `docs/field-test/FieldTestReleaseCandidateDecision.md`. If P0 exists, decision is `NOT_READY`. If no P0 but many P1 in core flow, decision is `FIX_BEFORE_RELEASE_CANDIDATE`.
