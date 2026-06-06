# Deployment Topology Audit

Date: 2026-06-06
Branch: `main`
Commit: `09e90b5588a43af147d75b2926d5368a6f4635b9`

## Inspected

- `docker-compose.yml`
- `Dockerfile.next`
- `backend/Dockerfile`
- `package.json`
- `scripts/deploy-main-vps.sh`
- `scripts/eden-erp-next.service.example`
- PM2 status
- repo search for nginx/caddy/pm2/supervisor/systemd config

## Answers

| Question | Answer |
| --- | --- |
| Next nasil calisiyor? | Live process `eden-app` under PM2; container/systemd examples exist but current process is PM2. |
| FastAPI nasil calisiyor? | Live process `eden-fastapi` under PM2. Backend Dockerfile can run uvicorn. |
| Worker nasil calisiyor? | Worker modules and compose service exist; live process not confirmed. |
| PostgreSQL nerede? | Host-managed local PostgreSQL; DB target check reports `localhost:5432/app1db`. |
| DB compose icinde mi? | No. `docker-compose.yml` explicitly says PostgreSQL is not managed by compose. |
| Reverse proxy var mi? | Public site works, but reverse proxy config was not found in repo. |
| SSL nerede sonlaniyor? | Not confirmed from repo. Likely external reverse proxy/control panel. |
| Logs nerede tutuluyor? | PM2 logs likely under user PM2 home; repo runbook snapshot absent. |
| Restart policy var mi? | PM2 manages app/api. Systemd example has restart policy for Next only. |
| Health check var mi? | FastAPI deep health exists; deployment-level health checks not fully documented. |

## Risks

| Priority | Risk | Fix |
| --- | --- | --- |
| P1 | Reverse proxy/SSL config not versioned. | Add sanitized proxy topology/runbook. |
| P1 | Worker deployment not confirmed. | Add PM2/systemd worker config. |
| P2 | Live PM2 config not checked into repo. | Add sanitized process ecosystem example. |
| P2 | Health checks are not integrated into deploy script. | Add post-deploy smoke checks. |

## Decision

`READY_WITH_LIMITATIONS`
