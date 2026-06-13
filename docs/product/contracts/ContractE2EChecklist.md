# Contract E2E Checklist

<!-- source-of-truth-standard: contract overrides markdown -->


Date: 2026-06-06
Branch: main
Commit before work: 56bbffb
Environment: remote server, Next.js UI/BFF, FastAPI canonical backend, local PostgreSQL DB, local document storage.
Release status: Contract Management pages are registered as development; legacy /app/satis/sozlesmeler redirects to /app/sozlesmeler and is hidden.


## Manual Smoke
- Open `/app/sozlesmeler` in development visibility.
- Create a draft through `/app/sozlesmeler/yeni`.
- Open detail page.
- Upload signed contract document in the documents panel.
- Run activation precheck.
- Confirm activation with `Onayla` lifecycle action.
- Try PATCHing active critical fields and expect `CONTRACT_OPERATION_REQUIRED`.
- Verify lifecycle history has created/activated events.

## Automated Baseline
- `npm run typecheck`: PASS
- `npm run build`: PASS, route manifest includes `/app/sozlesmeler` pages
- `npm run release:check`: PASS
- `npm run env:safety`: PASS
- `npm run db:target:check`: PASS
- `npm run openapi:drift`: PASS
- Target backend ruff/mypy for contract files: PASS
- Full backend pytest: 225 passed, 2 existing observability health failures
