# Backup Standard Path Fix Report

Date: 2026-06-06
Branch: main
Commit: 8c6efdd7a7bfd941e6bd492b6f5ed8809e109d4c
Environment: remote server, release app surface, local PostgreSQL/local DB, FastAPI canonical backend, Next.js BFF/proxy


## Decision
Official path for this server: `/home/edengrup-app1/eden-erp-backups`.

`/opt/eden-erp/backups` is not present and is not writable by the application user without privileged server work. The selected fallback is outside the public web root and owned by the app user.

## Verification
- Backup directory exists.
- Directory mode: 700.
- DB backup created with `pg_dump`.
- Document storage backup created with `tar`.
- Backup files set to mode 600.
- Public-root risk: no.

## Backup Artifacts
- DB backup: `/home/edengrup-app1/eden-erp-backups/eden_20260606_160501.sql`
- Document backup: `/home/edengrup-app1/eden-erp-backups/documents_20260606_160501.tar.gz`

## Risks
- P0: no backup before field test. Fixed.
- P1: restore dry-run is not yet executed.
- P2: privileged standardization to `/opt/eden-erp/backups` can be done later if desired.
