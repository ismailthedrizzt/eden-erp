# Contract Real Data Scenarios

<!-- source-of-truth-standard: contract overrides markdown -->


Date: 2026-06-06
Branch: main
Commit before work: 56bbffb
Environment: remote server, Next.js UI/BFF, FastAPI canonical backend, local PostgreSQL DB, local document storage.
Release status: Contract Management pages are registered as development; legacy /app/satis/sozlesmeler redirects to /app/sozlesmeler and is hidden.


## Scenarios
1. Sales contract draft is created for a customer.
2. Signed contract PDF is uploaded inside the contract detail.
3. The same file is uploaded again; Document Management reuses the existing file.
4. Contract activation precheck requires owner, counterparty, start date and signed contract document.
5. Active contract value/date changes are rejected by normal card update and routed to amendment/renewal lifecycle operations.
6. Lease, employment, maintenance and project contracts can be related through `contract_relations` and related entity columns.
