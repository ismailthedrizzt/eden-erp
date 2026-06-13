# Platform Cleanup Phase 1 Report

## Metadata

| Field | Value |
| --- | --- |
| Date | 2026-06-06 |
| Branch | `main` |
| Baseline commit | `a82ff9b32b2688e5ea8fed8143f74ea76887127c` |
| Working environment | Remote server, `/home/edengrup-app1/htdocs/app1.edengrup.com` |
| Scope | Supabase/Vercel residue removal + local DB guard |

## Executive Result

This phase made no large behavior refactor. The current middleware, DB target guard, release env guard, package DB scripts and Next cache/image config were verified against the remote server + local PostgreSQL target architecture.

Low-risk documentation cleanup was applied so operational guides no longer present Supabase/Vercel as canonical. `lib/supabase/server.ts` was explicitly marked deprecated and its active imports remain inventory items for the next cleanup stage.

## Commands Tested

| Command | Result | Notes |
| --- | --- | --- |
| `npm run typecheck` | Pass | Targeted TypeScript check passed. |
| `npm run build` | Pass | Build completed without Supabase env crash; existing lint warnings remain. |
| `npm run release:check` | Pass | 140 registry routes, 140 page routes. |
| `npm run env:safety` | Pass | Env resolved as release and passed current release requirements. |
| `npm run db:target:check` | Pass | Env release, DB class release, `app1db` target. |
| `npm run migration:status` | Pass with warnings | 99 missing migration headers, 0 P0 missing headers, 0 temporary fallbacks. |
| `npm run boundaries:check` | Pass with warnings | 13 warnings, 0 critical errors. |
| `npm run openapi:drift` | Pass | OpenAPI export/generate completed with no diff. |
| `cd backend && python -m ruff check .` | Fail | 93 existing style/import/line-length errors. |
| `cd backend && python -m mypy app` | Fail | `app/api/v1/accounting.py:596` incompatible `ApiSuccess.data` type. |
| `cd backend && python -m pytest` | Fail | 223 passed, 1 failed: `test_deep_health_missing_database_config_returns_error`. |

## Phase Findings

| Area | Finding | Risk | Priority |
| --- | --- | --- | --- |
| Middleware | Supabase auth fallback no longer creates a Supabase client. Missing app session redirects pages to `/login`; APIs return `401 AUTH_REQUIRED`. | Low after verification. | P2 |
| Middleware legacy flag | `EDEN_ENABLE_LEGACY_SUPABASE_AUTH=true` does not enable fallback and is blocked in release safety. | Correct guard behavior. | - |
| Release safety | Release blocks login bypass, legacy API access, legacy Supabase auth, demo mode, release seed and release reset. | Missing env would block release instead of silently proceeding. | P0 guard |
| DB target guard | `scripts/check-database-target.js` protects release seed/reset and requires approved release migration. | Correct guard behavior. | P0 guard |
| Package scripts | Canonical scripts use `db:target:check`, `db:migrate:check`, `db:seed:check`, `db:reset:check` and `db:reset:development`. | Low. | P2 |
| Next config | Supabase image/storage allowlist is absent. API routes use network-only/no-store behavior. | Low. | P2 |
| Supabase adapter | `lib/supabase/server.ts` still exists for legacy imports and is deprecated. | Active imports can still call Supabase if code path is executed. | P1 |
| Release docs | Several release docs still named Supabase target checks. | Operator confusion. | P1 fixed in this phase |

## Negative Guard Cases

| Case | Expected | Status |
| --- | --- | --- |
| release + `EDEN_ENABLE_LEGACY_SUPABASE_AUTH=true` | Fail | Passed: release safety emitted forbidden legacy Supabase auth failure. |
| release + `EDEN_LOGIN_DISABLED=true` | Fail | Passed: release safety emitted forbidden login bypass failure. |
| release + `COMMAND_CONTEXT=seed` | Fail | Passed: DB guard blocked release seed/demo command. |
| release + `COMMAND_CONTEXT=reset` | Fail | Passed: DB guard blocked release reset command. |
| release + migration without approval | Fail | Passed: DB guard required `ALLOW_RELEASE_DB_MIGRATION=true` and approver. |
| development + missing `DATABASE_URL` | Fail for DB command | Passed: DB guard failed missing `DATABASE_URL`. |
| Supabase env missing | Middleware/build must not crash | Passed: build completed in current local DB env with no Supabase env warning. |

## P0/P1/P2

| Priority | Risk | Next Action |
| --- | --- | --- |
| P0 | Release DB seed/reset/migration without guard. | Guard is in place; keep negative tests in release checklist. |
| P0 | Supabase env missing causes middleware/build crash. | Middleware verified to avoid Supabase client creation; keep build test without Supabase env. |
| P1 | Active `lib/supabase/server.ts` imports remain. | Replace `policyEngine`, `moduleGuards`, `user-state`, thumbnail backfill and tour shared paths with FastAPI/local DB paths. |
| P1 | Backend quality baseline currently has known debt from previous audit. | Fix ruff/mypy/pytest baseline in a dedicated backend cleanup phase. |
| P2 | Historical docs mention Supabase/Vercel as canonical. | Continue doc cleanup as references are touched. |

## Next Phase Impact

The next cleanup phase can remove or replace active Supabase adapter imports with less risk because canonical guards and operator runbooks now point at local DB safety checks.

## Freeze Note

This phase did not intentionally change major runtime behavior. Cleanup/refactor stages after this point must rerun build, typecheck and backend checks at the end of each stage.
