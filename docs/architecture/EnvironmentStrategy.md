# Environment Strategy

Eden ERP now uses one product branch and one Virtual Server environment.

## Decision

- `main` is the product branch.
- There is no separate development/release database target.
- The VS environment and local maintenance commands use the same PostgreSQL target:

```text
postgresql://postgres:<postgres-password>@localhost:5432/app1db
```

- Real credentials belong in `.env.local`, `/etc/eden-erp/eden-erp.env`, or service env only.
- Example files must keep the password as a placeholder.

## Physical Deployment Model

| runtime | branch | machine | env file/source | database | Ollama |
|---|---|---|---|---|---|
| Single VS environment | `main` | Virtual Server | `/etc/eden-erp/eden-erp.env` or service env | local PostgreSQL `app1db` | VS-local `127.0.0.1:11434` |
| Local commands | `main` | developer/VS shell | `.env.local` | same PostgreSQL target when connected to VS/local DB | optional |

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
npm run release:check
```

`npm run supabase:target:check` is retained for legacy commands. When direct `DATABASE_URL` is configured and no Supabase URL is set, Supabase project-ref checks are skipped.

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
