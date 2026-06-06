# Process Manager Runbook

Date: 2026-06-06

## Purpose

Define process management options for Next.js, FastAPI and worker processes on the remote server.

## Current State

The current server uses PM2 for `eden-app` and `eden-fastapi`. Worker process status is not confirmed as always-on.

## Target State

Release should use either systemd or Docker Compose with restart policy. PM2 can remain a short-term bridge, especially for Next.js, but worker and FastAPI services need clear commands, env file, logs and restart behavior.

## Option A: systemd

Recommended for production/release when the host is managed directly.

Example units:

| Process | Working Directory | Command | Env File | Restart |
| --- | --- | --- | --- | --- |
| `eden-next.service` | `/opt/eden-erp` | `npm run start` | `/etc/eden-erp/env` | `always` |
| `eden-fastapi.service` | `/opt/eden-erp/backend` | `uvicorn app.main:app --host 127.0.0.1 --port 8000` | `/etc/eden-erp/env` | `always` |
| `eden-outbox-worker.service` | `/opt/eden-erp/backend` | `python -m app.workers.outbox_worker` | `/etc/eden-erp/env` | `always` |
| `eden-email-worker.service` | `/opt/eden-erp/backend` | `python -m app.workers.email_worker` | `/etc/eden-erp/env` | `always` |
| `eden-reminder-worker.service` | `/opt/eden-erp/backend` | `python -m app.workers.reminder_worker` | `/etc/eden-erp/env` | `always` |

## Option B: Docker Compose

Practical for small deployments. `web`, `api` and `worker` containers can run with restart policies. PostgreSQL may remain host-managed. `DATABASE_URL` must be provided externally.

## Option C: PM2 + systemd

Current short-term path. PM2 can supervise Next and FastAPI, and PM2 itself should be registered with systemd. Less ideal for Python workers than systemd/compose, but acceptable for field test if logs and restart behavior are known.

## Commands

PM2:

```bash
pm2 status
pm2 restart eden-app --update-env
pm2 restart eden-fastapi --update-env
pm2 logs eden-fastapi
```

systemd:

```bash
systemctl status eden-fastapi
systemctl restart eden-fastapi
journalctl -u eden-fastapi -n 100
```

Docker Compose:

```bash
docker compose config
docker compose up -d
docker compose logs api
```

## P0/P1/P2 Risks

- P0: release process has no restart policy.
- P0: env file missing auth/DB secrets.
- P1: workers not supervised.
- P1: logs are not discoverable during incident.
- P2: process names differ between runbook and server.

## Field Test Impact

Field test may run with PM2 if `eden-app`, `eden-fastapi` and the worker decision are visible and restartable.

## Production/Release Impact

Release should move toward systemd or Compose with explicit restart policy and health checks.
