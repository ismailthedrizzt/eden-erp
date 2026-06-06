# Local Database Operations Runbook

Date: 2026-06-06

## Purpose

Protect local/server PostgreSQL targets during migration, seed, reset, backup and field-test operations.

## Current State

`DATABASE_URL` points at a host-managed PostgreSQL target. `scripts/check-database-target.js` is the canonical guard. Compose does not manage DB lifecycle.

## Target State

Use clear DB naming and explicit target class:

- `eden_development_db`
- `eden_release_db`
- `DATABASE_TARGET_CLASS=development` or `release` when the DB name is intentionally neutral

## Commands

```bash
npm run db:target:check
npm run db:migrate:check
npm run db:seed:check
npm run db:reset:check
npm run db:migrate
```

Development migration:

```bash
npm run db:migrate:check
cd backend
.venv/bin/alembic upgrade head
```

Release migration:

```bash
npm run env:safety
npm run db:target:check
pg_dump "$DATABASE_URL" > /opt/eden-erp/backups/eden_$(date +%Y%m%d_%H%M%S).sql
ALLOW_RELEASE_DB_MIGRATION=true RELEASE_MIGRATION_APPROVED_BY=<name> npm run db:migrate
```

Seed/reset:

- Development seed can run after `db:seed:check`.
- Release seed is forbidden.
- Development reset can run only after `db:reset:check`.
- Release reset is forbidden.

## DATABASE_URL Safety

- Server-only.
- Must not use `NEXT_PUBLIC_`.
- Must not be logged.
- `.env` files must not be committed.
- DB commands fail if `DATABASE_URL` is missing.

## P0/P1/P2 Risks

- P0: release seed/reset.
- P0: release migration without backup and approval env.
- P0: `DATABASE_URL` leaks into client bundle/logs.
- P1: ambiguous DB name without `DATABASE_TARGET_CLASS`.
- P2: backup scheduling not automated.

## Field Test Impact

Field test can run on development/local DB after a successful backup and guard check.

## Production/Release Impact

Release DB is a protected asset. Backup, approval env and rollback plan are mandatory before schema changes.
