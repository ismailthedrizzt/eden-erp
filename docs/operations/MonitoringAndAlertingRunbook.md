# Monitoring And Alerting Runbook

## Amac

Production API, DB, workers, outbox, integrations, email, audit and AI provider sagligini izlemek.

## Kim Kullanir

Operations owner, on-call engineer, support lead.

## Required Dashboards

- API health and deep health.
- Request latency p50/p95/p99.
- Error rate by status/code.
- DB pool usage, wait, overflow and statement timeout.
- Slow query count.
- Worker heartbeat and batch result.
- Outbox pending/failed/processing age.
- Email queue and failure count.
- Webhook delivery pending/failed/dead-letter.
- Scheduled report and automation failures.
- Auth failures and permission denied spikes.
- Audit write failures.
- AI provider failures and fallback count.

## Alert Thresholds

- API 5xx > 2% for 5 minutes: P1.
- API health down: P0.
- Auth outage/login failure spike: P0/P1.
- DB pool exhaustion or connection errors: P0.
- Outbox processing age > 15 minutes: P1.
- Webhook dead-letter spike: P1/P2 depending integration.
- Audit write failure: P0 for critical mutations, P1 otherwise.
- Tenant data exposure signal: P0 security incident.

## Response Steps

1. Identify affected tenant/module/path.
2. Check latest deploy and migration.
3. Check DB pool and slow query.
4. Check worker heartbeat/backlog.
5. Decide mitigation: rollback, feature flag, pause worker, scale, provider escalation.
6. Record request_id/correlation_id samples.

## Audit/Log Referanslari

- Structured logs include request_id/correlation_id/tenant_id.
- Worker logs include `WORKER_ID`.
- Admin audit records manual retry/config changes.
