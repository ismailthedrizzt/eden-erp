# Outbox Reliability Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

## Envelope Standard

Every event must carry:

- `event_id` / outbox row id.
- `event_type`.
- `event_version`.
- `tenant_id`.
- `company_id` when the business record is company scoped.
- `aggregate_type` and `aggregate_id`.
- `operation_id` when created by an operation/wizard.
- `correlation_id` and `causation_id`.
- `payload_json` and `metadata_json`.
- `retry_count`, `max_retries`, status and lock metadata.

## Reliability Gates

| Gate | Requirement | Severity |
| --- | --- | --- |
| Atomic write | Business transaction and outbox insert share transaction | P0 |
| Unique id | event id unique and stable | P0 |
| Tenant scoped | tenant_id required on event and delivery | P0 |
| Locking | workers use row locking / skip locked | P0 |
| Idempotent handlers | handler replay safe | P0 |
| Retry | bounded retry with terminal status | P0 |
| Stale recovery | processing locks can be released | P1 |
| Admin retry | manual retry audited | P1 |
| Metrics | backlog, failed, duration, handler count | P1 |
| Versioning | breaking payload changes bump event_version | P1 |

## P0 Blockerlar

- Event kaybi.
- Business transaction basarili, outbox yazimi basarisiz.
- Retry duplicate side effect uretir.
- Worker ayni event'i ayni anda iki kez isleyebilir.

## Review Checklist

- Handler side effects are deduped by event id.
- Webhook deliveries are created per tenant and per subscription only once for the same event.
- Failed terminal events are visible in Admin Console and Action Center.
- Event payloads never include secrets, raw signed URLs or unmasked sensitive data.
