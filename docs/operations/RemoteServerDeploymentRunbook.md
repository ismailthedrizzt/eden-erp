# Remote Server Deployment Runbook

## Changed Files

- `docs/operations/RemoteServerDeploymentRunbook.md`
- `docker-compose.yml`
- `package.json`

## Why Changed

Deployment is now remote server + local PostgreSQL/local DB, not Vercel/Supabase.

## Topology

```text
Reverse Proxy
  /                 -> Next.js :3000
  /api              -> Next.js BFF
  /api/v1           -> FastAPI :8000 or Next proxy
  /api/media/open   -> Next proxy -> FastAPI document media

Processes:
  eden-app
  eden-fastapi
  eden-outbox-worker
  optional email/reminder/reporting/automation/webhook workers

Database:
  host-managed local PostgreSQL
  eden_development_db
  eden_release_db, when ready
```

## Environment

- `DATABASE_URL`
- `APP_SESSION_SECRET`
- `FASTAPI_BASE_URL`
- `INTERNAL_BACKEND_TOKEN`
- `TRUSTED_PROXY_SECRET`
- `ALLOW_TRUSTED_PROXY_HEADERS=true` when Next proxies to FastAPI

## Deployment Steps

1. Pull latest `main`.
2. Run `npm run db:target:check`.
3. Run `npm run env:safety`.
4. Run `npm run build`.
5. Restart `eden-app`.
6. Restart `eden-fastapi` only if backend changed.
7. Check PM2 status and protected route redirect/login behavior.

## Rollback

1. Identify previous git commit.
2. `git checkout <commit>` only with explicit operator approval.
3. Rebuild and restart.
4. Restore DB backup if schema/data changed.

## P0/P1/P2

- P0: deploy without DB target check.
- P0: release env missing session/proxy secrets.
- P1: worker process not restarted after backend worker change.
- P2: compose DB not managed.

## Field Test Impact

Field test operators have a single remote-server deployment path.

## Remaining Risks

PostgreSQL is expected as a host service; compose DB service is a future development-only task.
