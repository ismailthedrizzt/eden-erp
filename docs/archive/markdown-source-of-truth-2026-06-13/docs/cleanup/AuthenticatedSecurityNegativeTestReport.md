# Authenticated Security Negative Test Report

Date: 2026-06-06
Branch: main
Commit: 8c6efdd7a7bfd941e6bd492b6f5ed8809e109d4c
Environment: remote server, release app surface, local PostgreSQL/local DB, FastAPI canonical backend, Next.js BFF/proxy


## Test Setup
Generated a valid `eden_app_session` shape for an active user in tenant `8994d53c-c0ff-4545-a8ce-4ab1bf54b4d1`, then tested own company access, cross-tenant company access, header spoofing, and media traversal attempts. Secrets were only used in-memory and not printed.

## Findings And Fixes
Initial authenticated proxy tests exposed a canonical auth break:

1. FastAPI treated `Authorization: Bearer INTERNAL_BACKEND_TOKEN` as an external legacy JWT and returned `LEGACY_SUPABASE_JWT_DISABLED`.
2. Next proxy-only route handler did not call FastAPI with `internal: true`, so `INTERNAL_BACKEND_TOKEN` was not sent from BFF proxies.

Fixes applied:
- `backend/app/core/security.py`: internal trusted proxy bearer token no longer routes to legacy JWT verification.
- `app/api/_fastapiProxy.ts`: generated proxy-only handlers now call FastAPI with `{ internal: true }`.

## Verified Backend Negative Results
After the FastAPI fix, direct backend tests with internal token and trusted proxy behaved correctly:

| Scenario | Result | Interpretation |
| --- | --- | --- |
| Own tenant/company via internal trusted proxy | 200 | Pass |
| Other tenant company with tenant A context | 404 | Pass, no cross-tenant data leak |
| Header spoof without proxy secret | 401 | Pass |
| Tenant B spoof with trusted secret but user not member | 403 | Pass |

## Remaining Verification
Next BFF authenticated test requires the updated proxy handler to be rebuilt and app restarted. This is part of the final command batch.

## Risks
- P0: BFF-to-FastAPI auth path broken before fix. Fixed in code; final build/restart must complete.
- P1: branch-scope negative test lacks branch data.
- P1: media cross-tenant test lacked a second-tenant stored document sample.

## Final BFF And Media Smoke After Build Restart

| Scenario | Result | Interpretation |
| --- | --- | --- |
| Next BFF own company with valid app session | 200 | Pass |
| Next BFF other-tenant company with tenant A session | 404 | Pass, no cross-tenant data leak |
| Own document media with authenticated `storagePath` | 200 | Pass |
| Media traversal attempt with `../../backend/.env` | 400 | Pass, path traversal blocked |

Direct FastAPI without internal token continues to reject spoofed trusted headers with 401. Direct FastAPI with internal token and trusted proxy accepts valid tenant context and rejects cross-tenant spoofing with 403/404.
