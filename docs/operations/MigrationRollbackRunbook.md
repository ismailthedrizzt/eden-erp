# Migration Rollback Runbook

Date: 2026-06-06

## Purpose

Define safe migration and rollback procedure for remote server + local PostgreSQL/local DB.

## Current State

Alembic migrations live under `backend/migrations`. `npm run db:migrate` is guarded by `db:migrate:check`. Release migration requires approval env.

## Target State

Every release migration is preceded by backup and followed by smoke tests. DB rollback is treated as uncertain; backups are mandatory.

## Migration Flow

1. Pull code.
2. Run `npm run env:safety`.
3. Run `npm run db:target:check`.
4. Take DB backup.
5. Take document storage backup if data/media model changed.
6. Review migration files.
7. Run migration dry-run if available.
8. Apply migration:

```bash
ALLOW_RELEASE_DB_MIGRATION=true RELEASE_MIGRATION_APPROVED_BY=<name> npm run db:migrate
```

9. Restart backend.
10. Rebuild/restart Next if frontend changed.
11. Smoke test login, list page, detail page, media/document route and worker backlog.

## Rollback Flow

1. Freeze deploys and stop risky workers.
2. Identify previous known-good commit.
3. Revert app to previous commit only with operator approval.
4. Rebuild/restart app/backend.
5. If schema rollback exists, review and apply carefully.
6. If schema/data is corrupted, restore DB backup.
7. Restore document storage if needed.
8. Check worker backlog and dead letters.
9. Smoke test.

## Important Rule

DB migration rollback is not always possible. Release migration before backup is P0.

## P0/P1/P2 Risks

- P0: release migration without backup.
- P0: rollback uses wrong DB target.
- P1: worker backlog not checked after rollback.
- P2: migration dry-run unavailable.

## Field Test Impact

Field-test DB risk is lower when using development DB, but backup is still required before schema/data experiments.

## Production/Release Impact

Release rollback must preserve data first; application rollback alone may not undo DB changes.
