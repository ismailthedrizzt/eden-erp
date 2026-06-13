# Worker Operations Runbook

<!-- source-of-truth-standard: contract overrides markdown -->

Date: 2026-06-06

## Purpose

Define Eden ERP worker classes, commands, required env, visibility and risks.

## Current State

Worker modules exist under `backend/app/workers`. `outbox_worker` is a loop/once worker. `email_worker` and `reminder_worker` are loop/once workers. Reporting, automation and webhook modules expose batch functions and can be wrapped into process loops later.

## Target State

Core worker processes are supervised independently from Next and FastAPI. Workers use the same local DB target guard discipline and never run against release DB without the same env safety checks.

## Worker Classes

| Class | Worker | Status | Tables / Domains | Env | Idempotency / Retry |
| --- | --- | --- | --- | --- | --- |
| Core | `outbox_worker` | Required | `public.outbox_events`, outbox handlers | `DATABASE_URL`, `OUTBOX_*`, `WORKER_ID` | `for update skip locked`, stale-lock release, retry count, dead-letter status |
| Recommended | `email_worker` | Optional | notification email queue | `DATABASE_URL`, `EMAIL_*`, SMTP/env mail config | batch queue processing; retry depends on email domain logic |
| Recommended | `reminder_worker` | Optional | notification reminders | `DATABASE_URL`, `REMINDER_*` | due reminder processing; retry depends on domain logic |
| Future | `reporting_worker` | Batch function | scheduled reporting tables | `DATABASE_URL`, reporting env | needs process loop/heartbeat |
| Future | `automation_worker` | Batch function | automation rules/runs/results | `DATABASE_URL`, automation env | needs process loop/heartbeat |
| Future | `webhook_worker` | Batch function | integration deliveries/subscriptions/credentials | `DATABASE_URL`, webhook env | reports delivered/failed/skipped/dead_letter |
| Future | `data_quality_scan_worker` | Not implemented | data-quality findings | TBD | TBD |

## Commands

Run outbox once:

```bash
cd /opt/eden-erp/backend
python -m app.workers.outbox_worker --once
```

Run outbox loop:

```bash
python -m app.workers.outbox_worker
```

Email/reminder:

```bash
python -m app.workers.email_worker --once
python -m app.workers.reminder_worker --once
```

Stop/restart depends on process manager:

```bash
pm2 restart eden-outbox-worker
systemctl restart eden-outbox-worker
docker compose restart worker
```

## Visibility

- Logs should include `worker_id`, batch size, processed/completed/failed/retried/skipped.
- Outbox backlog should be checked by status counts in `public.outbox_events`.
- Heartbeat table is not currently confirmed.
- Dead-letter visibility exists through `status='dead_letter'`, but operational dashboard is P1.

## P0/P1/P2 Risks

- P0: business flow requires outbox side effects while outbox worker is stopped.
- P0: duplicate side effects from retry without idempotent handler.
- P1: no worker heartbeat.
- P1: no dead-letter dashboard/manual retry workflow.
- P2: optional workers are implemented as functions but not supervised loops.

## Field Test Impact

Manual field test can proceed if outbox is either running or the tested flows do not depend on async outbox completion. Email/reminder/webhook/reporting/automation can be marked limited if not in scope.

## Production/Release Impact

Release requires supervised outbox. Optional workers must be supervised before their modules are offered as release functionality.
