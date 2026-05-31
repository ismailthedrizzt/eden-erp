# Incident Response Runbook

## Amac

Production incidentlerini siniflandirmak, kontrol altina almak, kurtarmak ve postmortem ile kapatmak.

## Kim Kullanir

Incident commander, engineering, operations, support, security owner.

## Severity

- P0: tenant data exposure, auth bypass, DB outage, production stack trace/secret leak, critical operation corruption.
- P1: major module outage, worker backlog affecting customers, high error rate, failed release.
- P2: degraded non-critical feature, isolated integration/email failure.

## Incident Classes

- Security incident.
- Tenant data exposure.
- Auth outage.
- DB outage.
- Worker backlog.
- Outbox failure.
- Document storage failure.
- Email failure.
- Webhook abuse.
- Migration failure.
- Performance degradation.
- AI safety issue.

## Immediate Actions

1. Declare incident and severity.
2. Assign incident commander and scribe.
3. Freeze deploys unless hotfix/rollback approved.
4. Preserve logs and request ids.
5. Contain blast radius: feature flag, worker pause, token revoke, route block.
6. Communicate status and next update time.

## Recovery

- Apply rollback/hotfix/restore/provider escalation.
- Validate with smoke tests.
- Monitor for recurrence.
- Resume paused workers gradually.

## Communication

- Internal: timeline, owner, impact, current mitigation.
- Customer: what happened, impact window, current status, next update.
- Security/privacy incidents require separate approval before customer detail.

## Postmortem

- Timeline.
- Customer impact.
- Root cause.
- Detection gap.
- Prevention tasks with owners and due dates.
- Evidence links: logs, dashboards, release, migration.
