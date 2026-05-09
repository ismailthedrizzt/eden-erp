# Bank and Card Matching Model

Bank and card matching is prepared through movement status fields and a matching service skeleton.

Supported status values:

- `none`
- `waiting`
- `matched`
- `mismatch_amount`
- `mismatch_date`
- `mismatch_counterparty`
- `not_found`
- `manual_match`

`PreAccountingMatchService` defines the initial extension points:

- `tryMatchInvoice`
- `tryMatchBankMovement`
- `suggestCounterparty`
- `calculateRowHealth`

Future implementations should compare amount, date, counterparty, payment source, uploaded documents, and historical similar movements.
