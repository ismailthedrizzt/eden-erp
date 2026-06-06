# Dead Code Cleanup Report

Date: 2026-06-06
Branch: main
Commit: 7207a273b12ad833ed34b173925d6ba5aaabb3f3
Environment: remote server, release app surface, local PostgreSQL/local DB, FastAPI canonical backend, Next.js BFF/proxy


## Actions
No broad file deletion was performed. Safe cleanup was limited to type-only Supabase import removal in legacy type contracts and adding deprecation markers.

| File/path | Usage status | Action | Remaining risk |
| --- | --- | --- | --- |
| `lib/action-center/actionCenter.types.ts` | Used by UI and legacy helpers | Removed direct Supabase type import | Legacy `any` alias remains until FastAPI-only cleanup |
| `lib/audit/audit.types.ts` | Used by audit UI and legacy audit service | Removed direct Supabase type import | Legacy audit service still accepts old client shape |
| `lib/read-models/projection.types.ts` | Legacy read-model types | Removed direct Supabase type import | Full read-model migration remains P1/P2 |
| `lib/process/process.types.ts` | Legacy process types | Removed direct Supabase type import | Full process migration remains P1/P2 |

## Decision
Large deletion was deferred. Caller certainty is required before deleting legacy wrappers or placeholder pages.
