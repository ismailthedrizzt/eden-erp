# Backup Restore Readiness Audit

Date: 2026-06-06

## Purpose

Audit backup and restore readiness for field test and release.

## Current State

- Manual backup commands are documented.
- PostgreSQL is local/server DB.
- Document storage is local filesystem under `DOCUMENT_STORAGE_ROOT` or `var/document-storage`.
- Automated backup schedule is not confirmed.
- Restore drill is documented but not confirmed as executed.

## Target State

Before field test:

- DB dump exists.
- Document storage archive exists.
- Env files are securely backed up.
- Restore target and command are known.

Before release migration:

- Fresh DB and document backups.
- Migration approval env.
- Rollback plan.

## Commands

```bash
npm run db:target:check
pg_dump "$DATABASE_URL" > /opt/eden-erp/backups/eden_$(date +%Y%m%d_%H%M%S).sql
tar -czf /opt/eden-erp/backups/documents_$(date +%Y%m%d_%H%M%S).tar.gz <DOCUMENT_STORAGE_ROOT>
psql "$DATABASE_URL" < /opt/eden-erp/backups/<backup-file>.sql
```

## P0/P1/P2 Risks

- P0: no backup before field test/release migration.
- P0: document storage omitted from backup.
- P0: restore target unknown.
- P1: no automated schedule.
- P1: no restore drill.
- P2: old Supabase backup terminology in historical docs.

## Field Test Impact

`READY_WITH_LIMITATIONS`: docs exist; operator must execute backup before test.

## Production/Release Impact

Production requires scheduled backup, retention policy and restore drill evidence.
