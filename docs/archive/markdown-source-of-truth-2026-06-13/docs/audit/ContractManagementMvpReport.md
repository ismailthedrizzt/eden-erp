# Contract Management MVP Report


Date: 2026-06-06
Branch: main
Commit before work: 56bbffb
Environment: remote server, Next.js UI/BFF, FastAPI canonical backend, local PostgreSQL DB, local document storage.
Release status: Contract Management pages are registered as development; legacy /app/satis/sozlesmeler redirects to /app/sozlesmeler and is hidden.


## What Changed
- Added FastAPI contract domain scaffold: schemas, registry, service, lifecycle helpers, document requirement registry and API router.
- Added database migration `20260606_0300_contract_management_mvp.py` with `contracts`, parties, relations, obligations, milestones and events tables.
- Added proxy-only Next API routes under `/api/contracts/**`.
- Added independent UI module under `/app/sozlesmeler` with list, create, detail, documents, obligations and event timeline panels.
- Added module contract, permissions, route release registry and sidebar navigation.
- Redirected old `/app/satis/sozlesmeler` to `/app/sozlesmeler` and hid it in release registry.

## Architecture Alignment
- Next.js remains UI/BFF/proxy.
- FastAPI owns CRUD, lifecycle validation, permission checks and DB mutation.
- Local PostgreSQL remains canonical data store.
- Document Management owns files and document relations.
- No Supabase/Vercel path was added.

## Command Baseline
| Command | Result | Notes |
| --- | --- | --- |
| `npm run typecheck` | PASS | Targeted TypeScript check passed. |
| `npm run build` | PASS | Build log produced `/app/sozlesmeler` route manifest. Existing lint warnings remain. |
| `npm run release:check` | PASS | 146 registry routes, 146 page routes. |
| `npm run env:safety` | PASS | release env safety passed. |
| `npm run db:target:check` | PASS | release DB classified as release. |
| `npm run openapi:drift` | PASS | OpenAPI export/generate completed without drift. |
| `npm run migration:status` | PASS | 0 P0 missing headers; 0 temporary fallback routes. |
| `npm run boundaries:check` | PASS with warnings | 0 critical errors; existing warnings plus contract UI service imports. |
| `backend .venv ruff target` | PASS | `app/api/v1/contracts.py app/domains/contracts`. |
| `backend .venv mypy target` | PASS | Contract files only. |
| `backend .venv pytest app/tests` | FAIL baseline | 225 passed, 2 existing observability health auth failures. |
| `backend .venv ruff check .` | FAIL baseline | 94 existing errors outside contract target. |
| `backend .venv mypy app` | FAIL baseline | Existing `app/api/v1/accounting.py:596`. |

## P0/P1/P2 Risks
- P0: Do not expose contract pages in release before migration is applied and permissions are granted.
- P1: Action Center scheduled renewal/expiry worker is not wired yet.
- P1: Full backend ruff/mypy baseline still has pre-existing accounting/auth/partners/representatives debts.
- P2: UI wizard components are MVP wrappers around lifecycle actions; richer multi-step forms remain future work.

## Next Step
Apply migration to the intended DB with normal DB target guard and backup policy, grant `contracts.*` permissions, then smoke test draft creation, document upload and activation.
