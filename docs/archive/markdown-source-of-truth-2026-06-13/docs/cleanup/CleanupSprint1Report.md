# Cleanup Sprint 1 Report

Date: 2026-06-06
Branch: main
Commit: 8c6efdd7a7bfd941e6bd492b6f5ed8809e109d4c
Environment: remote server, release app surface, local PostgreSQL/local DB, FastAPI canonical backend, Next.js BFF/proxy


## Scope
Worker/outbox operationalization, backup standard path, authenticated security negative tests, and field-test readiness after cleanup. This sprint did not add business features.

## Changes Made
- Started `eden-outbox-worker` under PM2 and saved the PM2 process list.
- Cleared existing outbox backlog with the canonical outbox worker.
- Standardized the practical backup path to `/home/edengrup-app1/eden-erp-backups` because `/opt/eden-erp/backups` is not available to the app user.
- Took DB and document storage backups with restrictive permissions.
- Fixed FastAPI trusted proxy handling so internal proxy bearer tokens are not treated as legacy external JWTs.
- Fixed the Next FastAPI proxy handler so proxy-only API routes send internal backend context by default.

## Commands Tested
- PM2 worker start/restart/list/save
- Outbox worker `--once`
- `pg_dump` and document storage `tar` backup
- Authenticated negative security probes with generated `eden_app_session` and trusted proxy headers

## Key Findings
- Outbox had 4 pending events before cleanup; all 4 were processed successfully.
- Backup path is operational at `/home/edengrup-app1/eden-erp-backups` with directory mode 700 and backup files mode 600.
- HSTS is present on the public app response.
- The canonical Next BFF to FastAPI path had a real auth break: internal backend bearer tokens were being verified as legacy JWTs, and proxy-only routes were not marking calls as internal. Both were fixed.

## P0/P1/P2
- P0: none open after the targeted auth proxy fix, subject to final build/test completion.
- P1: worker heartbeat/DLQ visibility is operational through PM2 logs and SQL state, but no dedicated admin dashboard endpoint exists yet.
- P1: branch-scope negative tests need real branch test data before release gate.
- P2: `/opt/eden-erp/backups` remains unavailable; documented fallback path is official for this server.

## Next Phase Impact
Field test can proceed with limitations if final build/typecheck/backend tests pass. Security/auth proxy issues found in this sprint should be included in regression smoke tests.

## Final Command And Smoke Baseline

The command baseline passed: `npm run typecheck`, `npm run build`, `npm run release:check`, `npm run env:safety`, `npm run db:target:check`, `npm run migration:status`, `npm run boundaries:check`, `npm run openapi:drift`, backend ruff, backend mypy, and backend pytest. Backend pytest result was 229 passed with 4 deprecation warnings.

Post-build smoke passed for Next BFF own-company access, cross-tenant denial, authorized media access, and media path traversal denial.
