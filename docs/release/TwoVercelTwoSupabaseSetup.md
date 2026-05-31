# Two Vercel + Two Supabase Setup

## Purpose

Eden ERP has two named environments. Staging yoktur. Release korunur; aktif gelistirme Development ortaminda yapilir.

## Development

| area | value |
|---|---|
| local working copy | `eden-erp-development` |
| branch | `develop` or active development branch |
| Vercel project | Development deployment |
| Supabase project | separate Development project |
| users | Codex, demo users, field-test users |
| visible routes | `release`, `development`, `development_demo`, `development_internal`, `coming_soon` |
| badges | environment and release status badges can be visible |
| data operations | migration/seed/reset allowed only against Development Supabase |

Development is the safe experimentation and validation environment. Local DB is not required. Local FastAPI is optional.

## Release

| area | value |
|---|---|
| local working copy | `eden-erp` |
| branch | `main` or `release` |
| Vercel project | existing release/live deployment |
| Supabase project | existing release project |
| users | approved live users |
| visible routes | only `release`; `coming_soon` can be passive |
| badges | no demo, debug, environment or route-status badge for normal users |
| data operations | seed/reset forbidden; migration requires explicit approval |

Release is a protected environment. It is changed only through promotion from Development after checks and human approval.

## Guard Commands

```bash
npm run release:check
npm run env:safety
npm run supabase:target:check
```

## Findings

- Development and Release now have separate route visibility rules.
- Env and Supabase target checks are available before risky operations.
- Release route access is guarded by middleware and runtime visibility helpers.

## Risks

- Wrong Vercel env values can point a deployment at the wrong Supabase project.
- Release migration remains risky unless approval env values are explicit.
- Manual promotion can skip smoke checks unless enforced by process or CI.

## Recommended Fixes

- Configure Development and Release Vercel projects with different Supabase values.
- Store Release Supabase secrets only in the Release Vercel project.
- Run the promotion checklist before any merge to `main` or `release`.

## P0/P1/P2 Priority

- P0: Development env connected to Release Supabase during seed/reset/migration.
- P1: Release Vercel missing `NEXT_PUBLIC_APP_ENV=release`.
- P2: Add CI automation for the checklist.

## Suggested Next Prompt

Development Vercel project env degerlerini Development Supabase project ile dogrula.
