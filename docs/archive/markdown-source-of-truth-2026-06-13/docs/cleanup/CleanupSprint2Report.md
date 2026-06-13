# Cleanup Sprint 2 Report

Date: 2026-06-06
Branch: main
Commit: 7207a273b12ad833ed34b173925d6ba5aaabb3f3
Environment: remote server, release app surface, local PostgreSQL/local DB, FastAPI canonical backend, Next.js BFF/proxy


## Purpose
Boundary, legacy, alias and codebase simplification after Cleanup Sprint 1. No business feature was added. The sprint focused on reducing false-positive boundary noise, documenting legacy aliases, limiting Supabase/Vercel residue, and preserving release/runtime safety.

## Baseline Metrics
| Metric | Start | Final |
| --- | ---: | ---: |
| Boundary warnings | 162 | 1 |
| Boundary critical errors | 0 | 0 |
| Temporary fallback routes | 0 | 0 |
| Route files | 521 | 521 |
| Missing migration headers | 99 | 99 |
| P0 missing headers | 0 | 0 |
| Proxy-only violations | 0 | 0 |
| Release registry/page routes | 146/146 | 146/146 |

## Changes Made
- Boundary checker now treats documented client-safe facades as allowed client imports while keeping server Supabase, DB factories, server modules and secret env references as errors.
- Boundary checker now ignores comments when looking for executable fallback/legacy behavior in `proxy_to_fastapi` routes.
- Removed type-only `@supabase/supabase-js` imports from selected legacy TS type files by replacing them with a local `LegacySupabaseClient` alias.
- Added/clarified deprecated notes for legacy migration/accounting docs and Supabase browser adapter.
- Marked Supabase env examples as legacy compatibility only.

## Test Results
| Command | Result | Exit |
| --- | --- | --- |
| npm run typecheck | PASS | 0 |
| npm run build | PASS | 0 |
| npm run release:check | PASS | 0 |
| npm run env:safety | PASS | 0 |
| npm run db:target:check | PASS | 0 |
| npm run migration:status | PASS | 0 |
| npm run boundaries:check | PASS | 0 |
| npm run openapi:drift | PASS | 0 |
| backend ruff | PASS | 0 |
| backend mypy | PASS | 0 |
| backend pytest app/tests | PASS | 0 |

## Final Decision
READY_WITH_LIMITATIONS

## Rationale
No P0 was found. Build, typecheck, release/env/db checks, migration status, boundary check, OpenAPI drift, backend ruff, backend mypy and backend pytest all pass. One remaining boundary warning is development-only AI Action Guide UI debt, not release scope. Alias routes remain hidden/development in the release registry. Remaining Supabase/Vercel residue is legacy/dependency/docs debt and not canonical runtime.
