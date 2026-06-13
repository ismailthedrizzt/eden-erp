# Worker Outbox Fix Report

Date: 2026-06-06
Branch: main
Commit: 8c6efdd7a7bfd941e6bd492b6f5ed8809e109d4c
Environment: remote server, release app surface, local PostgreSQL/local DB, FastAPI canonical backend, Next.js BFF/proxy


## Current State
PM2 now has `eden-outbox-worker` online alongside `eden-app` and `eden-fastapi`. The worker command is the backend virtualenv Python module runner for `app.workers.outbox_worker`.

## Backlog Clearance
Before cleanup, the outbox had 4 pending events: one representative event and three document upload events. Running the worker once completed all 4. After the PM2 loop worker started, no pending, failed, dead-letter, or processing rows remained.

## Visibility
Worker logs show repeated polling batches with zero pending work and no errors. PM2 restart count for the new worker was 0 during verification.

## Risks
- P0: none observed.
- P1: no first-class heartbeat dashboard yet.
- P1: DLQ is represented by outbox status, but operational UI is still future work.
- P2: PM2 command inventory should be mirrored into a formal systemd/compose deployment later.

## Next Action
Keep `eden-outbox-worker` in PM2 for field test and add dashboard/health visibility in the next operations hardening sprint.
