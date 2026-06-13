# Cleanup Sprint 2 Risk Register

Date: 2026-06-06
Branch: main
Commit: 7207a273b12ad833ed34b173925d6ba5aaabb3f3
Environment: remote server, release app surface, local PostgreSQL/local DB, FastAPI canonical backend, Next.js BFF/proxy


| ID | Source | Risk | Area | Severity | Action taken | Remaining risk | Retest | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CS2-001 | Boundary checker | False positives hid real boundary state | Boundary | P1 | Client-safe facade allowlist and comment-aware fallback detection | One development-only warning remains | `npm run boundaries:check` | Platform |
| CS2-002 | Supabase type imports | Type-only imports kept dependency residue noisy | Supabase residue | P1 | Removed selected type-only imports | Deprecated adapters and legacy helpers remain | `npm run typecheck`, build | Platform |
| CS2-003 | Legacy aliases | Public shorthand aliases could confuse release scope | Routing | P1 | Verified hidden/development registry status; deprecated docs | Direct route smoke still manual | release check, manual smoke | Product/platform |
| CS2-004 | Deprecated docs | Old docs could guide wrong deployment/migration | Docs/scripts | P1 | Added deprecated banners and legacy env notes | More historical docs remain | docs audit | Platform |
| CS2-005 | AI Action Guide | Remaining backend-core client warning | UI/boundary | P1 | Classified as development-only | Needs facade split in Sprint 3 | boundary check | Product/platform |
