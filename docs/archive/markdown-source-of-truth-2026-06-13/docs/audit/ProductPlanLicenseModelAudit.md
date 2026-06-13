# Product, Plan & Tenant License Model Audit

Date: 2026-06-07

## Current Findings

- Tenant context lives in FastAPI `RequestContext` and is resolved from the app session/trusted proxy headers.
- Module registry exists in `lib/modules/moduleRegistry.ts` and runtime readiness exists in `backend/app/setup/readiness_registry.py`.
- Route release readiness exists in `lib/release/routeReleaseRegistry.ts`.
- Feature flags exist in `lib/features/featureFlags.ts` and FastAPI `backend/app/api/v1/features.py`.
- Existing module license UI exists at `/app/sistem/module-licenses`, but backend activation was process-memory only.
- No canonical product/plan/tenant license persistence existed before this change.
- Setup wizard had company scale selection but no canonical `plan_key` field.
- EDEN Teknoloji vendor tenant distinction was not modeled in code; it is documented as role/permission driven.
- Development-only visibility depended mainly on release status/environment, not tenant license.

## Added In This Pass

- FastAPI licensing domain under `backend/app/domains/licensing`.
- Tenant entitlement resolver and `require_module_entitlement` / `require_feature_entitlement` dependencies.
- `/api/v1/licensing/*` FastAPI endpoints.
- Next BFF proxy routes under `/api/licensing/*`.
- `licensed_products`, `product_license_plans`, `tenant_licenses` and related migration draft.
- EDEN ERP product and plans: `development`, `micro`, `small`, `medium`, `large`, `enterprise`.
- Runtime `/modules` payload now reports `unlicensed` when the tenant plan does not include the module.
- Platform UI `/app/sistem/lisanslar` and customer summary `/app/aboneligim`.

## Risks

P0:
- Backend module endpoints still need module-by-module rollout of `require_module_entitlement`.
- Suspended tenant write/read-only policy is modeled but not enforced across every domain endpoint yet.

P1:
- Migration assigns existing `workspace_settings` tenants to `medium` fallback; business confirmation is needed.
- Vendor tenant ID is not yet configured as a DB field on the existing tenant model.
- Setup wizard sends `plan_key`, but the setup completion endpoint still needs a permanent tenant license creation step.

P2:
- Sidebar still contains legacy static items; registry-driven navigation should eventually replace it.
- Prices are placeholders.
- Usage limits are visible/modelled but only hard-enforcement-ready for future domain-specific guards.

