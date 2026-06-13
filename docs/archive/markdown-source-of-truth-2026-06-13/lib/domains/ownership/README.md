# Ownership Domain

Ownership Domain owns partner cards, ownership transactions and current ownership read models.

It does not own the company base record, accounting cash collection/payment records or representative authorities. Capital increase may start from Company Domain, but ownership impact belongs here.

## Owns

- `company_partners`
- `ownership_transactions`
- `v_current_ownership`
- `partner_ownership_lifecycle_events`

## Does Not Own

- Company base record
- Accounting payment/collection records
- Representative authority

## Service Functions

- `getCurrentOwnershipForCompany`
- `assertCurrentOwnershipReadable`
- `assertHasActivePartners`
- `validateOwnershipDistribution`
- `getPartnerById`
- `listPartnersForCompany`
- `buildOwnershipSnapshot`

## Cross-Domain Rules

- Capital increase may be initiated from Company Domain, but ownership impact belongs here.
- Accounting reconciles payment; it does not create legal ownership rights.
- Current ownership projection/read model is required for capital increase prechecks.

## Events

- `partner.created`
- `partner.updated`
- `ownership.transaction_created`
- `ownership.transaction_approved`
- `ownership.transaction_completed`
- `ownership.transaction_cancelled`
- `ownership.transaction_reversed`
