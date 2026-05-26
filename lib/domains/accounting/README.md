# Accounting Domain

Accounting Domain owns account cards, account movements, bank movements, payments, collections and invoice reconciliation.

It does not create ownership rights or make the legal capital increase decision. Capital increase is born in Company and Ownership Domains; Accounting reconciles cash/payment results.

## Owns

- Account cards
- Account movements
- Bank accounts/cards
- Payment and collection records
- Invoice reconciliation

## Does Not Own

- Legal ownership rights
- Capital increase decision
- Representative authority

## Service Functions

- Placeholder only in this phase.
- Future: `postPayment`, `postCollection`, `reconcileCapitalPayment`.

## Cross-Domain Rules

- Accounting can consume capital/ownership events for reconciliation.
- Accounting must not update ownership ratios directly.

## Events

- `accounting.payment_posted`
- `accounting.collection_posted`
- `accounting.reconciliation_completed`

## Business Rules

- Capital payment is financial reconciliation; it is not the legal ownership transaction itself.
