# Job Idempotency Guide

## Amaç

Worker retry, manual retry ve crash recovery sirasinda duplicate side effect olusmasini engellemek.

## Genel Kural

Her job ayni idempotency key ile birden fazla kez calistiginda ayni nihai sonucu vermeli veya ikinci calisma no-op olmalidir.

## Idempotency Key Standardi

| Job | Key |
| --- | --- |
| Outbox handler | `outbox_event_id + handler_key` |
| Webhook delivery | `delivery_id` and outbound `event_id` |
| Email | `email_message_id` plus provider message id |
| Reminder | `reminder_id + scheduled_remind_at` |
| Scheduled report | `scheduled_report_id + run_window_start` |
| Automation | `rule_id + trigger_event_id` |
| Import row | `job_id + row_number/source_row_id` |
| Export | `export_job_id` |

## Implementation Rules

- Persist attempt status before external side effect when possible.
- Persist provider response id after external side effect.
- Use `FOR UPDATE SKIP LOCKED` for shared queues.
- Terminal states must not be reprocessed unless manual retry explicitly resets them.
- Manual retry must clear last error, increment audit trail and preserve attempt history.
- Handlers must check whether target projection/notification/delivery already exists.

## Anti-Patterns

- Sending email/webhook before marking row as processing.
- Retrying a bank/accounting mutation without a unique business operation id.
- Creating notifications without `related_entity_type`, `related_entity_id`, user and tenant uniqueness.
- Using timestamp-only keys.

## Production Gate

No worker is production-enabled until its retry path has a duplicate-run test.
