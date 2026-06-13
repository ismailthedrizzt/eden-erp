# Backend Consolidation Plan

<!-- source-of-truth-standard: contract overrides markdown -->

## Decision

FastAPI is the only canonical backend for Eden ERP data operations.

Next.js must be treated as:

- UI runtime
- server-side rendering/runtime shell
- temporary HTTP proxy to FastAPI
- temporary auth/session adapter while the auth boundary is finalized

Next.js must not own database CRUD, domain services, policy decisions, process orchestration, audit, outbox, projections, reporting or imports.

## Current Audit

Run:

```bash
npm run backend:boundary:audit
```

Latest local audit:

```text
app/api route files: 500
FastAPI proxy route files: 365
app/api files with direct DB/Supabase access: 150
server TS files with direct DB/Supabase access: 260
```

This means the repository is still hybrid. The live architecture target is not yet fully enforced.

## Migration Rule

For every remaining Next API route that touches DB/Supabase:

1. Implement or expose the equivalent FastAPI endpoint.
2. Move validation, permission checks, tenant/company scope checks and transactions into FastAPI.
3. Convert the Next route to `proxyToFastApi(...)`.
4. Remove Supabase client usage from the route and any helper it calls.
5. Add the route to the boundary audit as clean.

## Enforcement

Audit-only:

```bash
npm run backend:boundary:audit
```

Strict mode:

```bash
npm run backend:boundary:enforce
```

Strict mode currently fails by design because legacy Next DB routes remain. Enable it in CI only after the remaining direct DB routes are migrated.

## Priority

1. Auth/session and tenant/workspace routes.
2. Company, branch, partner, representative and employee CRUD.
3. Accounting and bank movement routes.
4. Upload/media/document routes.
5. Reference-data maintenance and cron routes.

No new feature should add Supabase/DB access in Next.js.
