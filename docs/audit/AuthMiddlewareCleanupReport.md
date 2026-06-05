# Auth Middleware Cleanup Report

## Changed Files

- `middleware.ts`
- `lib/env/releaseSafety.ts`
- `scripts/check-release-env-safety.js`
- `backend/app/core/security.py`

## Why Changed

Primary authentication is now `eden_app_session`. Middleware no longer creates a Supabase server client when the app session is missing. FastAPI accepts trusted proxy headers when configured with `ALLOW_TRUSTED_PROXY_HEADERS=true` and `TRUSTED_PROXY_SECRET`.

## P0/P1/P2

- P0: protected route opens without app session.
- P0: middleware crashes when Supabase env is absent.
- P0: release enables legacy Supabase auth fallback.
- P1: direct FastAPI exposure without proxy restrictions or external JWT strategy.

## Field Test Impact

Unauthenticated pages redirect to `/login`; unauthenticated API routes return `AUTH_REQUIRED`.

## Remaining Risks

Direct FastAPI public exposure still needs reverse proxy rules or external JWT configuration documented per deployment.
