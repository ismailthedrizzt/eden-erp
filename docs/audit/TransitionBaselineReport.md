# Transition Baseline Report

Date: 2026-06-06
Branch: `main`
Commit: `9b1b0297ce4171cd85d0154ed4bd9a2ebc2e8d7d`
Working environment: remote server `/home/edengrup-app1/htdocs/app1.edengrup.com`
Runtime reality: Next.js UI/BFF, FastAPI canonical backend, local PostgreSQL on `localhost:5432/app1db`

## Scope

This is a freeze and audit baseline. No large behavior change, refactor, cleanup or deletion was performed. The purpose is to record the current transition state before Supabase/Vercel residue cleanup and architecture hardening.

## Baseline Commands

| Command | Result | Notes | Priority |
| --- | --- | --- | --- |
| `npm run typecheck` | PASS | Shared TypeScript passed; targeted check reported no changed TS files. | - |
| `npm run build` | PASS | Build compiled and prerendered 359 app routes. Existing React hook/img warnings remain. Webpack pack cache snapshot warnings remain. | P2 |
| `npm run release:check` | PASS | 140 registry routes, 140 page routes. | - |
| `npm run env:safety` | PASS | Release environment safety check passed. | - |
| `npm run migration:status` | PASS with warnings | 502 route files, 403 explicit migration headers, 99 missing headers, 0 P0 missing, 0 proxy boundary violations. | P2 |
| `npm run boundaries:check` | PASS with warnings | 0 critical errors, 13 TS backend-core helper import warnings. | P1 |
| `npm run openapi:drift` | PASS | OpenAPI export/generate completed; no drift. | - |
| `cd backend && python -m ruff check .` | FAIL | Remote shell has no `python` executable. Canonical scripts use `.venv/bin/python`. | P2 |
| `cd backend && python -m mypy app` | FAIL | Remote shell has no `python` executable. Canonical scripts use `.venv/bin/python`. | P2 |
| `cd backend && python -m pytest` | FAIL | Remote shell has no `python` executable. Canonical scripts use `.venv/bin/python`. | P2 |
| `npm run backend:lint` | FAIL | `.venv/bin/python -m ruff check .` found 93 errors, mostly E501/I001 in existing backend files. | P1 |
| `npm run backend:typecheck` | FAIL | `backend/app/api/v1/accounting.py:596` ApiSuccess type mismatch. | P1 |
| `npm run backend:test` | FAIL | 223 passed, 1 failed: `test_deep_health_missing_database_config_returns_error`. | P1 |

## Findings

- The current release runtime is coherent enough to build and typecheck on the Next side.
- Release route registry, env safety and DB target safety checks pass.
- Backend quality baseline is not green: ruff, mypy and pytest have known failures.
- `python` is not globally available on the remote server; backend commands must use `backend/.venv/bin/python` or package scripts.
- Supabase/Vercel residue remains in config compatibility fields, legacy TS modules, documentation, and dependencies.
- Next app API routes are mostly proxy/BFF routes; direct frontend DB/Supabase access is no longer detected by the migration guard, but legacy TS service modules still exist.

## Risk Summary

| Priority | Risk | Impact | Next action |
| --- | --- | --- | --- |
| P0 | None confirmed in this baseline | No immediate release-blocking security/data isolation issue was confirmed by the executed checks. | Keep release/env/db guards mandatory. |
| P1 | Backend lint/type/test not green | Future refactors can hide regressions behind existing failures. | Fix accounting mypy, observability health test, and ruff policy debt. |
| P1 | Supabase runtime residue in TS modules | A future change can accidentally revive direct Supabase paths. | Inventory and delete/migrate in a controlled cleanup phase. |
| P1 | 13 import-boundary warnings | Frontend/shared code still imports backend-core helpers. | Convert to generated/shared contracts or FastAPI calls. |
| P2 | Global `python` absent | Manual backend commands fail unless venv scripts are used. | Document `.venv/bin/python` as the canonical remote command. |
| P2 | Old Vercel/Supabase docs | Developer instructions can contradict current remote/local DB reality. | Update docs after code cleanup plan is approved. |

## Freeze Note

- This phase did not perform a large behavior change.
- Subsequent phases must be executed in order and measured against this baseline.
- If the first correction is not Supabase/Vercel cleanup, the reason must be written in the related audit/change report.
- At the end of every phase, rerun build/typecheck/backend tests and compare results with this baseline.

## Success Criteria Status

1. Baseline reports created: done.
2. Supabase/Vercel residue inventoried: done in `CurrentSupabaseVercelResidueInventory.md`.
3. Auth state documented: done in `CurrentAuthStrategySnapshot.md`.
4. Local DB state documented: done in `CurrentDatabaseTargetSafetySnapshot.md`.
5. Runtime topology documented: done in `CurrentRuntimeTopologySnapshot.md`.
6. P0/P1/P2 risk register updated: done in `CurrentP0P1P2RiskRegister.md`.
7. Build/test baseline captured: done.
8. No large behavior change: done.
