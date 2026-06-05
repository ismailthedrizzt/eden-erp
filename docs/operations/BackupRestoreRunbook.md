# Backup Restore Runbook

## Scope

This runbook covers the remote server + local PostgreSQL/local DB deployment. Supabase backup terminology is deprecated.

## Changed Files

- `docs/operations/BackupRestoreRunbook.md`
- `docs/operations/LocalDatabaseOperationsRunbook.md`
- `docs/operations/RemoteServerDeploymentRunbook.md`

## Why Changed

Field test backup/restore must protect the server-local PostgreSQL database, document storage root and service env files rather than Supabase/Vercel resources.

## Backup Checklist

- Confirm `DATABASE_URL` points at the intended DB.
- Run `npm run db:target:check`.
- Capture service env files without committing them.
- Dump PostgreSQL before migration or field test.
- Archive local document storage root.

## PostgreSQL Backup

```bash
mkdir -p backups
pg_dump "$DATABASE_URL" > backups/eden_$(date +%Y%m%d_%H%M%S).sql
```

## PostgreSQL Restore

```bash
psql "$DATABASE_URL" < backups/eden_YYYYMMDD_HHMMSS.sql
```

For release DB restore, stop writers first, verify the backup timestamp, and restart `eden-fastapi`, `eden-app` and worker processes after restore.

## Local Document Storage

Document files live under `DOCUMENT_STORAGE_ROOT` or `var/document-storage` by default.

```bash
tar -czf backups/eden_documents_$(date +%Y%m%d_%H%M%S).tgz var/document-storage
```

## P0/P1/P2 Risks

- P0: release migration without a fresh DB backup.
- P0: restore into the wrong DB target.
- P1: document storage archive missing.
- P2: old Supabase backup references confusing operators.

## Field Test Impact

Field test may proceed only after a successful DB dump and document storage archive.

## Remaining Risks

- Automated backup scheduling is still a separate operations task.
- Restore drills should be run before a live release cutover.
