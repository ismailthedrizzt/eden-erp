# Local Database Architecture Audit

Date: 2026-06-06
Branch: `main`
Commit: `09e90b5588a43af147d75b2926d5368a6f4635b9`
Environment: remote server release runtime

## Findings

| Question | Answer |
| --- | --- |
| FastAPI DB access canonical mi? | Yes. `backend/app/core/database.py` creates the SQLAlchemy async engine from `DATABASE_URL`. |
| Next dogrudan DB'ye erisiyor mu? | `backend:boundary:enforce` reports 0 direct DB/Supabase access in `app/api`, but build audit still reports 47 server TS files with direct DB/Supabase risk outside the proxy-only route surface. |
| Migration nasil yapilir? | `npm run db:migrate` calls DB target guard then `backend/.venv/bin/alembic upgrade head`. |
| Reset/seed release DB'ye zarar verebilir mi? | Guard scripts exist. Risk remains only if operators bypass scripts and run raw SQL/tools manually. |
| DB adi/pattern ayrimi var mi? | `scripts/check-database-target.js` classifies target; release baseline is `localhost:5432/app1db` with release class. |
| Backup/restore dokumante mi? | `docs/operations/LocalDatabaseOperationsRunbook.md` includes `pg_dump` and `psql` examples. Automated scheduling remains separate. |
| Worker DB pool ayrimi var mi? | Yes in config: `WORKER_DB_POOL_SIZE`; compose worker sets it to `2`. Live worker not confirmed. |

## P0 Checks

| P0 condition | Baseline |
| --- | --- |
| Release DB seed/reset risk | Not confirmed; guard scripts exist. |
| `DATABASE_URL` secret client leak | Not confirmed; `DATABASE_URL` is server/backend env, not `NEXT_PUBLIC`. |
| Migration target ambiguous | Not confirmed; `db:target:check` passed. |

## Risks

| Priority | Risk | Fix |
| --- | --- | --- |
| P1 | 47 server TS files still carry DB/Supabase risk. | Remove TS runtime backend code or convert to shared contracts. |
| P1 | Manual DB commands can bypass guard. | Require runbook and operator approval for raw DB work. |
| P2 | Automated backup schedule not documented as live. | Add backup schedule/run verification. |

## Decision

`READY_WITH_LIMITATIONS`
