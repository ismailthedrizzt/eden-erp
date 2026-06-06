# Contract Known Gaps


Date: 2026-06-06
Branch: main
Commit before work: 56bbffb
Environment: remote server, Next.js UI/BFF, FastAPI canonical backend, local PostgreSQL DB, local document storage.
Release status: Contract Management pages are registered as development; legacy /app/satis/sozlesmeler redirects to /app/sozlesmeler and is hidden.


## MVP Gaps
- E-signature is not implemented.
- Contract text editor and clause management are not implemented.
- Legal risk AI and OCR clause extraction are not implemented.
- Customer portal approval is not implemented.
- Automatic invoice/payment plan generation is not implemented.
- Scheduled Action Center worker for renewal/expiry is prepared conceptually but not wired in this phase.
- Advanced approval workflow is not implemented.
- Migration `20260606_0300_contract_management_mvp.py` is added but was not applied to release DB in this implementation turn.
