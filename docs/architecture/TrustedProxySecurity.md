# Trusted Proxy Security

<!-- source-of-truth-standard: contract overrides markdown -->

Date: 2026-06-06

## Canonical Path

```text
Next BFF
-> x-proxy-secret
-> x-user-id / x-tenant-id / scope headers
-> FastAPI RequestContext
-> local DB membership, permission and scope resolution
```

## Rules

- `ALLOW_TRUSTED_PROXY_HEADERS=true` enables trusted proxy context.
- In release, `TRUSTED_PROXY_SECRET` is mandatory when trusted proxy headers are enabled.
- FastAPI must ignore user/tenant/scope headers when `x-proxy-secret` is missing or invalid.
- Next BFF must not pass browser-supplied `x-user-id`, `x-user-permissions`, `x-company-scope` or `x-branch-scope` directly.
- Permission source of truth is DB, not request headers.
- Header permissions are only a legacy/internal fallback after trusted proxy validation and should not be used for normal release authorization.

## Current Implementation

- `lib/backend/fastApiProxy.ts` derives `x-user-id` from the verified app session or explicit server-side proxy options.
- `backend/app/core/security.py` validates `x-proxy-secret` before accepting proxy context.
- `backend/app/policies/access_context.py` validates tenant membership from local DB.
- Permissions and scope are loaded from local DB policy tables.

## Release Failure Conditions

- `ALLOW_TRUSTED_PROXY_HEADERS=true` without `TRUSTED_PROXY_SECRET`.
- Direct FastAPI request with `x-user-id` but no valid `x-proxy-secret`.
- `AUTH_REQUIRED=false`.
- Legacy Supabase JWT enabled.

## Test Scenarios

| Scenario | Expected |
| --- | --- |
| FastAPI request with trusted proxy secret | Context can form if DB membership/scope validates. |
| FastAPI request with `x-user-id` but no proxy secret | Release rejects as `AUTH_REQUIRED`. |
| Permission header without DB permissions | Not source of truth for normal release requests. |
| Next proxy request with browser-supplied `x-user-id` | Browser value is not forwarded. |
