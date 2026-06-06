# Backend Ownership Policy

Date: 2026-06-06

## Policy

- FastAPI is the canonical backend.
- Business mutation belongs to FastAPI.
- DB access belongs to FastAPI and worker processes.
- Next.js route handlers are BFF/proxy adapters unless explicitly documented otherwise.
- TypeScript may keep generated clients, shared types, UI contracts and thin adapters.
- Runtime ERP orchestration, lifecycle, audit, policy, scope and persistence must not be reintroduced into Next.js server modules.

## Positive Baseline

`backend:boundary:enforce` currently reports 0 direct DB/Supabase access in `app/api` routes. Remaining TS backend-core warnings are cleanup targets.
