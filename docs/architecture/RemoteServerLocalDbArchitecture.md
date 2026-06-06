# Remote Server + Local DB Architecture

Date: 2026-06-06
Branch: `main`
Commit baseline: `09e90b5588a43af147d75b2926d5368a6f4635b9`
Environment: remote server, release visibility mode

## Canonical Architecture

Eden ERP now runs on a remote server with a local/server PostgreSQL database. Vercel and Supabase are no longer canonical runtime dependencies. Existing Supabase/Vercel references are treated as legacy or compatibility residue until explicitly removed.

| Layer | Canonical role |
| --- | --- |
| Next.js | UI, BFF and proxy layer. |
| FastAPI | Canonical backend for business mutation, policy, lifecycle, audit and DB access. |
| PostgreSQL local/server DB | Canonical data store and protected asset. |
| Local filesystem document storage | Canonical document file layer. |
| Workers | Outbox, email, reminder, reporting, automation and webhook background processes. |
| Reverse proxy | Public traffic routing and SSL termination, currently outside repo-level config. |
| Release registry | Controls live user-facing surface; build surface is broader. |
| Auth | App session in Next plus FastAPI trusted proxy context. |

## Runtime Flow

```text
Browser
  -> Reverse proxy
  -> Next.js UI/BFF
  -> FastAPI through trusted proxy headers
  -> local PostgreSQL
  -> local document storage for media
```

Direct browser-to-FastAPI access is not the canonical flow for the current release baseline.

## Positive Architecture Decisions

- Card data and lifecycle operations are separate.
- `Ekle` creates draft state; official activation/completion is a lifecycle operation.
- Business mutation belongs to FastAPI.
- Documents are uploaded contextually but managed centrally.
- Release surface is not the same as build surface.
- Action Center is a business work center, not a technical event dump.
- Local DB is a protected asset.
- Critical operations must be audited.

## Current Limitations

- Supabase-compatible backend config and JWT verifier names remain.
- Runtime-capable Supabase TS modules remain in legacy areas.
- Worker process topology is not confirmed in PM2.
- Reverse proxy and SSL config are not represented in the repo.
- Backend lint/type/test baseline is not green.

## Decision

`READY_WITH_LIMITATIONS`: the architectural direction is correct and no P0 was confirmed, but P1 cleanup remains before the platform can be considered clean.
