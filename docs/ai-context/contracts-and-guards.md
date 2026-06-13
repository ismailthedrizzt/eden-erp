# Contracts and Guards

Status: canonical AI context
Updated: 2026-06-13

Contracts are machine-readable source of truth. Markdown can explain decisions, but it cannot override contracts or guard output.

## Required Contract Chain

```text
frontend service -> frontendPath -> bffPath -> fastApiPath -> FastAPI route
```

API contract entries live under `contracts/api/**/*.contract.ts`. Page, form, list, wizard, lifecycle, and release contracts live under `contracts/**`.

## Required Guards

- `npm run contracts:check`
- `npm run page-flow:contract:check`
- `npm run frontend:standard:check`
- `npm run release:check`
- `npm run contract:usage`
- `npm run contract:backend-drift`
- `npm run contract:lifecycle`
- `npm run docs:source-check`
- `npm run legacy:inventory`
- `npm run legacy:check`
- `npm run validate:contracts`
- `npm run build`

Do not weaken guards, convert errors to warnings, or add broad exceptions to pass a check.

## Legacy Cleanup Enforcement

- Contract overrides Markdown; documentation can describe decisions but cannot redefine source of truth.
- Legacy cleanup starts with inventory, not deletion. Keep generated contracts, BFF routes, services, adapters, and compatibility routes unless usage analysis proves safe removal.
- Hidden aliases and redirect wrappers are compatibility surfaces. Classify them as retained unless they are proven unused and non-release.
- `generated_from_existing_page` is contractization debt and must not be promoted to `contract_ready` without manual business contract review.
- BFF code must not own business logic, direct DB writes, or lifecycle/status mutation unless an explicit contract allowlist says so.
- Frontend services that call APIs must map through `serviceFunction -> frontendPath -> bffPath -> fastApiPath`.
- Lifecycle mutation must insert an operation/process/lifecycle transaction record before updating current state.

## Naming and Data Access Contracts

- Pipeline adlandirma ve sozluk kontrati: frontend labels may be Turkish, but service/data keys stay canonical and typed.
- Pipeline naming contract: frontend service, BFF proxy, FastAPI endpoint, Pydantic schema, service command, and repository input must preserve canonical field names.
- Veritabani adlandirma kontrati: database-facing names follow backend schema contracts; UI aliases do not become persistence aliases.

## Related Contracts

- `contracts/**`
- `contracts/api/**/*.contract.ts`
- `contracts/page-flow-contracts.json`

## Related Guards

- `scripts/check-contract-standardization.js`
- `scripts/check-backend-contract-drift.js`
- `scripts/check-lifecycle-operation-guard.js`
- `scripts/check-doc-source-of-truth.js`
- `scripts/generate-code-legacy-inventory.js`
- `scripts/check-code-legacy-inventory.js`
