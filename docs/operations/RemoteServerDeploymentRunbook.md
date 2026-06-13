# Remote Server Deployment Runbook

<!-- source-of-truth-standard: contract overrides markdown -->

Date: 2026-06-06

## Purpose

Define the repeatable deployment topology for Eden ERP on a remote server with local PostgreSQL/local DB, FastAPI canonical backend, Next.js UI/BFF and local document storage.

## Current State

- Current live process manager is PM2 with `eden-app` and `eden-fastapi`.
- PostgreSQL is host-managed and is not managed by `docker-compose.yml`.
- `DATABASE_URL` points at a local/server PostgreSQL target.
- Next.js is the public UI/BFF layer.
- FastAPI is the canonical backend.
- Document media flows through Next proxy to FastAPI/local storage.
- Worker modules exist; only outbox is the required core worker for MVP operations.

## Target Topology

```text
Reverse Proxy
  app domain -> Next.js :3000
  API/internal route -> FastAPI :8000
  media route -> Next proxy -> FastAPI media endpoint

Processes
  eden-next
  eden-fastapi
  eden-outbox-worker
  eden-email-worker, optional
  eden-reminder-worker, optional
  eden-reporting-worker, optional
  eden-automation-worker, optional
  eden-webhook-worker, optional

Database
  PostgreSQL local/server DB
  eden_development_db
  eden_release_db, release hazir oldugunda

Storage
  local filesystem document storage
  DOCUMENT_STORAGE_ROOT
```

PostgreSQL docker-compose içinde değilse host üzerinde ayrı servis olarak çalışır. Docker Compose sadece web/api/worker çalıştırıyorsa `DATABASE_URL` dışarıdan verilmelidir. Eğer DB compose’a alınacaksa bu ayrı development task olarak `docker-compose.dev-db.yml` veya compose profile ile yapılmalıdır.

## Commands

```bash
git pull
npm run db:target:check
npm run env:safety
npm run typecheck
npm run build
pm2 restart eden-app --update-env
pm2 restart eden-fastapi --update-env
pm2 status
```

FastAPI health candidates:

```bash
curl -sS http://127.0.0.1:8000/health
curl -sS http://127.0.0.1:8000/api/v1/system/health/deep
curl -sS http://127.0.0.1:3000/login
```

## Health And Logs

- Next logs: PM2 logs for `eden-app`.
- FastAPI logs: PM2 logs for `eden-fastapi`.
- Worker logs: PM2/systemd/container logs per worker.
- PostgreSQL logs: host PostgreSQL service logs.
- Reverse proxy logs: hosting panel/nginx/caddy logs outside repo.

Minimum log rule: include `request_id`, `correlation_id`, user-safe error text, no stack trace to users, no secrets, no raw `DATABASE_URL`, and no full unmasked document storage path in user-facing output.

## P0/P1/P2 Risks

- P0: deployment runs without `db:target:check`.
- P0: release env missing `APP_SESSION_SECRET`, `INTERNAL_BACKEND_TOKEN` or trusted proxy secret.
- P0: reverse proxy exposes FastAPI business endpoints publicly while accepting trusted headers.
- P1: outbox worker not running while business events depend on outbox.
- P1: reverse proxy/SSL config not documented outside hosting panel.
- P2: PM2 ecosystem/systemd units not versioned as sanitized templates.

## Field Test Impact

Field test can proceed only if Next, FastAPI, DB target, auth flow, document storage and outbox worker decision are verified.

## Production/Release Impact

Release deployment must run with `APP_ENV=release`, `AUTH_REQUIRED=true`, protected release DB target, no seed/reset, backup before migration, and deterministic process restart.
