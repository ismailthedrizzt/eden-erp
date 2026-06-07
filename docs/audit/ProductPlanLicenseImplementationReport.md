# Product Plan License Implementation Report

Date: 2026-06-07

## Implemented

- Canonical plan catalog and fallback resolver.
- FastAPI read/mutation endpoints for products, plans, plan modules/features, tenant licenses, payments and usage snapshots.
- Mutation endpoints require license/platform/admin style permissions and DB migration presence.
- `current` entitlement endpoint returns product, plan, license status, modules, features, limits and warnings.
- Frontend services and BFF proxy routes were added.
- Platform admin UI added at `/app/sistem/lisanslar`.
- Customer summary UI added at `/app/aboneligim`.
- Setup wizard package cards now use plan language and send `plan_key`.
- Release visibility and runtime visibility support tenant entitlement input.
- Backend `/modules` now marks modules outside the active tenant plan as `unlicensed`.

## Staged / Future

- Domain endpoints such as CRM, contracts and documents should progressively add `require_module_entitlement`.
- Full tenant lifecycle actions should emit audit events.
- Pricing/payment is manual record only.
- Hard delete guard should be implemented in tenant management once tenant lifecycle endpoints exist.

## Validation Targets

- `npm run typecheck`
- `npm run build`
- `npm run release:check`
- `npm run env:safety`
- `npm run db:target:check`
- `npm run migration:status`
- `npm run boundaries:check`
- `npm run openapi:drift`
- `cd backend && python -m ruff check .`
- `cd backend && python -m mypy app`
- `cd backend && python -m pytest app/tests`

