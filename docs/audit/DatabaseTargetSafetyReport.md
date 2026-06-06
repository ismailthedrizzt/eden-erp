# Database Target Safety Report

## Metadata

| Field | Value |
| --- | --- |
| Date | 2026-06-06 |
| Branch | `main` |
| Baseline commit | `a82ff9b32b2688e5ea8fed8143f74ea76887127c` |
| Working environment | Remote server + local PostgreSQL/local DB |

## Canonical Guard

`scripts/check-database-target.js` is the canonical guard for database commands. It loads `.env.local`, resolves the current environment from `APP_ENV`, `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_RELEASE_CHANNEL`, `NODE_ENV` and `VERCEL_ENV`, then checks the active `DATABASE_URL`.

## Required Script Surface

| Script | Purpose | Status |
| --- | --- | --- |
| `db:target:check` | General DB target check | Present |
| `db:migrate:check` | Migration guard with `COMMAND_CONTEXT=migration` | Present |
| `db:seed:check` | Seed guard with `COMMAND_CONTEXT=seed` | Present |
| `db:reset:check` | Reset guard with `COMMAND_CONTEXT=reset` | Present |
| `db:migrate` | Guarded Alembic migration | Present |
| `db:reset:development` | Guarded development schema reset | Present |

## Guard Rules

| Rule | Development | Release |
| --- | --- | --- |
| `DATABASE_URL` required | Fail if missing | Fail if missing |
| Ambiguous DB name | Warning | Fail unless `DATABASE_TARGET_CLASS=release` |
| Seed/demo | Allowed against development-like DB | Fail |
| Reset | Allowed against development-like DB | Fail |
| Mutation/import/write | Allowed against development-like DB | Fail unless `ALLOW_RELEASE_DB_MUTATION=true` |
| Migration | Allowed against development-like DB | Requires `ALLOW_RELEASE_DB_MIGRATION=true` and `RELEASE_MIGRATION_APPROVED_BY` |
| `ALLOW_RELEASE_DB_SEED=true` | Not needed | Fail |
| `ALLOW_RELEASE_DB_RESET=true` | Not needed | Fail |

## Tested Commands

| Command | Result | Notes |
| --- | --- | --- |
| `npm run db:target:check` | Pass | Current remote env resolved as release, DB class release, `app1db`. |
| release + `COMMAND_CONTEXT=seed` | Expected fail observed | `Release database is protected. Seed/demo commands are blocked.` |
| release + `COMMAND_CONTEXT=reset` | Expected fail observed | `Release database is protected. Reset commands are blocked.` |
| release + migration without approval | Expected fail observed | Guard required migration allow flag and named approver. |
| development + missing `DATABASE_URL` | Expected fail observed | Guard failed missing `DATABASE_URL`. |

## Safety Findings

| Finding | Risk | Priority |
| --- | --- | --- |
| Guard is local DB oriented and no longer Supabase project-ref oriented. | Correct target architecture. | - |
| Ambiguous neutral DB names can pass in development with warning. | Operator can miss weak DB naming. | P2 |
| Release migration override is explicit and named. | Correct P0 guard. | - |
| Release seed/reset override is forbidden by both DB guard and release env safety. | Correct P0 guard. | - |

## Next Phase Impact

All future migration, seed, reset, import or destructive DB scripts must call this guard before touching the database. Any script that bypasses it should be treated as P0 in release and P1 in development.
