# Remote Server Local DB Alignment Report

## Changed Files

- `middleware.ts`
- `scripts/check-database-target.js`
- `scripts/check-release-env-safety.js`
- `lib/env/releaseSafety.ts`
- `package.json`
- `next.config.js`
- `backend/app/core/security.py`
- `backend/app/core/config.py`
- `backend/app/domains/documents/storage.py`
- `docker-compose.yml`
- `lib/supabase/server.ts`
- `README.md`
- `docs/architecture/EnvironmentStrategy.md`
- `docs/AI_COLLABORATION_GUIDE.md`

## Why Changed

Eden ERP now runs on a remote server with local PostgreSQL/local DB. The alignment removes mandatory Vercel/Supabase assumptions from auth fallback, DB target safety, PWA media caching, release env safety and operations documentation.

## P0/P1/P2

- P0: middleware depending on Supabase env for protected routes.
- P0: release DB seed/reset/migration without approval.
- P1: old Supabase Storage cache rules implying public media caching.
- P1: legacy Supabase server client imports still exist as migration inventory.
- P2: old docs still reference Vercel/Supabase for historical context.

## Field Test Impact

Field test can use app-session auth, Next BFF trusted proxy context and local DB target checks without Supabase env values.

## Remaining Risks

- Some legacy TypeScript migration inventory still imports Supabase types.
- Full backend test runtime depends on server Python dependencies and DB availability.

## Decision

READY_FOR_MANUAL_FIELD_TEST_WITH_LIMITATIONS
