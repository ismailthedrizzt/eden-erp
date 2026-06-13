# Module Visibility And Entitlement

<!-- source-of-truth-standard: contract overrides markdown -->

Module visibility is decided in this order:

1. Route release status
2. Tenant license/plan entitlement
3. Feature flag
4. Permission/role
5. Company/branch scope

Frontend visibility is convenience only. Backend endpoints must enforce module or feature entitlement.

Implemented helper:

- `require_module_entitlement(module_key)`
- `require_feature_entitlement(feature_key)`

Runtime `/modules` now returns `unlicensed` for modules outside the current tenant plan.

