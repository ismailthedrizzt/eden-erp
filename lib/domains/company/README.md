# Company Domain

Company Domain owns the legal company card, lifecycle events and official company change transactions.

It does not own ownership calculations, representative authority scopes, branch internal organization, facility lifecycle or accounting postings. Future service migration should move company opening, liquidation, deregistration, title change, address change, public registration update, NACE update and activity subject change logic here.

## Owns

- `companies`
- `company_lifecycle_events`
- `company_opening_details`
- `company_liquidation_details`
- `company_deregistration_details`
- `company_official_change_transactions`

## Does Not Own

- Ownership distribution
- Representative authority scope
- Branch internal organization
- Facility lifecycle
- Accounting postings

## Service Functions

- `getCompanyById`
- `assertCompanyActive`
- `assertCompanyNotDeregistered`
- `updateOfficialCompanyFields`
- `getCompanyLifecycle`
- `getCompanyDetailReadModel`

## Cross-Domain Rules

- Company can start capital increase or branch opening orchestration, but ownership and branch mutations belong to their own domain services.
- Active/lifecycle official fields are changed through official operations, not normal form edit.

## Events

- `company.created`
- `company.updated`
- `company.opened`
- `company.title_changed`
- `company.address_changed`
- `company.capital_increased`
