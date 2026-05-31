# Worker Operations Runbook

## Amac

Outbox, notification, email, reminder, reporting, automation and webhook workers'i production'da guvenli calistirmak.

## Kim Kullanir

Operations owner, backend owner, on-call engineer.

## On Kosullar

- Worker has unique `WORKER_ID`.
- DB pool and statement timeout configured.
- Batch size and retry max configured.
- Admin Console or dashboard shows backlog/failures.
- Idempotency review completed for enabled job type.

## Daily Checks

- Worker heartbeat seen in last 5 minutes.
- Backlog age within threshold.
- Failed/dead-letter count not increasing unexpectedly.
- DB pool wait not rising during worker batch.
- Manual retries are audited.

## Manual Retry

1. Confirm failed item belongs to tenant and scope.
2. Read error and last attempt time.
3. Confirm handler is idempotent.
4. Retry one item first.
5. Monitor side effect and related audit/log.
6. Retry batch only after one-item success.

## Pause/Resume

- Pause workers before risky migration, schema-incompatible release or external provider incident.
- Resume one worker type at a time.
- Watch backlog recovery rate and external provider rate limits.

## Graceful Shutdown

- Send platform termination signal.
- Allow current item/batch to finish when within timeout.
- If killed, stale lock recovery must make rows available after TTL.

## Rollback/Fallback

- Disable feature flag for source module if job generation is faulty.
- Pause worker if retry creates duplicate side effects.
- Use manual reconciliation for emails/webhooks already sent.

## Audit/Log Referanslari

- `eden.worker`, `eden.outbox`, integration delivery logs.
- Admin outbox retry audit.
- Email/webhook delivery status tables.
