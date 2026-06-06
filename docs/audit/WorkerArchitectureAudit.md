# Worker Architecture Audit

Date: 2026-06-06
Branch: `main`
Commit: `09e90b5588a43af147d75b2926d5368a6f4635b9`

## Worker Inventory

Backend worker modules:

- `backend/app/workers/outbox_worker.py`
- `backend/app/workers/email_worker.py`
- `backend/app/workers/reminder_worker.py`
- `backend/app/workers/reporting_worker.py`
- `backend/app/workers/automation_worker.py`
- `backend/app/workers/webhook_worker.py`
- `backend/app/workers/scheduler.py`

## Runtime Finding

PM2 currently shows:

- `eden-app`: online
- `eden-fastapi`: online

No separate PM2 worker process was confirmed in this audit. `docker-compose.yml` defines a worker service for outbox processing, but the live baseline is PM2.

## Answers

| Question | Answer |
| --- | --- |
| Worker nasil calisiyor? | Code and compose support workers; live PM2 worker process was not confirmed. |
| DB pool ayrimi var mi? | Yes, `WORKER_DB_POOL_SIZE` exists and compose sets it to `2`. |
| Restart policy var mi? | Compose command exists; PM2 worker restart policy not found in repo. |
| Health check var mi? | Worker health check not confirmed. |
| Logs nerede? | PM2 logs likely outside repo. No repo runbook snapshot found. |

## Risks

| Priority | Risk | Fix |
| --- | --- | --- |
| P1 | Worker process may not be running in live PM2. | Decide live worker model and add PM2/systemd config. |
| P1 | Outbox/email/reminder jobs may not process continuously. | Add worker health/status check. |
| P2 | Worker logs/restart policy not documented. | Add operations runbook. |

## Decision

`READY_WITH_LIMITATIONS`
