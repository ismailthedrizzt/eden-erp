# Local Database Operations Runbook

## Changed Files

- `docs/operations/LocalDatabaseOperationsRunbook.md`
- `scripts/check-database-target.js`
- `package.json`

## Why Changed

Database operations must protect local PostgreSQL development and release targets.

## Naming

- Development: include `dev`, `development`, `local`, or `test`.
- Release: include `release`, `prod`, or `production`.

## Commands

```bash
npm run db:target:check
npm run db:migrate:check
npm run db:seed:check
npm run db:reset:check
```

Release migrations require:

```bash
ALLOW_RELEASE_DB_MIGRATION=true
RELEASE_MIGRATION_APPROVED_BY=<name>
```

## Backup

```bash
pg_dump "$DATABASE_URL" > backups/eden_$(date +%Y%m%d_%H%M%S).sql
```

## Restore

```bash
psql "$DATABASE_URL" < backups/eden_YYYYMMDD_HHMMSS.sql
```

## P0/P1/P2

- P0: release seed/reset.
- P0: migration without release approval.
- P1: ambiguous DB target.
- P2: manual DB naming drift.

## Field Test Impact

Run DB guard and backup before any field-test migration.

## Remaining Risks

Automated backup scheduling remains separate.
