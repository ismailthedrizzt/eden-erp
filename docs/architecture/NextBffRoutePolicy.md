# Next BFF Route Policy

Date: 2026-06-06

## Purpose

Define what a Next.js API route may own in the remote server + local DB architecture.

## Allowed Route Classes

1. `proxy_to_fastapi`: thin FastAPI proxy only.
2. `keep_session_bootstrap`: login, OTP, setup intent and session cookie bootstrap.
3. `keep_upload_adapter`: browser upload/form-data adapter; storage/domain write remains FastAPI.
4. `keep_ui_adapter`: UI convenience adapter with no ERP domain mutation.
5. `deprecated_wrapper`: old wrapper awaiting caller cleanup.

## Not Permanent

- `migrate_to_fastapi`
- `proxy_to_fastapi_with_temporary_fallback`
- `delete_obsolete`

## Hard Rules

- Next API routes must not own ERP business mutation.
- Next API routes must not own lifecycle operation orchestration.
- Next API routes must not own permission, scope, audit, outbox or DB transaction boundaries.
- Operation-controlled fields cannot be changed through a Next fallback.
- New `app/api/**/route.ts` files must carry migration headers.
- New business behavior must be implemented in FastAPI first, then exposed through a proxy route if a BFF endpoint is needed.
