# Runtime Visibility

Date: 2026-06-07

## Principles

- Release surface is not build surface.
- Next.js may build development/internal routes that are not visible to release users.
- `lib/release/routeReleaseRegistry.ts` is the release surface contract.
- Tenant license / plan entitlement is the primary user-facing module visibility model.
- Environment-based development/release visibility is deprecated for product access.
- `npm run release:check` must pass before deployment.
- Hidden/broken/internal routes must remain blocked even if directly requested.

## Canonical Visibility Order

Runtime visibility must be resolved in this order:

1. Release registry readiness.
2. Tenant license / plan entitlement.
3. Feature flag.
4. Permission / role.
5. Company / branch scope.

The release registry answers whether a route is generally ready to be exposed.
Tenant licensing answers whether the current tenant is allowed to use the module
or feature. Both must pass before a normal user sees an enabled surface.

## Deprecated Environment-Based Model

The older model that used deployment environment, `NODE_ENV`, release channel, or
database target as the primary development/release separator is deprecated.
Those values may still protect runtime safety, route registry mode, and database
guardrails, but they must not grant module entitlement.

Development/internal surfaces require an entitled tenant, such as a development
plan tenant, plus the required user permission. Normal customer tenants can only
see release-ready routes included in their tenant license.

## Current Audit Status

The latest release check passed with 150 registry routes and 150 page routes.
