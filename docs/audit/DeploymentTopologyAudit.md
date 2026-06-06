# Deployment Topology Audit

Date: 2026-06-06

## Purpose

Audit current remote server topology for Next, FastAPI, workers, PostgreSQL, storage, logs and health.

## Current State

| Area | Finding |
| --- | --- |
| Next | Current process `eden-app` under PM2. |
| FastAPI | Current process `eden-fastapi` under PM2. |
| Workers | Worker modules exist; live worker process not confirmed. |
| PostgreSQL | Host-managed local/server DB; not in compose. |
| Docker Compose | `web`, `api`, `worker`; no DB service; `DATABASE_URL` required externally. |
| Reverse proxy | Public route works; sanitized proxy config not in repo. |
| SSL | Likely hosting panel/reverse proxy; not confirmed in repo. |
| Logs | PM2 for app/backend; PostgreSQL/proxy logs outside repo. |
| Health | FastAPI health/deep health exists; deploy-level health script not centralized. |

## Target State

Remote server topology follows:

```text
Reverse proxy -> Next :3000 -> FastAPI :8000 -> local PostgreSQL
Next media route -> FastAPI media -> DOCUMENT_STORAGE_ROOT
Workers -> local PostgreSQL queues/outbox
```

## Commands Tested/Recommended

```bash
pm2 status
npm run env:safety
npm run db:target:check
docker compose config
curl -sS http://127.0.0.1:3000/login
```

## Command Baseline

| Command | Result | Notes |
| --- | --- | --- |
| `npm run typecheck` | Pass | No changed TypeScript files to check. |
| `npm run build` | Pass | Existing ESLint warnings only. |
| `npm run release:check` | Pass | Release registry/page route guard passed. |
| `npm run env:safety` | Pass | Local DB/release safety guard passed. |
| `npm run db:target:check` | Pass | `app1db` classified as release target. |
| `npm run migration:status` | Pass with warnings | Existing missing migration header warnings remain. |
| `npm run boundaries:check` | Pass with warnings | Existing boundary warnings remain. |
| `npm run openapi:drift` | Pass | Generated OpenAPI files had no diff. |
| `docker compose config` | Pass | Requires explicit `DATABASE_URL`; compose does not manage DB. |
| `cd backend && python -m ruff check .` | Fail baseline | Existing 93 formatting/import/line-length findings. |
| `cd backend && python -m mypy app` | Fail baseline | Existing `app/api/v1/accounting.py:596` type error. |
| `cd backend && python -m pytest` | Fail baseline | 225 passed, 2 observability tests return 401 under release auth. |

## P0/P1/P2 Risks

- P0: FastAPI public exposure accepts trusted headers.
- P0: release auth/DB env missing.
- P1: worker process not supervised/confirmed.
- P1: reverse proxy/SSL config not versioned.
- P2: deploy smoke not centralized.

## Field Test Impact

`READY_WITH_LIMITATIONS`: app/backend and DB guard are operational, but worker/proxy/backup visibility must be confirmed before broader field test.

## Production/Release Impact

Production readiness requires supervised workers, backup/restore drill, reverse proxy policy and process manager standardization.
