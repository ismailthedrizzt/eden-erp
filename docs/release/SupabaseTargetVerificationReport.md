# Supabase Target Verification Report

## Metadata

| Field | Value |
| --- | --- |
| Test date | 2026-05-31 |
| Workspace | `C:\Users\ismai\Desktop\eden-erp-development` |
| Branch | `develop` |
| Vercel URL | Not available to this local run |
| Supabase project | Dummy masked refs `dev-ref` and `release-ref`; real secrets were not read |
| Result | Pass |

## Env Summary

No real Supabase URL, anon key, service role key, database URL, or project secret was printed. Tests used dummy refs only.

## Positive and Negative Target Tests

| Scenario | Env summary | Expected | Actual | Result | Priority |
| --- | --- | --- | --- | --- | --- |
| Development seed | `NEXT_PUBLIC_APP_ENV=development`, `NEXT_PUBLIC_SUPABASE_URL=https://dev-ref.supabase.co`, `DEVELOPMENT_SUPABASE_PROJECT_REF=dev-ref`, `COMMAND_CONTEXT=seed` | Pass | Pass | Pass | - |
| Release seed | `NEXT_PUBLIC_APP_ENV=release`, `NEXT_PUBLIC_SUPABASE_URL=https://release-ref.supabase.co`, `COMMAND_CONTEXT=seed` | Fail | Failed with release seed/demo blocked | Pass | P0 |
| Release reset | `NEXT_PUBLIC_APP_ENV=release`, `COMMAND_CONTEXT=reset` | Fail | Failed with release reset blocked | Pass | P0 |
| Release migration unapproved | `NEXT_PUBLIC_APP_ENV=release`, `COMMAND_CONTEXT=migration`, `ALLOW_RELEASE_DB_MIGRATION=false` | Fail | Failed; required migration flag and approver | Pass | P0 |
| Release migration approved | `NEXT_PUBLIC_APP_ENV=release`, `COMMAND_CONTEXT=migration`, `ALLOW_RELEASE_DB_MIGRATION=true`, `RELEASE_MIGRATION_APPROVED_BY=runtime-smoke` | Pass | Pass | Pass | - |

## Default Shell Check

| Command | Result | Notes |
| --- | --- | --- |
| `npm run supabase:target:check` | Pass | Env resolved as development; project ref was `unknown` because no real local Supabase env was loaded. |

## Findings

| ID | Issue | Priority | Fixed? | Recommended fix |
| --- | --- | --- | --- | --- |
| None | Supabase seed/reset/migration guards behaved as expected under simulated inputs. | - | - | Keep real Development and Release refs configured in Vercel and local examples. |

