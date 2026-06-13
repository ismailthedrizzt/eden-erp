# Deprecated Docs And Scripts Cleanup Report

Date: 2026-06-06
Branch: main
Commit: 7207a273b12ad833ed34b173925d6ba5aaabb3f3
Environment: remote server, release app surface, local PostgreSQL/local DB, FastAPI canonical backend, Next.js BFF/proxy


| Doc/script | Issue | Action | Canonical reference |
| --- | --- | --- | --- |
| `BackendApiMigration.md` | Supabase/PostgreSQL migration-era wording | Deprecated banner added | FastAPI + local DB + Next BFF |
| `AccountingModule.md` | Described public shorthand aliases as normal routes | Deprecated banner added | Release registry + canonical `/app/muhasebe/*` routes |
| `.env.local.example` | Supabase env looked like normal setup | Marked legacy compatibility only | Local DB env strategy |
| `infra/env.example` | Supabase env looked like normal setup | Marked legacy compatibility only | Local DB env strategy |
| `scripts/check-import-boundaries.js` | False positives from client facade imports and comments | Rule refined | Backend ownership policy |

## Risks
- P0: none.
- P1: older docs under audit/release still contain historical Supabase/Vercel references for traceability.
- P2: archive pass can move obsolete prompt-era docs later.
