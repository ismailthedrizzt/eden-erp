# Disaster Recovery Plan

## Amac

Major outage, data loss or provider failure durumunda Eden ERP'nin geri kazanilmasi.

## Kim Kullanir

Incident commander, operations owner, engineering lead, support lead.

## Incident Classes

- DB outage or data loss.
- Supabase auth/storage outage.
- Region/provider outage.
- Failed migration causing data unavailability.
- Worker/outbox backlog causing operational outage.
- Tenant data exposure.

## Immediate Actions

1. Declare severity and incident commander.
2. Freeze deploys and destructive jobs.
3. Pause workers if they may amplify damage.
4. Capture current health, DB status, backlog, error rate.
5. Start customer/internal communication cadence.
6. Choose recovery path: wait, rollback, restore, failover.

## Recovery Paths

- DB outage: failover/provider recovery, then health/smoke.
- Data corruption: stop writes, backup current state, restore/reconcile.
- Storage outage: disable upload/download features, preserve metadata, retry after provider recovery.
- Auth outage: disable new sessions if needed, communicate impact.
- Migration failure: app rollback first; DB rollback only with reviewed plan.

## Kontrol Listesi

- Core API health restored.
- Auth/login restored.
- Tenant isolation smoke passed.
- Documents accessible or documented degraded mode active.
- Outbox/webhook/email workers resumed gradually.
- Customer communication sent.
- Postmortem scheduled.

## RPO/RTO

Use targets from `docs/operations/BackupRestoreRunbook.md`; record actuals in incident postmortem.
