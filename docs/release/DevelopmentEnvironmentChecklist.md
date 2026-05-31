# Development Environment Checklist

## Purpose

Development Vercel + Development Supabase ortamının release verisini etkilemeden calistigini dogrular.

## Checklist

| check | expected |
|---|---|
| Development Vercel opens | App loads without release env errors |
| Development Supabase connected | `NEXT_PUBLIC_SUPABASE_URL` points to Development project |
| Login works | Supabase Auth uses Development project users |
| Environment badge visible | `development` badge appears |
| Release status badge visible | non-release route statuses can be shown |
| Release pages visible | release routes are usable |
| Development pages visible | development routes are usable |
| Demo/internal pages visible | demo/internal routes can be tested by allowed users |
| Demo data visible when seeded | demo data is marked and isolated |
| Demo users work | demo users are Development-only |
| Migration target safe | `npm run supabase:target:check` passes against Development |
| Seed target safe | `npm run demo:seed:dry` or seed command does not target Release |
| Release Supabase absent | no Release Supabase URL/ref in active Development env except optional guard reference |

## Required Env

```env
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_RELEASE_CHANNEL=development
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_SUPABASE_URL=<development-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<development-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<development-service-role-key>
SUPABASE_PROJECT_REF=<development-project-ref>
```

## Commands

```bash
npm run release:check
npm run env:safety
npm run supabase:target:check
npm run typecheck
npm run build
```

## Findings

Development can show broader route surface, but release guard still blocks `hidden` and `broken_do_not_show`.

## Risks

- Copying Release Supabase values into `.env.local` can contaminate live data.
- Demo seed/reset must never run against Release.

## Recommended Fixes

- Keep `.env.local` Development-only.
- Set `DEVELOPMENT_SUPABASE_PROJECT_REF` for target verification.
- Keep Release project ref only as optional guard reference.

## P0/P1/P2 Priority

- P0: Development environment targets Release Supabase.
- P1: Missing Development demo users or required buckets.
- P2: Better automated browser smoke.

## Suggested Next Prompt

Development Vercel URL uzerinde login, sidebar, command palette ve demo route smoke yap.
