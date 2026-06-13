# Data Retention Policy

<!-- source-of-truth-standard: contract overrides markdown -->

## Amac

High-volume and sensitive operational data icin retention, archival and delete policy.

## Policy Table

| Data | Default retention | Archive | Delete | Tenant configurable | Notes |
| --- | --- | --- | --- | --- | --- |
| `audit_logs` | Indefinite active or archive after 24 months | yes | legal approval only | yes | P0: no routine hard delete |
| `outbox_events` | 90 days completed, failed retained until resolved | yes | completed only | yes | Keep failed/dead-letter |
| `webhook_deliveries` | 180 days metadata, payload 30-90 days | yes | payload redaction | yes | Sensitive payload risk |
| `email_messages` | 180 days metadata, body 30-90 days | yes | body redaction | yes | P0 if sensitive body indefinite |
| `notifications` | 12 months | optional | archived/dismissed cleanup | yes | User UX volume |
| `process_events` | 24 months | yes | after archive | yes | Compliance workflows |
| Import rows/errors | 90 days | optional | yes | yes | Remove uploaded raw files sooner |
| Export jobs/files | 7-30 days files, 180 days metadata | optional | yes | yes | P0 if sensitive files indefinite |
| AI history | 30-180 days sanitized | optional | yes | yes | No raw secrets/prompts |
| Search recent items | 30-90 days | no | yes | yes | User preference data |
| Automation run logs | 180 days | yes | yes | yes | Keep failures longer |

## P0 Blockerlar

- Audit logs can be accidentally cleaned.
- Export files with sensitive data stored indefinitely.
- Email body with sensitive data stored indefinitely.
- Retention job runs without tenant and data type allowlist.

## Operational Rules

- Retention jobs must be dry-run first.
- Delete/archive actions are audited.
- Tenant override cannot shorten legal minimum without approval.
- Storage files and DB metadata must be cleaned together.
