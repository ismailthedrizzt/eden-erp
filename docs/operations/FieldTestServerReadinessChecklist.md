# Field Test Server Readiness Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

Date: 2026-06-06

## Purpose

Define the minimum server readiness checklist before manual field testing.

## Current State

Next and FastAPI run under PM2. Local DB target guard passes. Backup automation and worker heartbeat are not confirmed.

## Target State

Field test begins only after core runtime, auth, DB, document storage, backup and worker decisions are verified.

## Checklist

| Check | Required Result | Status |
| --- | --- | --- |
| Next app opens | `/login` renders | Required |
| FastAPI opens | health endpoint responds | Required |
| DB health | DB target check passes | Required |
| Login works | OTP -> app session cookie | Required |
| App session cookie | `eden_app_session` set, httpOnly | Required |
| Outbox worker | running or explicitly out of test scope | Required |
| `DOCUMENT_STORAGE_ROOT` | writable | Required |
| Document upload | upload and preview/download smoke | Required |
| DB backup | current dump exists | Required |
| Document backup | storage archive exists | Required |
| Release seed/reset | blocked by guard | Required |
| Env separation | no development/release DB mix | Required |
| User-facing errors | no stack traces/secrets | Required |

## Decision

Current decision: `READY_WITH_LIMITATIONS`.

Limitations:

- Worker heartbeat is not confirmed.
- Automated backup schedule is not confirmed.
- Full backend pytest still has one known health-test failure unrelated to this operations phase.

## Commands

```bash
npm run env:safety
npm run db:target:check
npm run build
pm2 status
curl -sS http://127.0.0.1:3000/login
curl -sS http://127.0.0.1:8000/api/v1/system/health/deep
```

## P0/P1/P2 Risks

- P0: no backup before field test.
- P0: login broken.
- P0: document storage not writable.
- P1: outbox worker stopped while async flows are in scope.
- P2: no monitoring dashboard.

## Field Test Impact

Manual field testing can proceed only after required rows are marked pass or explicitly out of scope.

## Production/Release Impact

Release requires the same checks plus stricter backup/restore drill and supervised workers.
