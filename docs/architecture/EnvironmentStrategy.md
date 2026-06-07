# Environment Strategy

Eden ERP canonical deployment model is remote server + local PostgreSQL/local DB.
Vercel and Supabase are no longer canonical runtime assumptions.

> Status update, 2026-06-07: environment-based development/release visibility is
> deprecated for product, module, and feature access. This document remains
> canonical only for operational runtime safety: env variables, database target
> classification, secrets, and deployment guardrails.
>
> Canonical product visibility is tenant license based:
> release registry -> tenant license / plan entitlement -> feature flag ->
> permission / role -> company / branch scope.

## Decision

- `main` is the product branch.
- Development and release are not product capability environments.
- Server env and database target classify operational safety only; they do not
  unlock modules, development routes, internal routes, or commercial features.
- Tenant license / plan entitlement is the primary model for user-facing
  development/release visibility.
- Development DB names should contain `dev`, `development`, `local`, or `test`.
- Release DB names should contain `release`, `prod`, or `production` and are protected by guard scripts.
- If an existing local DB has a neutral name, set `DATABASE_TARGET_CLASS=release` or `DATABASE_TARGET_CLASS=development` explicitly.

- Real credentials belong in `.env.local`, `/etc/eden-erp/eden-erp.env`, or service env only.
- Example files must keep the password as a placeholder.

## Deprecated Product Visibility Model

The older model that separated user-visible "development" and "release" by
server environment or database target is deprecated.

| old statement | replacement |
| --- | --- |
| Development/release capability is decided by server env. | Capability is decided by tenant license / plan entitlement after the release registry gate. |
| A development DB unlocks development/internal modules. | DB target is a data safety classification only. |
| `NODE_ENV=development` is enough to show development surfaces. | Development/internal surfaces require an entitled tenant plus user permission. |
| Release readiness alone is enough for users. | Normal users need a release-ready route and licensed module/feature access. |

## Operational Deployment Model

| runtime | branch | machine | env file/source | database | product visibility authority |
|---|---|---|---|---|---|
| Remote development | `main` | Virtual Server | repo/service env | local PostgreSQL development DB | tenant license / plan entitlement |
| Release field test | `main` | Virtual Server | protected service env | local PostgreSQL release DB | tenant license / plan entitlement |

## Canonical Auth And Data Flow

```text
Browser -> Next app session cookie
Next BFF -> FastAPI trusted proxy headers
FastAPI -> local PostgreSQL tenant/user/permission/scope resolution
Documents -> local filesystem -> controlled media route
```

Supabase Auth, Supabase Storage and Vercel environment values are legacy compatibility only. They must not be required for release startup.

## Environment Resolver

The application still has internal route-status terminology for release registry
checks. For a production Node runtime, the resolver maps the live environment to
the existing `release` registry mode.

This resolver is not the commercial/module entitlement model. Env values may
select a safety-oriented registry mode, but they must not decide whether a tenant
can use a module or feature.

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
NEXT_PUBLIC_APP_ENV=production      -> release registry mode
NEXT_PUBLIC_RELEASE_CHANNEL=prod    -> release registry mode
VERCEL_ENV=production               -> release registry mode
NODE_ENV=production                 -> release registry mode
NODE_ENV=development                -> development registry mode for internal checks only
NODE_ENV=test                       -> test registry mode for tests only
```

## Safety Rules

- `DATABASE_URL` is required for the VS environment.
- `DATABASE_URL` is a protected server-side secret and must never be exposed through `NEXT_PUBLIC_*`.
- Do not configure old separate Supabase project refs as database targets.
- Supabase variables are optional and should only be set if Supabase Auth/API is still used.
- The VS env cannot enable `EDEN_LOGIN_DISABLED`, `EDEN_ALLOW_LEGACY_API_ACCESS` or `NEXT_PUBLIC_DEMO_MODE`.
- The VS env cannot enable `ALLOW_RELEASE_DB_SEED` or `ALLOW_RELEASE_DB_RESET`.
- `NEXT_PUBLIC_*` variables must never contain service role keys, internal backend tokens, JWT secrets or private keys.
- `TRUSTED_PROXY_SECRET` is required when FastAPI accepts trusted proxy headers in release/production.
- Release registry visibility is a readiness decision; it is not the same as the
  set of routes built by Next.js and it is not the same as tenant entitlement.
- User-facing module availability must be resolved by tenant license / plan
  entitlement after the release registry gate.

## Remote Server Principles

- Next.js is the UI/BFF/proxy layer.
- FastAPI owns business mutation, lifecycle operations, audit and DB access.
- Local PostgreSQL is the canonical data store and a protected asset.
- Local filesystem document storage is the canonical file layer.
- App session plus FastAPI trusted proxy context is the canonical browser auth path.
- Vercel/Supabase values are legacy/compatibility only and must not be required for release startup.

## Required Checks

```bash
npm run env:safety
npm run db:target:check
npm run release:check
```

Supabase target checks and legacy Supabase command wrappers have been removed from the canonical script surface. Direct `DATABASE_URL` checks use `scripts/check-database-target.js`.

## Route Visibility

Route status values remain in the codebase for release readiness:

```text
release
development
development_demo
development_internal
coming_soon
hidden
broken_do_not_show
```

Runtime user visibility must use this order:

1. Release registry readiness.
2. Tenant license / plan entitlement.
3. Feature flag.
4. Permission / role.
5. Company / branch scope.

The VS environment may run in release registry mode, but normal users only see
routes that are both release-ready and included in their tenant license. A
development database, development env value, or internal deployment label must
not unlock development/internal surfaces by itself.
