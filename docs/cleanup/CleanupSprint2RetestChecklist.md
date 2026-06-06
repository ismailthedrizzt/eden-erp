# Cleanup Sprint 2 Retest Checklist

Date: 2026-06-06
Branch: main
Commit: 7207a273b12ad833ed34b173925d6ba5aaabb3f3
Environment: remote server, release app surface, local PostgreSQL/local DB, FastAPI canonical backend, Next.js BFF/proxy


## Technical
- [x] npm run typecheck
- [x] npm run build
- [x] npm run release:check
- [x] npm run env:safety
- [x] npm run db:target:check
- [x] npm run migration:status
- [x] npm run boundaries:check
- [x] npm run openapi:drift
- [x] backend ruff
- [x] backend mypy
- [x] backend pytest app/tests

## Runtime Smoke To Repeat Manually
- [ ] `/login`
- [ ] `/app`
- [ ] release-scope navigation
- [ ] hidden alias direct route
- [ ] command palette/search
- [ ] document media route
- [ ] API protected route unauthorized
- [ ] FastAPI health

## Manual
- [ ] release route visibility
- [ ] development route hidden in release
- [ ] alias route user-safe behavior
- [ ] no stack trace or secret visible
