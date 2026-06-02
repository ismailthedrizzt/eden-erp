# Eden ERP Python Workers

This folder contains the first Python worker MVP for background platform jobs.

## Outbox worker

Run one batch:

```bash
python -m app.workers.outbox_worker --once
```

Run loop mode:

```bash
python -m app.workers.outbox_worker
```

Environment:

- `DATABASE_URL`
- `OUTBOX_BATCH_SIZE`
- `OUTBOX_POLL_INTERVAL_SECONDS`
- `WORKER_ID`

The worker dispatches queued outbox events through idempotent handlers. Current handlers are safe MVP placeholders for projection invalidation, Action Center, audit and AI context refresh.
