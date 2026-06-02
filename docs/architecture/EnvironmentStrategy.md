# Environment Strategy

Eden ERP uses one code branch and two environment configurations.

## Decision

- `main` is the only product branch.
- Local development runs from `main` and points to the Development Supabase project.
- The Virtual Server runs from `main` and points to the Live/Release Supabase project.
- Code promotion is no longer branch based. The difference between local and live is only environment variables and server secrets.
- Ollama runs on the Virtual Server for live AI guide responses. Local Ollama remains optional.

## Physical Deployment Model

| runtime | branch | machine | env file/source | Supabase | Ollama |
|---|---|---|---|---|---|
| Local development | `main` | developer machine | `.env.local` | Development Supabase | optional local `127.0.0.1:11434` |
| Live release | `main` | Virtual Server | `/etc/eden-erp/eden-erp.env` or service env | Live/Release Supabase | VS-local `127.0.0.1:11434` |

Release credentials do not belong in `.env.local`. Development credentials do not belong in the Virtual Server live env file.

## Local Development

- Branch: `main`
- Data/Auth/Storage: Development Supabase project
- Purpose: active development, demo, field test, internal review and migration rehearsal
- Visibility: `release`, `development`, `development_demo`, `development_internal` and optional `coming_soon` routes can be visible
- Badges: environment and release status badges can be visible
- Demo data: allowed
- Migration/seed/reset: allowed only against Development Supabase

## Live Release

- Branch: `main`
- Machine: Virtual Server
- Data/Auth/Storage: Live/Release Supabase project
- Purpose: clean, approved, user-facing system
- Visibility: only `release` routes are enabled; `coming_soon` may show a passive state
- Badges: environment, debug, demo and page status badges are hidden from normal users
- Demo data: forbidden
- Migration/seed/reset: forbidden unless a live migration is explicitly approved

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

- Live Supabase is protected.
- Development Supabase is the only target for local migration, seed, reset and demo data work.
- Live env cannot enable `EDEN_LOGIN_DISABLED`, `EDEN_ALLOW_LEGACY_API_ACCESS` or `NEXT_PUBLIC_DEMO_MODE`.
- Live env cannot enable `ALLOW_RELEASE_DB_SEED` or `ALLOW_RELEASE_DB_RESET`.
- Live migration requires `ALLOW_RELEASE_DB_MIGRATION=true` and `RELEASE_MIGRATION_APPROVED_BY=<name>`.
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

Live release shows only `release` routes as enabled. Local development can show development surfaces for testing. Hidden and broken routes are not normal-user navigation targets.
