# Auth Strategy

Date: 2026-06-06

## Canonical Path

```text
Browser -> eden_app_session cookie -> Next middleware
Next BFF -> FastAPI trusted proxy headers
FastAPI -> local DB tenant/user/permission/scope resolution
```

## Rules

- App session is the canonical browser auth mechanism.
- `EDEN_LOGIN_DISABLED` must never be enabled in release.
- `TRUSTED_PROXY_SECRET` is required for trusted proxy headers in release.
- Supabase JWT verification is legacy/direct-bearer compatibility only.
- Protected routes must not depend on Supabase env values to start.
- User, tenant, permission and scope context must be resolved or verified before business mutation.

## Cleanup Target

Remove legacy Supabase auth naming after a replacement direct FastAPI auth strategy is approved.
