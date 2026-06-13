# Auth Strategy

<!-- source-of-truth-standard: contract overrides markdown -->

Date: 2026-06-06

## Canonical Model

```text
Browser
-> Next.js login / OTP
-> eden_app_session httpOnly cookie
-> Next.js BFF route
-> FastAPI proxy headers
-> FastAPI RequestContext
-> permission / tenant / scope enforcement
```

## Browser Session

The canonical browser auth mechanism is the Eden app session cookie.

| Attribute | Rule |
| --- | --- |
| Cookie name | `eden_app_session` |
| Transport | httpOnly cookie |
| `sameSite` | `lax` |
| `secure` | true in production/release runtime |
| Signing secret | `APP_SESSION_SECRET` |
| Payload | `sub`, optional `userId`, `tenantId`, `email`, `phone`, `expiresAt` |
| Permission source | DB/FastAPI, not session payload |
| Expiry | Enforced by token payload and HMAC verification |

`APP_SESSION_SECRET` is mandatory in release. Fallback secrets may exist for setup/OTP compatibility, but they are not acceptable as the release app-session signing source.

## FastAPI Context

Next BFF sends trusted proxy context to FastAPI:

```text
x-tenant-id
x-user-id
x-company-scope
x-branch-scope
x-proxy-secret
x-request-id
x-correlation-id
```

FastAPI accepts user/tenant/scope headers only when `ALLOW_TRUSTED_PROXY_HEADERS=true` and `x-proxy-secret` matches `TRUSTED_PROXY_SECRET`. Release must not run trusted proxy headers without the secret.

## Source Of Truth

- Tenant membership is verified from local DB.
- User ID must belong to the tenant through active membership.
- Permissions are loaded from DB policy tables.
- Company and branch scope are loaded from DB policy tables.
- Header permissions are not source of truth in release; they are a legacy/internal fallback only after trusted proxy validation.

## Legacy JWT

Supabase Auth is not canonical. `verify_supabase_jwt` remains only as a deprecated compatibility wrapper around `verify_legacy_supabase_jwt`.

Legacy Supabase JWT verification requires one of:

```text
LEGACY_SUPABASE_JWT_ENABLED=true
EDEN_ENABLE_LEGACY_SUPABASE_AUTH=true
```

Both are forbidden in release by the release safety guard. New code must call the canonical app-session/BFF/FastAPI context path, not `verify_supabase_jwt`.

## Release Guard Rules

- `EDEN_LOGIN_DISABLED=true` is forbidden.
- `AUTH_REQUIRED=false` is forbidden.
- `EDEN_ENABLE_LEGACY_SUPABASE_AUTH=true` is forbidden.
- `LEGACY_SUPABASE_JWT_ENABLED=true` is forbidden.
- `APP_SESSION_SECRET` is required.
- `INTERNAL_BACKEND_TOKEN` is required.
- `FASTAPI_BASE_URL` is required.
- `TRUSTED_PROXY_SECRET` is required when trusted proxy headers are enabled.
- Secret-looking `NEXT_PUBLIC_*` env names are forbidden.

## Direct FastAPI Access

FastAPI business endpoints are not public browser APIs in the MVP. Direct external FastAPI exposure requires a separate JWT/API-token policy, strict CORS, rate limiting and rejection of trusted proxy headers from public traffic.
