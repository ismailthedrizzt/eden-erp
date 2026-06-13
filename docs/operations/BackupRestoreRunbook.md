# Backup Restore Runbook

<!-- source-of-truth-standard: contract overrides markdown -->

Date: 2026-06-06

## Purpose

Define minimum DB, document storage and env backup/restore procedures for remote server + local PostgreSQL/local DB.

## Current State

PostgreSQL is local/server managed. Document storage is local filesystem under `DOCUMENT_STORAGE_ROOT` or `var/document-storage`. Automated backup scheduling is not confirmed.

## Target State

Before field test or release migration, capture:

- PostgreSQL dump.
- Document storage archive.
- Secure env file backup.
- Restore procedure and target DB confirmation.

## Commands

Create backup directory:

```bash
mkdir -p /opt/eden-erp/backups
```

PostgreSQL backup:

```bash
pg_dump "$DATABASE_URL" > /opt/eden-erp/backups/eden_$(date +%Y%m%d_%H%M%S).sql
```

PostgreSQL restore:

```bash
psql "$DATABASE_URL" < /opt/eden-erp/backups/<backup-file>.sql
```

Document storage backup:

```bash
tar -czf /opt/eden-erp/backups/documents_$(date +%Y%m%d_%H%M%S).tar.gz <DOCUMENT_STORAGE_ROOT>
```

Document storage restore:

```bash
tar -xzf /opt/eden-erp/backups/documents_<timestamp>.tar.gz -C /
```

## Release Migration Checklist

- DB backup alınmış.
- Document storage backup alınmış.
- Env file güvenli yedeklenmiş.
- Migration dosyaları review edilmiş.
- `npm run db:target:check` geçmiş.
- `npm run env:safety` geçmiş.
- `ALLOW_RELEASE_DB_MIGRATION=true` set edilmiş.
- `RELEASE_MIGRATION_APPROVED_BY=<name>` set edilmiş.
- Rollback/restore planı hazır.

## P0/P1/P2 Risks

- P0: field test before any backup.
- P0: document storage is outside backup scope.
- P0: restore method is unknown.
- P1: backup not tested with restore drill.
- P2: backup schedule not automated.

## Field Test Impact

Minimum field test readiness requires a manual DB dump and document storage archive.

## Production/Release Impact

Release migrations cannot proceed without fresh backup and documented restore target.
