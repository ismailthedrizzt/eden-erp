# Environment Strategy

Eden ERP canonical deployment model is remote server + local PostgreSQL/local DB.
Vercel and Supabase are no longer canonical runtime assumptions.

## Decision

- `main` is the product branch.
- Development and release are separated by server env and database target, not by branch.
- Development DB names should contain `dev`, `development`, `local`, or `test`.
- Release DB names should contain `release`, `prod`, or `production` and are protected by guard scripts.
- If an existing local DB has a neutral name, set `DATABASE_TARGET_CLASS=release` or `DATABASE_TARGET_CLASS=development` explicitly.

- Real credentials belong in `.env.local`, `/etc/eden-erp/eden-erp.env`, or service env only.
- Example files must keep the password as a placeholder.

## Physical Deployment Model

| runtime | branch | machine | env file/source | database | Ollama |
|---|---|---|---|---|---|
| Remote development | `main` | Virtual Server | repo/service env | local PostgreSQL development DB | optional |
| Release field test | `main` | Virtual Server | protected service env | local PostgreSQL release DB | VS-local `127.0.0.1:11434` |

## Canonical Auth And Data Flow

```text
Browser -> Next app session cookie
Next BFF -> FastAPI trusted proxy headers
FastAPI -> local PostgreSQL tenant/user/permission/scope resolution
Documents -> local filesystem -> controlled media route
```

Supabase Auth, Supabase Storage and Vercel environment values are legacy compatibility only. They must not be required for release startup.

## Environment Resolver

The application still has internal route-status terminology for visibility checks. For a production Node runtime, the resolver maps the single live environment to the existing `release` visibility mode.

Inputs:

```text
NEXT_PUBLIC_APP_ENV
NEXT_PUBLIC_RELEASE_CHANNEL
VERCEL_ENV
NODE_ENV
```

Recommended values for the VS:

```text
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_RELEASE_CHANNEL=production
NODE_ENV=production
```

Mapping:

```text
NEXT_PUBLIC_APP_ENV=production      -> release visibility mode
NEXT_PUBLIC_RELEASE_CHANNEL=prod    -> release visibility mode
VERCEL_ENV=production               -> release visibility mode
NODE_ENV=production                 -> release visibility mode
NODE_ENV=development                -> development visibility mode
NODE_ENV=test                       -> test visibility mode
```

## Safety Rules

- `DATABASE_URL` is required for the VS environment.
- Do not configure old separate Supabase project refs as database targets.
- Supabase variables are optional and should only be set if Supabase Auth/API is still used.
- The VS env cannot enable `EDEN_LOGIN_DISABLED`, `EDEN_ALLOW_LEGACY_API_ACCESS` or `NEXT_PUBLIC_DEMO_MODE`.
- The VS env cannot enable `ALLOW_RELEASE_DB_SEED` or `ALLOW_RELEASE_DB_RESET`.
- `NEXT_PUBLIC_*` variables must never contain service role keys, internal backend tokens, JWT secrets or private keys.

## Required Checks

```bash
npm run env:safety
npm run db:target:check
npm run release:check
```

Supabase target checks and legacy Supabase command wrappers have been removed from the canonical script surface. Direct `DATABASE_URL` checks use `scripts/check-database-target.js`.

## Route Visibility

Route status values remain in the codebase for product visibility:

```text
release
development
development_demo
development_internal
coming_soon
hidden
broken_do_not_show
```

The single VS environment uses release visibility mode, so normal users only see routes marked as ready.
