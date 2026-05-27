# Rollback Strategy

## Application Rollback

- Roll back Next.js deployment independently when only frontend/BFF behavior regresses.
- Roll back FastAPI deployment independently when backend endpoint behavior regresses.
- Roll back worker deployment or pause workers if background processing causes incidents.

## Migration Bridge

Some Next routes still keep legacy fallback while FastAPI migration is validated. This can help emergency rollback, but it is not the target architecture.

## Database Rollback

- Prefer non-destructive migrations.
- Keep backup/restore checkpoint before risky data migrations.
- Index migrations can often remain after application rollback.
- Destructive migrations require manual approval and explicit reverse plan.

## Incident Data

Capture:

- `request_id`
- `correlation_id`
- `operation_id`
- `tenant_id`
- deployment version
- affected route/worker id

## Emergency Actions

- Disable feature flag.
- Route traffic back to previous deployment.
- Pause worker.
- Freeze migrations.
- Drain or inspect outbox backlog before resuming.
