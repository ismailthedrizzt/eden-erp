# Current Runtime Topology Snapshot

Date: 2026-06-06
Branch: `main`
Commit: `9b1b0297ce4171cd85d0154ed4bd9a2ebc2e8d7d`
Working environment: remote server

## Tested Commands

- `pm2 status`: `eden-app` online, `eden-fastapi` online.
- `npm run build`: PASS.
- `npm run env:safety`: PASS.
- `npm run db:target:check`: PASS.

## Live Processes

| Process | Manager | Status | Role |
| --- | --- | --- | --- |
| `eden-app` | PM2 | online | Next.js UI/BFF runtime. |
| `eden-fastapi` | PM2 | online | FastAPI backend runtime. |

## Docker/Compose Baseline

| File | Finding |
| --- | --- |
| `docker-compose.yml` | Defines `web`, `api`, and `worker`. It explicitly does not manage PostgreSQL; `DATABASE_URL` must point to host-managed local PostgreSQL. |
| `backend/Dockerfile` | Python 3.12 slim image, installs backend package and runs `uvicorn app.main:app`. |
| `Dockerfile.next` | Node 24 image, builds Next and runs `npm run start`. |
| `infra/docker-compose.yml` | Present; not used for the current PM2 live baseline in this audit. |

## Worker Baseline

Worker modules exist under `backend/app/workers/`:

- `outbox_worker.py`
- `reminder_worker.py`
- `email_worker.py`
- `webhook_worker.py`
- `automation_worker.py`
- `reporting_worker.py`
- `scheduler.py`

`docker-compose.yml` defines a `worker` service running `python -m app.workers.outbox_worker` with its own `WORKER_DB_POOL_SIZE=2`. The live PM2 baseline inspected in this run shows only `eden-app` and `eden-fastapi`; no separate PM2 worker process was confirmed.

## Findings

- Current live topology is PM2-based, not Docker-based.
- Docker files document the target container topology but do not represent confirmed live process state.
- FastAPI and Next are separate runtime processes.
- Local PostgreSQL is external to Docker compose and is checked by `scripts/check-database-target.js`.

## P0/P1/P2 Risks

| Priority | Risk | Impact | Next action |
| --- | --- | --- | --- |
| P1 | Worker topology not confirmed in PM2 | Outbox/reminder/email/webhook work may depend on cron/manual execution if no worker runs. | Decide whether workers are PM2, cron, or future Docker services. |
| P2 | Compose worker uses `python`, remote shell uses only `.venv/bin/python` | Container is fine because image has `python`; host scripts differ. | Document host vs container command contract. |
| P2 | Docker topology differs from live PM2 topology | Ops docs may drift from reality. | Add a live PM2 runbook snapshot. |

## Next Phase Impact

Before worker-related cleanup, first confirm whether workers are required in live release now or only prepared for future rollout.
