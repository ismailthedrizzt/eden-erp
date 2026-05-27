# Python Auth / Tenant Security

Step 15 moves the FastAPI backend toward its own security boundary. Next.js remains a useful BFF/proxy, but FastAPI no longer treats proxy headers as the canonical proof of identity in production.

## Auth Model

- User requests should send `Authorization: Bearer <Supabase access token>` to FastAPI.
- `SUPABASE_JWT_SECRET` enables local HS256 Supabase JWT verification.
- `SUPABASE_JWKS_URL`, `SUPABASE_PROJECT_REF`, or `SUPABASE_URL` can define the JWKS endpoint for production rotation support. JWKS verification is wired through an optional JWT crypto adapter.
- `AUTH_REQUIRED` defaults to true in staging/production and false in local development.
- Missing, invalid, or expired tokens return business-language 401 responses.

## Tenant Context

Tenant resolution is canonical in Python:

1. JWT gives `sub` as `user_id`.
2. `X-Tenant-Id` or `tenant_id` can request an active tenant.
3. The requested tenant is validated against `tenant_memberships`.
4. If no tenant is requested, the user's default active membership is used.
5. Missing context returns `TENANT_CONTEXT_MISSING`; invalid membership returns `TENANT_ACCESS_DENIED`.

Development can use trusted proxy headers only when auth is relaxed. Production cannot rely on `X-User-Id` alone.

## Permissions

Python loads effective permissions from:

- `user_roles`
- `roles`
- `role_permissions`
- `permissions`
- membership `role_key` follow-up bridge

Permission fallbacks are merged from `backend/app/policies/permissions.py`, so a user with `companies.edit` can satisfy configured fallback operations such as `branches.openingStart`.

## Company And Branch Scope

Company scope is loaded from `tenant_company_scopes`.

- `readonly` scopes are not writable.
- Production defaults to deny when company scope is unavailable.
- Branch, organization unit, and facility scope resolve through their `company_id` relationship.
- Development may allow open scope only when auth is explicitly relaxed.

## Next Proxy Header Standard

`lib/backend/fastApiProxy.ts` now forwards:

- `Authorization: Bearer <Supabase access token>` when available
- `X-Request-Id`
- `X-Forwarded-For`
- `X-Forwarded-User-Agent`
- optional tenant/scope headers as hints
- `X-Proxy-Secret` when configured

Normal user calls do not use `INTERNAL_BACKEND_TOKEN` as their bearer token. Internal calls opt into that behavior.

## Internal Token Model

Internal system endpoints such as `/api/v1/system/outbox/dispatch` use `INTERNAL_BACKEND_TOKEN` or `CRON_SECRET`.

- User JWT is not required for worker/cron endpoints.
- Missing internal token configuration disables internal access in production.
- Invalid internal token returns `INTERNAL_TOKEN_INVALID`.

## Dev Vs Production

- Local development can set `AUTH_REQUIRED=false` and use trusted proxy headers.
- Production requires JWT auth.
- Production cannot disable auth.
- Production trusted proxy header mode requires `TRUSTED_PROXY_SECRET`.

## Known Gaps

- Full JWKS rotation depends on installing a JWT crypto verifier in the runtime image.
- Role-to-permission loading should be hardened against final tenant membership schema decisions.
- Supabase RLS and FastAPI app policy alignment needs an end-to-end audit.
- Auth denial audit logging is prepared as a follow-up to avoid noisy eligibility checks.
- E2E auth tests should cover real Supabase sessions through the Next BFF.
