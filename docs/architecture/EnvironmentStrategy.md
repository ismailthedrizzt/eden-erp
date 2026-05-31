# Environment Strategy

Eden ERP uses two named environments:

1. Development
2. Release

Staging ortamı kullanılmayacak. Preview deploylar Vercel tarafinda teknik olarak olusabilir, fakat operasyonel model iki isimli ortam uzerinden yonetilir.

## Physical Deployment Model

| environment | local working copy | branch | Vercel | Supabase |
|---|---|---|---|---|
| Development | `eden-erp-development` | `develop` or active development branch | Development Vercel project | separate Development Supabase project |
| Release | `eden-erp` | `main` or `release` | existing Release Vercel project | existing protected Release Supabase project |

Codex works only in `eden-erp-development`. Release credentials do not belong in `.env.local`.

## Development

- Workspace: `eden-erp-development`
- Branch: `develop` or another active development branch
- Hosting: Development Vercel project
- Data/Auth/Storage: separate Development Supabase project
- Purpose: active development, demo, field test, internal review and migration rehearsal
- Visibility: `release`, `development`, `development_demo`, `development_internal` and optional `coming_soon` routes can be visible
- Badges: environment and release status badges can be visible
- Demo data: allowed
- Local DB: not required
- Local FastAPI: optional
- Migration/seed/reset: allowed only against Development Supabase

## Release

- Workspace: `eden-erp`
- Branch: `main` or explicit release branch
- Hosting: existing Release Vercel project
- Data/Auth/Storage: existing Release Supabase project
- Purpose: clean, approved, user-facing system
- Visibility: only `release` routes are enabled; `coming_soon` may show a passive state
- Badges: environment, debug, demo and page status badges are hidden from normal users
- Demo data: forbidden
- Migration/seed/reset: forbidden unless a release migration is explicitly approved

## Environment Resolver

Canonical values:

```text
development
release
test
```

Inputs:

```text
NEXT_PUBLIC_APP_ENV
NEXT_PUBLIC_RELEASE_CHANNEL
VERCEL_ENV
NODE_ENV
```

Mapping:

```text
NEXT_PUBLIC_APP_ENV=release              -> release
NEXT_PUBLIC_RELEASE_CHANNEL=release      -> release
NEXT_PUBLIC_APP_ENV=development          -> development
NEXT_PUBLIC_RELEASE_CHANNEL=development  -> development
VERCEL_ENV=production                    -> release
NODE_ENV=development                     -> development
NODE_ENV=test                            -> test
```

## Safety Rules

- Release Supabase is protected.
- Development Supabase is the only target for Codex migration, seed, reset and demo data work.
- Release env cannot enable `EDEN_LOGIN_DISABLED`, `EDEN_ALLOW_LEGACY_API_ACCESS` or `NEXT_PUBLIC_DEMO_MODE`.
- Release env cannot enable `ALLOW_RELEASE_DB_SEED` or `ALLOW_RELEASE_DB_RESET`.
- Release migration requires `ALLOW_RELEASE_DB_MIGRATION=true` and `RELEASE_MIGRATION_APPROVED_BY=<name>`.
- `NEXT_PUBLIC_*` variables must never contain service role keys, internal backend tokens, JWT secrets or private keys.
- Service role keys must stay server-side.

## Required Checks

```bash
npm run release:check
npm run env:safety
npm run supabase:target:check
```

## Route Visibility

Route status values:

```text
release
development
development_demo
development_internal
coming_soon
hidden
broken_do_not_show
```

Release shows only `release` routes as enabled. Development shows development surfaces for testing. Hidden and broken routes are not normal-user navigation targets.
