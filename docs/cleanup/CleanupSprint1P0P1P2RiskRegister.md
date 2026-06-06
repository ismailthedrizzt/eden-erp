# Cleanup Sprint 1 P0/P1/P2 Risk Register

Date: 2026-06-06
Branch: main
Commit: 8c6efdd7a7bfd941e6bd492b6f5ed8809e109d4c
Environment: remote server, release app surface, local PostgreSQL/local DB, FastAPI canonical backend, Next.js BFF/proxy


| ID | Priority | Area | Risk | Status | Next Action |
| --- | --- | --- | --- | --- | --- |
| CS1-001 | P0 | Auth/BFF | Next BFF to FastAPI canonical path failed because internal token was handled as legacy JWT and proxy handler did not mark calls internal. | Fixed in code, final build pending | Run build and authenticated smoke again |
| CS1-002 | P0 | Worker | Outbox worker absent from PM2 while pending events existed. | Fixed | Keep `eden-outbox-worker` online |
| CS1-003 | P0 | Backup | No verified field-test backup in standard path. | Fixed using official fallback | Add restore dry-run later |
| CS1-004 | P1 | Worker visibility | No heartbeat/dashboard for worker and DLQ. | Open | Add endpoint/admin panel next sprint |
| CS1-005 | P1 | Security fixtures | Branch-scope and second-tenant media negative tests lack enough data. | Open | Create controlled fixtures or test manually |
| CS1-006 | P2 | Backup path | `/opt/eden-erp/backups` unavailable to app user. | Accepted limitation | Optional privileged server setup |
