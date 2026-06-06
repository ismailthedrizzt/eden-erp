# Current P0/P1/P2 Risk Register

Date: 2026-06-06
Branch: `main`
Commit: `9b1b0297ce4171cd85d0154ed4bd9a2ebc2e8d7d`
Working environment: remote server release runtime

## Tested Commands

Full command baseline is in `TransitionBaselineReport.md`.

## Risk Register

| ID | Priority | Area | Risk | Evidence | Current status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| TF-P0-001 | P0 | Release safety | Confirmed release auth bypass | `npm run env:safety` passed; no confirmed bypass. | Not present | Keep guard mandatory. |
| TF-P0-002 | P0 | DB target | Wrong DB target mutation | `npm run db:target:check` passed against `localhost:5432/app1db`. | Not present | Keep guard mandatory before migration/seed/reset. |
| TF-P1-001 | P1 | Backend tests | Backend test suite not green | `npm run backend:test`: 223 passed, 1 failed. | Open | Fix health test or health config contract. |
| TF-P1-002 | P1 | Backend typing | Backend mypy not green | `backend/app/api/v1/accounting.py:596`. | Open | Fix `ApiSuccess` data typing. |
| TF-P1-003 | P1 | Backend lint | Ruff not green | 93 errors, mostly E501/I001. | Open | Decide lint policy and fix incrementally. |
| TF-P1-004 | P1 | Architecture boundary | TS backend-core helper imports remain | `boundaries:check`: 13 warnings. | Open | Move to shared/generated contracts or FastAPI. |
| TF-P1-005 | P1 | Supabase residue | Runtime-capable Supabase TS modules remain | `lib/supabase/*`, `lib/user-state/server.ts`, `lib/setup/**`, `lib/integrity/**`, etc. | Open | Controlled migration/delete phase. |
| TF-P1-006 | P1 | Storage | Supabase storage thumbnail/backfill utilities remain | `lib/documents/documentThumbnails.server.ts`, `documentThumbnailBackfill.server.ts`. | Open | Replace with local storage thumbnail service or remove. |
| TF-P1-007 | P1 | Auth | Direct FastAPI bearer auth still named/implemented as legacy Supabase JWT | `backend/app/core/security.py`. | Open | Define canonical direct API auth. |
| TF-P1-008 | P1 | Documentation | Current docs still instruct Supabase/Vercel workflows | `docs/AI_COLLABORATION_GUIDE.md`, `docs/release/**`. | Open | Rewrite current runbooks after this baseline. |
| TF-P1-009 | P1 | Workers | Live worker topology not confirmed | PM2 shows app/api only; worker modules exist. | Open | Decide and document live worker execution model. |
| TF-P2-001 | P2 | Tooling | Global `python` missing on remote host | exact `python -m ...` commands fail. | Open | Standardize on `backend/.venv/bin/python`. |
| TF-P2-002 | P2 | Migration headers | 99 route files missing migration headers, 0 P0 | `migration:status`. | Open | Reduce over time; no immediate blocker. |
| TF-P2-003 | P2 | Build warnings | Existing React hook/img warnings | `npm run build`. | Open | Address during frontend quality pass. |
| TF-P2-004 | P2 | Webpack cache warnings | Pack cache snapshot warnings during build | `npm run build`. | Open | Monitor; no build failure. |
| TF-P2-005 | P2 | Comments | Many proxy comments still say "DB and Supabase access belong to FastAPI" | residue scan. | Open | Wording cleanup after code cleanup. |

## Priority Definitions

- P0: confirmed live data/auth/isolation/security blocker.
- P1: real architectural/runtime debt that can cause regressions or revive old platform paths.
- P2: cleanup, clarity, tooling or warning-level issue.

## Next Phase Impact

Start with P1 items that reduce future regression risk:

1. Direct Supabase TS module removal/migration.
2. Auth strategy cleanup.
3. Backend test/type/lint green baseline.
4. Worker topology confirmation.
