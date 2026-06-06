# Current Architecture Snapshot

Date: 2026-06-06
Branch: `main`
Commit: `9b1b0297ce4171cd85d0154ed4bd9a2ebc2e8d7d`
Working environment: remote server release runtime

## Tested Commands

See `TransitionBaselineReport.md` for the full command table. Key architecture checks:

- `npm run build`: PASS
- `npm run backend:boundary:enforce`: PASS during build
- `npm run boundaries:check`: PASS with 13 warnings
- `npm run openapi:drift`: PASS
- `npm run migration:status`: PASS with 99 non-P0 missing headers

## Current Shape

| Layer | Current baseline |
| --- | --- |
| UI | Next.js App Router application under `app/app/**`. |
| BFF | Next route handlers under `app/api/**`, mostly proxying to FastAPI. |
| Backend | FastAPI in `backend/app/**`; canonical business/data access should live here. |
| API contract | FastAPI OpenAPI exported to `backend/openapi.json`; generated TypeScript client at `lib/generated/backend-client/types.ts`. |
| Database | Local PostgreSQL via `DATABASE_URL`; safety check reports `postgresql://***:***@localhost:5432/app1db`. |
| Migrations | Alembic under `backend/migrations`; current known head includes `20260606_0100_document_file_dedup.py`. |
| Storage | Local document storage is canonical for new document paths; old Supabase storage utilities remain as residue. |
| Auth | Next app-session cookie plus trusted proxy headers to FastAPI; legacy Supabase JWT verifier remains in backend compatibility code. |
| Release visibility | `lib/release/routeReleaseRegistry.ts` is active and passes registry consistency. |

## Findings

- FastAPI is the intended canonical backend, and the enforced Next boundary check finds no direct DB/Supabase access in `app/api` route files.
- `npm run boundaries:check` still reports 13 frontend/shared imports of TS backend-core helpers, which is a transition debt.
- `package.json` now uses `.venv/bin/python` for backend scripts; manual `python -m` commands fail on the remote server because no global `python` exists.
- Supabase dependencies still exist in `package.json`: `@supabase/ssr` and `@supabase/supabase-js`.
- Documentation still contains old Supabase/Vercel architecture assumptions.

## P0/P1/P2 Risks

| Priority | Risk | Impact |
| --- | --- | --- |
| P0 | None confirmed by architecture checks | No immediate confirmed direct frontend DB write path in `app/api`. |
| P1 | TS backend-core helper imports remain | Architecture boundaries are not fully clean. |
| P1 | Supabase TS legacy modules remain | Future work may accidentally use non-canonical data/storage paths. |
| P2 | Old documentation contradicts new runtime | Operator/developer confusion. |

## Next Phase Impact

The next cleanup phase can be measured by reducing:

- Supabase/Vercel residue file count.
- Boundary warnings from 13 to 0.
- Backend lint/mypy/test failures to 0.
- Legacy TS backend inventory.
