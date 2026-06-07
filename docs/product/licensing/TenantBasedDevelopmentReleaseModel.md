# Tenant Based Development / Release Model

There is one application and many tenants.

## Deprecation Decision

The old environment-based development/release model is deprecated for product
visibility. Deployment environment, release channel, `NODE_ENV`, and database
target remain operational safety inputs only; they do not unlock modules,
internal routes, or development-only features.

Tenant license / plan entitlement is now the canonical model for user-facing
development/release visibility.

## Visibility Order

Visibility order:

1. Release registry
2. Tenant license / plan entitlement
3. Feature flag
4. Permission / role
5. Company / branch scope

Development-only routes are not unlocked by deployment environment alone. A tenant must have the `development` plan and the user must still have the required role/permission.

Normal customer tenants can only see routes that are both release-ready and included in their tenant license.
