# Backend Ownership Policy

Date: 2026-06-06

## Policy

- FastAPI is the canonical backend.
- Business mutation belongs to FastAPI.
- DB access belongs to FastAPI and worker processes.
- Next.js route handlers are BFF/proxy adapters unless explicitly documented otherwise.
- TypeScript may keep generated clients, shared types, UI contracts and thin adapters.
- Runtime ERP orchestration, lifecycle, audit, policy, scope and persistence must not be reintroduced into Next.js server modules.
- Lifecycle operations belong to FastAPI.
- Permission and scope enforcement belong to FastAPI.
- Audit and outbox events belong to FastAPI or workers.
- DB transaction boundaries belong to FastAPI.
- Next API routes must not import domain services, operation orchestrators, process/outbox/audit backend helpers or direct DB clients.
- Next API routes may only be thin FastAPI proxies, session bootstrap adapters, upload adapters or UI adapters.

## Route Header Requirement

Every new `app/api/**/route.ts` file must carry:

```ts
// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/...
// NOTES: Thin BFF proxy only; no domain mutation in Next.
```

Allowed permanent statuses are:

- `proxy_to_fastapi`
- `keep_session_bootstrap`
- `keep_upload_adapter`
- `keep_ui_adapter`

Temporary or cleanup statuses are:

- `proxy_to_fastapi_with_temporary_fallback`
- `migrate_to_fastapi`
- `deprecated_wrapper`
- `delete_obsolete`

Temporary fallback requires an explicit migration plan and smoke-test exit condition. It must not be added to operation-controlled fields or lifecycle flows without approval.

## PR Review Rule

Reviewers must reject new Next API route code that owns ERP business mutation, lifecycle orchestration, permission/scope decisions, audit writes, outbox dispatch, DB transactions or local storage path ownership. New backend behavior starts in FastAPI, then Next may proxy it.

## Positive Baseline

`backend:boundary:enforce` currently reports 0 direct DB/Supabase access in `app/api` routes. Remaining TS backend-core warnings are cleanup targets.
