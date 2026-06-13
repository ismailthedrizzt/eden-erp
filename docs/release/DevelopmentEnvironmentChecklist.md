# Local Development Environment Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

## Purpose

Local `main` + development local PostgreSQL ortamının release verisini etkilemeden calistigini dogrular.

## Checklist

| check | expected |
|---|---|
| Local Next app opens | App loads without release env errors |
| Development DB connected | `DATABASE_URL` points to Development/local DB |
| Login works | App-session login uses FastAPI/local DB user context |
| Environment badge visible | `development` badge appears |
| Release status badge visible | non-release route statuses can be shown |
| Release pages visible | release routes are usable |
| Development pages visible | development routes are usable |
| Demo/internal pages visible | demo/internal routes can be tested by allowed users |
| Demo data visible when seeded | demo data is marked and isolated |
| Migration target safe | `npm run db:target:check` passes against Development |
| Release DB absent | no release DB URL in active local env |

## Required Env

```env
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_RELEASE_CHANNEL=development
NEXT_PUBLIC_DEMO_MODE=true
DATABASE_URL=<development-local-postgresql-url>
DATABASE_TARGET_CLASS=development
APP_SESSION_SECRET=<development-session-secret>
FASTAPI_BASE_URL=http://127.0.0.1:8000
INTERNAL_BACKEND_TOKEN=<development-internal-token>
```

## Commands

```bash
npm run release:check
npm run env:safety
npm run db:target:check
npm run typecheck:fast
```

## Suggested Next Prompt

Local `main` uzerinde login, sidebar, command palette ve demo route smoke yap.
