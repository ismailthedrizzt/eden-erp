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
- `npm run validate:contracts`
- `npm run build`

Do not weaken guards, convert errors to warnings, or add broad exceptions to pass a check.

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
- `scripts/check-doc-source-of-truth.js`
