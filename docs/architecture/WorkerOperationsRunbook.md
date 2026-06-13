# Worker Operations Architecture Runbook

<!-- source-of-truth-standard: contract overrides markdown -->

## Amaç

Worker tiplerinin production davranis kontratini tanimlar. Operasyon adimlari icin `docs/operations/WorkerOperationsRunbook.md` kullanilir.

## Worker Tipleri

| Worker | Sorumluluk | Tenant scope | Idempotency key | Visibility |
| --- | --- | --- | --- | --- |
| `outbox_worker` | Domain event handler dispatch | outbox event tenant_id | event_id + handler_key | Admin outbox, metrics |
| `notification_worker` | In-app notification fanout | notification tenant_id | related entity + user | Notification metrics |
| `email_worker` | Email queue send | email tenant_id | email message id/provider id | Email queue |
| `reminder_worker` | Due reminders | reminder tenant_id | reminder id + scheduled time | Reminder list |
| `reporting_worker` | Scheduled reports/export | report tenant_id | scheduled report/run id | Reporting run logs |
| `automation_worker` | Rule execution | automation tenant_id | rule id + trigger event id | Automation run logs |
| `webhook_worker` | Outbound deliveries | delivery tenant_id | delivery id + event_id | Integration delivery list |
| `data_quality_scan_worker` | Future scans | tenant/company | scan id + entity id | Data quality jobs |

## Required Contract

- Unique worker id in logs: `WORKER_ID`.
- Heartbeat metric/log for every loop.
- Graceful shutdown drains current item or releases lock.
- Lock TTL and stale recovery exist for queued jobs.
- Retry policy has max retry and terminal state.
- Handler is idempotent before enabling retry.
- Batch size is bounded and configurable.
- Admin can see failed/backlog/dead-letter items.
- Manual retry is audited.
- Pause/resume strategy exists for release and incidents.

## P0 Blockerlar

- Duplicate processing can corrupt data or send irreversible external side effects.
- Non-idempotent retry is enabled.
- Outbox/webhook jobs lack row locking.
- Worker failure is invisible to Admin Console and monitoring.
