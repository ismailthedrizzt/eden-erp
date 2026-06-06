# Contract Lifecycle


Date: 2026-06-06
Branch: main
Commit before work: 56bbffb
Environment: remote server, Next.js UI/BFF, FastAPI canonical backend, local PostgreSQL DB, local document storage.
Release status: Contract Management pages are registered as development; legacy /app/satis/sozlesmeler redirects to /app/sozlesmeler and is hidden.


## Statuses
`draft`, `under_review`, `approval_pending`, `approved`, `ready_for_signature`, `signed`, `active`, `renewal_pending`, `amendment_pending`, `suspended`, `termination_pending`, `terminated`, `expired`, `archived`, `cancelled`.

## MVP Actions
- `activate_contract`
- `renew_contract`
- `amend_contract`
- `suspend_contract`
- `terminate_contract`
- `archive_contract`

## Rule
`Ekle` creates a draft. Active/lifecycle-controlled fields cannot be changed by normal PATCH. Backend returns `CONTRACT_OPERATION_REQUIRED` for lifecycle fields such as status, effective dates, end date, renewal date, termination date, value, currency, payment terms and primary party changes.
