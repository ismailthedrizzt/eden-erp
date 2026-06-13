# Contract-Based Standardization

<!-- source-of-truth-standard: contract overrides markdown -->

Eden ERP standards are enforced as executable contracts, not only Markdown guidance.

## Contract Locations

- `contracts/core`: shared entity, page, list, form, wizard, API, lifecycle, release, field, and validation contracts.
- `contracts/entities`: canonical entity contracts for companies, partners, representatives, branches, and shareholders.
- `contracts/pages`: page/list contracts imported by real page modules.
- `contracts/api`: frontend request/response/error validation contracts.
- `contracts/lifecycle`: lifecycle boundary contracts for operation-request flows.
- `contracts/release`: release registry bridge for production/staging/development visibility rules.
- `contracts/tests`: reusable contract assertions used by pages and checks.
- `contracts/allowlists`: temporary, owned, expiring exceptions. Silent exceptions are not allowed.

## Adding A Page Or Flow

1. Add or update the entity contract.
2. Add page/list/form/wizard/API/lifecycle contracts as needed.
3. Import the contract into the real page, form, wizard, or API client.
4. Render list columns, primary actions, release visibility, and validation from the contract.
5. Add backend Pydantic/service validation for payloads that cross the API boundary.
6. Add contract tests or static guard coverage.
7. Run `npm run validate:contracts`.

## What Fails The Build

- Missing contract files for an integrated module.
- Page code that does not import and use the page contract.
- Lists whose rendered columns drift from contract keys.
- API contracts missing request, response, error, authorization, tenant scope, or normalization fields.
- Lifecycle contracts that do not require operation records.
- Navigation routes missing release registry entries.
- Forbidden patterns in the contract layer without an explicit exception.

## Temporary Exceptions

Exceptions must be declared in `contracts/allowlists/contract-exceptions.ts` with:

- rule
- file
- reason
- owner
- expiry/removal target

An exception is technical debt with an owner, not a way to silence a failed check.

## Commands

- `npm run contracts:check`
- `npm run validate:contracts`
- `npm run eden:quality-gate -- --quick`

`npm run build` runs `validate:contracts` before `next build`.
