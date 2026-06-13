# Current Database Target Safety Snapshot

Date: 2026-06-06
Branch: `main`
Commit: `9b1b0297ce4171cd85d0154ed4bd9a2ebc2e8d7d`
Working environment: remote server release runtime

## Tested Commands

- `npm run db:target:check`: PASS
- `npm run env:safety`: PASS
- `npm run db:migrate` was not executed in this freeze; no schema change was required.

## DB Target Result

`npm run db:target:check` reported:

- Environment: `release`
- Database target: `postgresql://***:***@localhost:5432/app1db`
- Database name: `app1db`
- Database class: `release`
- Result: PASS

## Inspected Files

| File | Finding |
| --- | --- |
| `backend/app/core/database.py` | FastAPI creates async SQLAlchemy engine from `settings.async_database_url`; no DB URL means `DatabaseConfigurationError`. |
| `backend/app/core/config.py` | `DATABASE_URL` is canonical DB input. Supabase compatibility fields still exist. |
| `backend/alembic.ini` | Alembic script location is `migrations`; placeholder URL in ini, runtime env is handled by migration tooling. |
| `backend/migrations/**` | Alembic migration versions exist through `20260606_0100_document_file_dedup.py`. |
| `docker-compose.yml` | Does not manage PostgreSQL; expects host-managed local PostgreSQL. |
| `backend/Dockerfile` | Backend container can run Python directly. |
| `Dockerfile.next` | Next container build/run only; no DB service. |
| `package.json` | DB scripts use `scripts/check-database-target.js`; migration uses `backend/.venv/bin/alembic upgrade head`. |
| `scripts/check-database-target.js` | Active DB target guard. |
| `scripts/reset-public-schema.js` | Reset script exists but is protected by command context scripts. |

## Answers

| Question | Baseline answer |
| --- | --- |
| DB access nereden yapılıyor? | Canonical DB access is FastAPI via SQLAlchemy async engine and Alembic migrations. Some legacy TS Supabase modules still exist but are not canonical. |
| Next doğrudan DB’ye erişiyor mu? | `backend:boundary:enforce` reports `app/api` direct DB/Supabase access: 0. However, server TS files with direct DB/Supabase access: 47. |
| FastAPI canonical DB access mi? | Yes, for the target architecture and active BFF migration guard. |
| Worker DB access var mı? | Worker modules exist under `backend/app/workers`; compose worker uses backend DB env and optional `WORKER_DB_POOL_SIZE`. Live PM2 worker was not confirmed. |
| Migration sistemi nerede? | Alembic in `backend/migrations`, invoked through `npm run db:migrate`. |
| Seed/reset güvenliği var mı? | `demo:seed`, `db:migrate`, and reset scripts call `scripts/check-database-target.js` with command context. |
| Release DB koruması var mı? | Yes. `db:target:check` and `env:safety` passed; release migrations require explicit approval env in previous runs. |

## P0/P1/P2 Risks

| Priority | Risk | Impact | Next action |
| --- | --- | --- | --- |
| P0 | None confirmed | Active DB target guard passes against local release DB. | Keep guard mandatory. |
| P1 | 47 server TS files with direct DB/Supabase risk reported during build audit | Non-canonical paths may still exist outside `app/api`. | Continue TS backend removal/migration. |
| P1 | Legacy Supabase config fields remain in backend settings | Auth/storage/DB operator confusion. | Remove or isolate compatibility settings. |
| P2 | `python` global missing on host | Manual migration/test commands fail if not using `.venv`. | Document venv command standard. |

## Next Phase Impact

Any cleanup that touches DB scripts must preserve:

- `db:target:check`
- release migration approval guard
- local DB masking in reports
- Alembic as canonical migration path
