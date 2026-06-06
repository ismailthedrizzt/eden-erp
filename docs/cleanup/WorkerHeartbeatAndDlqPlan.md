# Worker Heartbeat And DLQ Plan

Date: 2026-06-06
Branch: main
Commit: 8c6efdd7a7bfd941e6bd492b6f5ed8809e109d4c
Environment: remote server, release app surface, local PostgreSQL/local DB, FastAPI canonical backend, Next.js BFF/proxy


## Current Minimum
- PM2 process: `eden-outbox-worker`
- Logs: PM2 logs for worker batches
- Backlog query: outbox rows grouped by `status`
- DLQ representation: rows with `dead_letter` status or exhausted retry state

## Target State
- Worker heartbeat table or endpoint with worker id, last seen, last batch counts, and last error.
- Admin-visible outbox backlog summary.
- Manual retry and DLQ review flow.

## P0/P1/P2
- P0: worker missing while critical event delivery depends on it. Fixed for outbox.
- P1: no heartbeat endpoint/dashboard.
- P1: no manual retry UI.
- P2: richer notification metrics and alert thresholds.

## Field Test Impact
Acceptable with limitation: PM2 and SQL visibility are enough for manual field test, but not enough for mature production operations.
