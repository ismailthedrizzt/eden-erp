# Worker Readiness Audit

Date: 2026-06-06

## Purpose

Audit worker modules and readiness for field test and release.

## Current State

| Worker | File | Readiness | Notes |
| --- | --- | --- | --- |
| Outbox | `backend/app/workers/outbox_worker.py` | MVP ready | Loop/once mode, stale-lock release, retry/dead-letter through outbox service. |
| Email | `backend/app/workers/email_worker.py` | MVP optional | Loop/once mode, queue processing through notifications email domain. |
| Reminder | `backend/app/workers/reminder_worker.py` | MVP optional | Loop/once mode, due reminder processing. |
| Reporting | `backend/app/workers/reporting_worker.py` | Future wrapper needed | Batch function exists, process loop/tenant iteration not confirmed. |
| Automation | `backend/app/workers/automation_worker.py` | Future wrapper needed | Batch function exists, process loop/tenant iteration not confirmed. |
| Webhook | `backend/app/workers/webhook_worker.py` | Future wrapper needed | Batch function exists, dead-letter counts surfaced in result. |
| Data quality | Not found | Not ready | Future worker. |

## Target State

Core outbox is supervised before release. Optional workers are supervised before their features are marked release.

## Commands

```bash
cd backend
python -m app.workers.outbox_worker --once
python -m app.workers.email_worker --once
python -m app.workers.reminder_worker --once
```

## P0/P1/P2 Risks

- P0: business flow depends on outbox while outbox worker is stopped.
- P0: retry creates duplicate side effects.
- P1: worker heartbeat missing.
- P1: dead-letter dashboard/manual retry missing.
- P2: future workers need process wrappers.

## Field Test Impact

Field test can proceed with limitations if outbox is either supervised or async side effects are out of test scope.

## Production/Release Impact

Release requires outbox worker supervision. Email/reminder/webhook/reporting/automation require supervision when their domains are released.
