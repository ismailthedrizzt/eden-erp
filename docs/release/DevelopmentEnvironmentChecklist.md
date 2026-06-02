# Local Development Environment Checklist

## Purpose

Local `main` + Development Supabase ortamının release verisini etkilemeden calistigini dogrular.

## Checklist

| check | expected |
|---|---|
| Local Next app opens | App loads without release env errors |
| Development Supabase connected | `NEXT_PUBLIC_SUPABASE_URL` points to Development project |
| Login works | Supabase Auth uses Development project users |
| Environment badge visible | `development` badge appears |
| Release status badge visible | non-release route statuses can be shown |
| Release pages visible | release routes are usable |
| Development pages visible | development routes are usable |
| Demo/internal pages visible | demo/internal routes can be tested by allowed users |
| Demo data visible when seeded | demo data is marked and isolated |
| Migration target safe | `npm run supabase:target:check` passes against Development |
| Release Supabase absent | no Release Supabase URL/ref in active local env except optional guard reference |

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
npm run typecheck:fast
```

## Suggested Next Prompt

Local `main` uzerinde login, sidebar, command palette ve demo route smoke yap.
