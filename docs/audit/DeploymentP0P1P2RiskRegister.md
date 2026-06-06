# Deployment P0/P1/P2 Risk Register

Date: 2026-06-06

## Purpose

Central risk register for deployment topology, workers, DB, backup/restore and incident response.

| Priority | Risk | Evidence | Status | Next Action |
| --- | --- | --- | --- | --- |
| P0 | Release DB seed/reset/migration without guard. | `scripts/check-database-target.js`, DB runbook. | Guarded. | Keep preflight mandatory. |
| P0 | No backup before field test or migration. | Backup runbook. | Documented. | Execute backup and record timestamp. |
| P0 | Document storage outside backup. | Backup runbook. | Documented. | Include `DOCUMENT_STORAGE_ROOT` in backup job. |
| P0 | FastAPI exposed publicly while trusting headers. | FastAPI exposure/auth docs. | Policy documented. | Verify reverse proxy/firewall. |
| P0 | Auth disabled in release. | Auth consolidation guard. | Guarded. | Keep env safety in deploy. |
| P1 | Outbox worker not supervised. | Worker audit. | Risk open. | Add systemd/PM2/Compose worker process. |
| P1 | Worker heartbeat missing. | Worker audit. | Risk open. | Add heartbeat/health table or endpoint. |
| P1 | Reverse proxy/SSL config not versioned. | Deployment audit. | Risk open. | Add sanitized proxy runbook/config. |
| P1 | Restore drill not executed. | Backup audit. | Risk open. | Run restore test in development DB. |
| P1 | Observability health/metrics pytest baseline fails under release auth. | `backend/app/tests/test_observability_health.py` expects 200; current release env returns 401. | Risk open. | Decide whether observability endpoints need trusted/internal auth fixture or public health exception. |
| P2 | Backend lint/type debt remains. | Ruff 93 findings; mypy one accounting history type error. | Existing baseline. | Fix in backend quality cleanup phase. |
| P2 | Historical Supabase/Vercel docs confuse operators. | Release docs search. | Partially updated/deprecated. | Continue cleanup as docs are touched. |

## Field Test Impact

Field test readiness is `READY_WITH_LIMITATIONS` until backup execution and outbox worker supervision are confirmed.

## Production/Release Impact

Production requires closing P0 and either closing or explicitly accepting P1 items with owner/date.
