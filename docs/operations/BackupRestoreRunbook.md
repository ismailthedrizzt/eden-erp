# Backup Restore Runbook

## Amac

PostgreSQL/Supabase data, document storage, configuration and secrets icin backup ve restore surecini tanimlamak.

## Kim Kullanir

Operations owner, database owner, incident commander.

## On Kosullar

- Supabase/PostgreSQL automated backups enabled.
- Point-in-time recovery capability and retention known.
- Document storage bucket backup or replication configured.
- Environment/secrets inventory backed up in secret manager.
- Restore target environment exists.

## Backup Strategy

- Database: daily backup plus PITR where available.
- Storage: daily object backup or provider replication.
- Config: environment variable export from secret manager, not plaintext repo.
- Migrations: git commit sha and migration table snapshot.
- Audit/export artifacts: compliance retention policy aligned with tenant contract.

## Restore Test Checklist

1. Select restore point and target environment.
2. Restore database to isolated test/staging.
3. Restore storage bucket or subset required by fixture tenant.
4. Apply missing config/secrets from secret manager.
5. Start backend with restored DB.
6. Run health/deep health.
7. Run tenant login, company list, document download, audit list, outbox admin smoke.
8. Validate no production webhooks/email are enabled in restored environment.
9. Record RPO/RTO observed times.

## RPO/RTO Targets

- Pilot target RPO: 24h backup, PITR preferred.
- Pilot target RTO: 4h.
- Scale target RPO: <= 1h with PITR.
- Scale target RTO: <= 1h for core API, <= 4h for documents/reporting.

## Rollback/Fallback

- If restore fails, escalate to provider restore support.
- Disable outbound workers until restored tenant scope and secrets are verified.
- Communicate data freshness and expected recovery time.

## Audit/Log Referanslari

- Restore ticket, operator, restore point.
- Supabase backup job id.
- Storage backup job id.
- Smoke test result and observed RPO/RTO.
