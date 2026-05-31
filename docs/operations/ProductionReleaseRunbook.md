# Production Release Runbook

## Amac

Eden ERP production release'ini kontrollu, geri alinabilir ve izlenebilir sekilde yapmak.

## Kim Kullanir

Engineering lead, backend/frontend owner, operations owner, support lead.

## On Kosullar

- `npm run typecheck`, `npm run build`, backend lint/typecheck/test ve migration status tamam.
- OpenAPI drift kontrolu temiz veya bilincli olarak raporlanmis.
- Migration plan ve rollback etkisi review edildi.
- Worker pause/resume karari verildi.
- Monitoring dashboard ve alert kanallari aktif.
- Smoke test fixture tenant/company/user hazir.

## Release Stages

1. Build artifacts: Next, FastAPI, worker image.
2. Test: unit, typecheck, lint, backend tests, smoke dry-run.
3. Migration plan: forward SQL/Alembic, index impact, rollback note.
4. Deploy backend.
5. Deploy workers or keep paused if migration/backlog risk exists.
6. Deploy frontend/BFF.
7. Smoke test: health, login, dashboard, company list, search, action center, documents, audit, admin health.
8. Monitor 30-60 minutes: error rate, latency, DB pool, worker backlog, outbox.
9. Rollback if P0/P1 threshold exceeded.

## Kontrol Listesi

- Environment variables and secrets present.
- `AUTH_REQUIRED=true` in production.
- Trusted proxy secret configured.
- DB pool and statement timeout configured.
- Migrations applied once.
- Outbox/webhook/email workers have unique `WORKER_ID`.
- Feature flags default safe.
- Admin Console health and deep health checked.

## Rollback/Fallback

- Use `docs/operations/RollbackRunbook.md`.
- Pause workers before app rollback when event schema or migration compatibility is uncertain.
- Disable risky module path by feature flag when possible.
- Keep migration rollback separate from app rollback unless data corruption risk is confirmed.

## Audit/Log Referanslari

- Request logs: `request_id`, `correlation_id`, `tenant_id`.
- Admin audit: feature/module/settings/outbox actions.
- Outbox metrics: pending, failed, processing age.
- Worker logs: `WORKER_ID`, batch result.
