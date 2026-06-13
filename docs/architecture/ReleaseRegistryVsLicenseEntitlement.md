# Release Registry vs License Entitlement

<!-- source-of-truth-standard: contract overrides markdown -->

Status: canonical visibility rule as of 2026-06-07.

Release registry answers:

> Is this route or feature generally ready for release?

License entitlement answers:

> Is this tenant allowed to use this module or feature?

They are independent and both must pass.

## Canonical Runtime Order

1. Release registry readiness.
2. Tenant license / plan entitlement.
3. Feature flag.
4. Permission / role.
5. Company / branch scope.

## Deprecated Environment-Based Model

The older environment-based development/release model is deprecated for product,
module, and feature visibility. `NODE_ENV`, release channel, deployment target,
or database target may protect runtime safety and release registry mode, but
they must not grant commercial or internal feature access.

Development plan tenants may see development/internal surfaces when the route is
allowed by the registry and the user also has permission. Normal tenants cannot
see those surfaces.
