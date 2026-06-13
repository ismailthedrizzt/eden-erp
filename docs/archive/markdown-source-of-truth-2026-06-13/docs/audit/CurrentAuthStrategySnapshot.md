# Current Auth Strategy Snapshot

Date: 2026-06-06
Branch: `main`
Commit: `9b1b0297ce4171cd85d0154ed4bd9a2ebc2e8d7d`
Working environment: remote server release runtime

## Tested Commands

- `npm run env:safety`: PASS
- `npm run build`: PASS
- `npm run backend:test`: FAIL with 1 observability health test unrelated to auth.

## Inspected Files

- `middleware.ts`
- `lib/auth/appSession.ts`
- `app/api/auth/**`
- `lib/auth/tenantUserLookup.ts`
- `lib/backend/fastApiProxy.ts`
- `backend/app/core/security.py`
- `backend/app/api/v1/auth.py`

## Current Flow

1. Login/tenant lookup uses Next auth routes and FastAPI auth endpoints.
2. `lib/auth/appSession.ts` creates/verifies signed `eden_app_session` cookies.
3. `middleware.ts` validates app session for protected pages/API, applies release route guard, origin guard for unsafe methods, and clears old demo cookies.
4. Next BFF calls FastAPI through `lib/backend/fastApiProxy.ts`.
5. Proxy sends `x-tenant-id`, `x-user-id`, optional permissions/scope headers, request/correlation ids, and `x-proxy-secret` when configured.
6. FastAPI `backend/app/core/security.py` accepts trusted proxy headers only when configured and validates `TRUSTED_PROXY_SECRET` in production.
7. Direct FastAPI bearer token auth still routes through `verify_external_jwt`, currently implemented by legacy Supabase JWT verifier compatibility code.

## Answers

| Question | Baseline answer |
| --- | --- |
| App session var mı? | Yes. `eden_app_session` signed cookie is canonical in Next middleware. |
| Supabase fallback var mı? | Middleware does not use Supabase fallback; if `EDEN_ENABLE_LEGACY_SUPABASE_AUTH=true`, it returns a disabled error. Backend still has legacy Supabase JWT verifier for direct bearer token compatibility. |
| FastAPI trusted proxy var mı? | Yes. `ALLOW_TRUSTED_PROXY_HEADERS` and `TRUSTED_PROXY_SECRET` control trusted proxy headers. |
| Direct FastAPI auth nasıl çalışıyor? | Bearer token is extracted and passed to `verify_external_jwt`, which currently maps to legacy Supabase JWT verification. |
| Release ortamında auth bypass riski var mı? | `env:safety` passed. `middleware.ts` has `EDEN_LOGIN_DISABLED`; release safety check blocks unsafe release env. FastAPI also rejects production with auth disabled. |
| User/tenant/scope nasıl taşınıyor? | Next session provides user/tenant; proxy forwards tenant/user/scope/permissions headers; FastAPI resolves tenant and loads effective permissions/scope from DB unless trusted proxy supplies context. |

## Findings

- Canonical browser auth is app-session based, not Supabase Auth.
- Tenant lookup queries FastAPI/local DB through `backend/app/api/v1/auth.py`.
- Trusted proxy is central to Next-to-FastAPI context propagation.
- Backend direct bearer auth still carries Supabase compatibility names and behavior.
- User-state and setup legacy TS modules still contain Supabase paths, outside the canonical middleware path.

## P0/P1/P2 Risks

| Priority | Risk | Impact | Next action |
| --- | --- | --- | --- |
| P0 | None confirmed by env safety | No active release bypass was detected. | Keep `env:safety` mandatory. |
| P1 | Direct FastAPI bearer auth depends on legacy Supabase verifier | Direct API clients may require old JWT source or fail if verifier not configured. | Decide direct API auth strategy: app-issued JWT, internal token, or remove direct external bearer support. |
| P1 | Trusted proxy header trust is powerful | Misconfigured secret would create scope spoofing risk. | Keep production validation and rotate/manage secret carefully. |
| P1 | Legacy TS auth/user-state Supabase modules remain | Future auth work can accidentally reuse old path. | Remove/migrate after confirming no active imports. |
| P2 | Auth terminology still says Supabase in some docs/messages | Confusion risk. | Rewrite docs/messages in auth cleanup phase. |

## Next Phase Impact

Auth cleanup should happen before deleting Supabase dependencies if any active TS server module still imports `lib/supabase/server.ts`.
