# Boundary Warning Cleanup Report

Date: 2026-06-06
Branch: main
Commit: 7207a273b12ad833ed34b173925d6ba5aaabb3f3
Environment: remote server, release app surface, local PostgreSQL/local DB, FastAPI canonical backend, Next.js BFF/proxy


## Baseline
- Start boundary warnings: 162
- Start critical errors: 0
- Final boundary warnings: 1
- Final critical errors: 0

## Changes
- Added a client-safe facade allowlist for `lib/services/*`, `lib/action-center/actionCenterClient`, `lib/action-center/actionCenter.types`, `lib/audit/auditClient`, and `lib/audit/audit.types`.
- Kept server-only rules active for Supabase server/client factories, `pg`, Node server modules, server secrets, direct DB factories and route backend imports.
- Made fallback detection comment-aware so route headers/NOTES do not create false-positive fallback warnings.

## Remaining Warning
- `components/ai/ActionGuideSearch.tsx` imports TS backend-core helpers. Category: development-only AI/action-guide. Priority: P1. Release blocker: no.

## P0/P1/P2
- P0: none.
- P1: remaining AI Action Guide boundary debt.
- P2: future stricter split between client facade and backend-core naming.
