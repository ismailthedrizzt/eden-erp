# Incident Response Runbook

Date: 2026-06-06

## Purpose

Provide first-response steps for common Eden ERP remote server incidents.

## Current State

PM2 runs app/backend. Logs are available through PM2 and host services. Reverse proxy and PostgreSQL logs are outside repo.

## Target State

Every incident has an owner, severity, first checks, mitigation, permanent fix and postmortem note.

## Incidents

| Incident | Symptom | First Check | Logs | Temporary Fix | Permanent Fix | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| App does not open | 502/blank page | `pm2 status`, `/login` curl | PM2 app, reverse proxy | restart `eden-app` | fix build/env/proxy | P0/P1 |
| Login broken | OTP/auth fails | `env:safety`, FastAPI auth endpoint | Next, FastAPI | restart app/backend, disable field test | fix auth/env/local DB | P0 |
| DB connection lost | API 500/health fail | `db:target:check`, PostgreSQL service | FastAPI, PostgreSQL | stop writes, restore DB service | DB capacity/credentials fix | P0 |
| Migration failed | startup/schema errors | Alembic status, recent migration | FastAPI, migration logs | app rollback, stop workers | migration fix/restore | P0 |
| Worker backlog grows | delayed events/email | outbox status counts | worker logs | restart/pause worker | idempotency/retry fix | P1/P0 |
| Document upload fails | upload/preview broken | storage root writable | FastAPI, media route | pause uploads | storage permission/backup fix | P1/P0 |
| Disk full | writes fail | disk usage | system logs | clear safe caches/log rotate | capacity/backup policy | P0 |
| CPU/RAM high | slow app | process status/top | PM2/system | restart, reduce workers | performance fix | P1 |
| Wrong DB connected | unexpected data | `db:target:check` | env/DB logs | stop app/workers | env correction + audit | P0 |
| Release shows development page | hidden routes visible | release registry, env | Next logs | block route/restart | registry/env fix | P0/P1 |
| User sees technical error | stack trace/error leak | reproduce route | Next/FastAPI logs | hide route/restart | error handling fix | P1 |
| Unauthorized data suspicion | wrong tenant/scope | audit logs, context headers | FastAPI/audit | freeze access | security fix/postmortem | P0 |

## Commands

```bash
pm2 status
pm2 logs eden-app
pm2 logs eden-fastapi
npm run env:safety
npm run db:target:check
```

## Minimum Log Rules

- Include `request_id` and `correlation_id`.
- Do not show stack traces to users.
- Do not log secrets.
- Do not log raw `DATABASE_URL`.
- Mask storage paths in user-facing errors.

## Field Test Impact

Any P0 incident pauses field testing until root cause is understood and mitigation is verified.

## Production/Release Impact

P0 incidents require incident commander, deploy freeze, backup preservation and postmortem.
