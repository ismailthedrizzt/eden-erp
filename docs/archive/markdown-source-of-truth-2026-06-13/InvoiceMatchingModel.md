# Invoice Matching Model

Invoice matching is workflow-ready but intentionally skeletal in the first accounting module.

Supported status values:

- `none`
- `waiting`
- `matched`
- `mismatch_amount`
- `mismatch_counterparty`
- `rejected`
- `cancelled`
- `disputed`
- `approved`
- `posted`

If an invoice is rejected or cancelled, the related movement must be flagged, the confirmed document match removed, row health recalculated, and audit history written. The movement must not be physically deleted.
