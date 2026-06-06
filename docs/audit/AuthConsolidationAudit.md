# Auth Consolidation Audit

## Metadata

| Field | Value |
| --- | --- |
| Date | 2026-06-06 |
| Branch | `main` |
| Working environment | Remote server, local PostgreSQL/local DB |
| Scope | App session, trusted proxy, legacy Supabase JWT and direct FastAPI exposure |

## Files Reviewed

- `middleware.ts`
- `lib/auth/appSession.ts`
- `lib/auth/emailOtp.ts`
- `lib/auth/setupIntent.ts`
- `lib/auth/tenantUserLookup.ts`
- `app/api/auth/**`
- `lib/backend/fastApiProxy.ts`
- `backend/app/core/security.py`
- `backend/app/api/v1/auth.py`
- `backend/app/policies/access_context.py`
- `backend/app/policies/permissions.py`

## Findings

| Question | Finding |
| --- | --- |
| App session nasıl üretiliyor? | OTP verification calls FastAPI tenant-access, then creates `eden_app_session` with `createAppSessionToken`. |
| App session nasıl doğrulanıyor? | Middleware and BFF routes call `verifyAppSessionToken`; HMAC signature uses safe comparison and expiry is checked. |
| `tenant_id`/`user_id` nasıl taşınıyor? | Browser session contains `userId`/`tenantId`; Next BFF sends `x-user-id`/`x-tenant-id` plus `x-proxy-secret` to FastAPI. |
| FastAPI context nasıl çözülüyor? | `get_request_context` builds `RequestContext`, validates trusted proxy, resolves tenant membership, permissions and scope from local DB. |
| Supabase JWT path nerede? | `backend/app/core/security.py` retains `verify_supabase_jwt` as legacy wrapper. It now requires explicit legacy flag. |
| Trusted proxy headers nerede kabul ediliyor? | `backend/app/core/security.py` accepts them only when `_is_trusted_proxy` validates `TRUSTED_PROXY_SECRET`, except dev-only ease. |
| Direct FastAPI çağrısı mümkün mü? | Technically possible if exposed by network/reverse proxy, but not canonical. MVP policy is internal FastAPI. |
| Release auth bypass riski var mı? | Guards now block `EDEN_LOGIN_DISABLED`, `AUTH_REQUIRED=false`, missing app session secret and legacy Supabase auth/JWT flags. |

## Changes Applied

- Backend `APP_ENV=release` is now treated as production security class.
- Legacy Supabase JWT verification requires `LEGACY_SUPABASE_JWT_ENABLED=true` or `EDEN_ENABLE_LEGACY_SUPABASE_AUTH=true`.
- Release safety blocks `LEGACY_SUPABASE_JWT_ENABLED=true`.
- Release safety requires `APP_SESSION_SECRET` specifically.
- Release safety blocks `AUTH_REQUIRED=false`.
- Next FastAPI proxy no longer forwards browser-supplied `x-user-id`, `x-user-permissions`, `x-company-scope` or `x-branch-scope`.
- Targeted auth tests were added for legacy JWT disabled, release auth required and release legacy JWT misconfiguration.

## Test Scenarios

| Scenario | Expected | Status |
| --- | --- | --- |
| Protected page without app session | Redirect `/login` | Documented; middleware behavior verified by inspection. |
| API unsafe route without app session | `401 AUTH_REQUIRED` | Documented; middleware behavior verified by inspection. |
| Valid app session with tenantId | Route opens and tenant cookies are set | Documented; middleware behavior verified by inspection. |
| FastAPI request with trusted proxy secret | Context forms after DB validation | Covered by targeted backend tests and code inspection. |
| FastAPI request with `x-user-id` but no trusted proxy secret | Release rejects | Covered by security logic and protected endpoint test. |
| Release with `EDEN_LOGIN_DISABLED=true` | `env:safety` fail | Existing negative guard. |
| Release without `APP_SESSION_SECRET` | `env:safety` fail | Verified; server env was fixed afterward. |
| Release with legacy Supabase auth/JWT | `env:safety` fail | Verified. |
| Login flow local DB user | OTP -> tenant-access -> app session | Verified by code path. |
| Unknown user | User-safe message, no stack trace | FastAPI auth returns `UNKNOWN_USER_MESSAGE`. |

## Command Baseline

| Command | Result | Notes |
| --- | --- | --- |
| `npm run typecheck` | Pass | Targeted TypeScript check passed. |
| `npm run build` | Pass | Production build completed; existing lint warnings remain. |
| `npm run release:check` | Pass | 140 registry routes, 140 page routes. |
| `npm run env:safety` | Pass | `APP_SESSION_SECRET` was added to the remote env before final pass. |
| `npm run db:target:check` | Pass | Release DB target `app1db`, class release. |
| `npm run migration:status` | Pass with warnings | 99 missing migration headers, 0 P0 missing headers. |
| `npm run boundaries:check` | Pass with warnings | 13 warnings, 0 critical errors. |
| `npm run openapi:drift` | Pass | OpenAPI export/generate produced no committed diff. |
| Targeted backend auth tests | Pass | 14 auth/security tests passed. |
| `cd backend && python -m ruff check .` | Fail | Existing 93 ruff errors remain. |
| `cd backend && python -m mypy app` | Fail | Existing `app/api/v1/accounting.py:596` type error remains. |
| `cd backend && python -m pytest` | Fail | 226 passed, 1 failed: `test_deep_health_missing_database_config_returns_error`. |

## Negative Guard Results

| Case | Expected | Status |
| --- | --- | --- |
| Release + `LEGACY_SUPABASE_JWT_ENABLED=true` | `env:safety` fail | Verified. |
| Release + `AUTH_REQUIRED=false` | `env:safety` fail | Verified. |
| Release without `APP_SESSION_SECRET` | `env:safety` fail | Verified, then server env was fixed. |

## P0/P1/P2

| Priority | Risk | Status |
| --- | --- | --- |
| P0 | Release treats `APP_ENV=release` as non-production. | Fixed. |
| P0 | Direct request sets `x-user-id`/`x-tenant-id` without proxy secret. | FastAPI rejects; Next proxy stopped forwarding browser auth headers. |
| P0 | Release session signing without `APP_SESSION_SECRET`. | Guarded and server env fixed. |
| P0 | Legacy Supabase JWT enabled in release. | Guarded. |
| P1 | Direct FastAPI public exposure is not enforced at network layer in code. | Documented policy; reverse proxy/firewall audit remains. |
| P1 | Header permission fallback remains after trusted proxy validation. | Documented; replace with DB-only enforcement where possible. |
| P2 | Historical Supabase Auth docs remain in old audit files. | Keep as historical evidence; canonical docs updated. |

## Conclusion

Decision: `READY_WITH_LIMITATIONS`.

Canonical auth is now app-session + Next BFF + FastAPI trusted proxy + local DB permission/scope resolution. Remaining limitations are network-layer FastAPI exposure verification and cleanup of legacy JWT naming after a direct API auth strategy is designed.
