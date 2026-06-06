# Supabase Vercel Residue Cleanup Report

Date: 2026-06-06
Branch: main
Commit: 7207a273b12ad833ed34b173925d6ba5aaabb3f3
Environment: remote server, release app surface, local PostgreSQL/local DB, FastAPI canonical backend, Next.js BFF/proxy


## Residue Counts
Total matched residue lines after cleanup: 323. This includes historical docs, package-lock entries, backend legacy JWT tests/config, and deprecated adapters.

| Pattern | Count |
| --- | ---: |
| `Vercel` | 165 |
| `@supabase/supabase-js` | 29 |
| `NEXT_PUBLIC_SUPABASE` | 29 |
| `lib/supabase` | 21 |
| `SUPABASE_SERVICE_ROLE_KEY` | 18 |
| `SUPABASE_JWT_SECRET` | 17 |
| `Supabase Storage` | 12 |
| `@supabase/ssr` | 11 |
| `VERCEL_ENV` | 9 |
| `SUPABASE_JWKS_URL` | 6 |
| `check-supabase-target` | 2 |
| `supabase:migrate` | 2 |
| `db:reset:public` | 2 |

## Changes
- Removed type-only `@supabase/supabase-js` imports from selected TS type contracts.
- Added deprecated note to `lib/supabase/client.ts`; `lib/supabase/server.ts` was already deprecated.
- Marked Supabase env variables in examples as legacy compatibility only.
- Deprecated legacy migration docs that still describe Supabase-era migration assumptions.

## Remaining Risk
- P0: none observed; middleware and release auth do not require Supabase.
- P1: Supabase dependencies remain in `package.json` while deprecated adapters and legacy helper callers still exist.
- P1: backend legacy JWT tests/config intentionally retain Supabase naming as compatibility guard.
