# Support Troubleshooting Guide

## Amac

Support ekibinin production sorunlarini guvenli sekilde triage etmesi.

## Kim Kullanir

Support, customer success, on-call engineer.

## Baslangic Bilgileri

- Tenant name/id.
- User email/id.
- Company id/name.
- Timestamp and timezone.
- Request id/correlation id if visible.
- Module/page/action.
- Expected vs actual result.

## Common Flows

- Login failure: check auth outage, suspended user, tenant membership.
- Permission denied: check role, permission registry, company scope.
- Record missing: check tenant/company scope before assuming deletion.
- Document download fails: check document owner scope, signed URL expiry, storage health.
- Export missing data: check filters, scope, export job status.
- Worker delay: check outbox/email/webhook/reporting backlog.
- Integration error: check app status, credential status, delivery dead-letter.

## Safety Rules

- Do not ask customer for passwords, tokens, signed URLs or service secrets.
- Do not share another tenant's request id or record data.
- Do not manually retry irreversible jobs without engineering approval.
- Escalate tenant data exposure suspicion as P0.

## Escalation

- P0: security, tenant data exposure, auth bypass, DB outage.
- P1: major workflow blocked for paying tenant.
- P2: isolated feature or integration issue.

## Audit/Log Referanslari

- Admin audit, document access logs, request logs, worker logs, integration delivery logs.
