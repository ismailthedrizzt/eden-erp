# Field Test Readiness After Cleanup 1

Date: 2026-06-06
Branch: main
Commit: 8c6efdd7a7bfd941e6bd492b6f5ed8809e109d4c
Environment: remote server, release app surface, local PostgreSQL/local DB, FastAPI canonical backend, Next.js BFF/proxy


## Decision
READY_WITH_LIMITATIONS

## Rationale
Worker/outbox is operational, current backlog is clear, backup is available outside the public web root, HSTS is present, and the discovered canonical auth proxy break has been fixed in code.

## Limitations
- Final Next build/restart and full command baseline must pass before using this as a release-candidate signal.
- Worker heartbeat is operational through PM2/logs/SQL, not through a dedicated dashboard.
- Branch-scope and second-tenant media negative tests need richer fixture data.

## Field Test Scope Allowed
Manual field test may proceed for core flows after final test commands pass, with special attention to login, company detail, document media access, and BFF-to-FastAPI requests.

## Final Smoke Result

After rebuilding and restarting `eden-app`, authenticated Next BFF smoke passed for own-company access and cross-tenant denial. Media access passed for an authorized storage path and rejected path traversal with a user-safe 400 response.

Final decision remains `READY_WITH_LIMITATIONS` because heartbeat/DLQ dashboard and richer branch/media cross-tenant fixtures are still P1 follow-ups, not because of an open P0.
