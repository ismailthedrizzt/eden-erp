# Deployment Topology

## Components

- Web: Next.js frontend and BFF/proxy routes.
- API: FastAPI core backend.
- Worker: Python outbox/process/background worker.
- DB: Supabase/PostgreSQL.
- Auth/Storage: Supabase Auth and Storage.
- Observability: structured logs, metrics and error tracking.
- Optional future cache/queue: Redis or managed queue.

## Traffic Flow

```mermaid
flowchart LR
  Browser["Browser"] --> Web["Next.js Web/BFF"]
  Web --> API["FastAPI Core Backend"]
  API --> DB["PostgreSQL/Supabase"]
  API --> Storage["Supabase Storage"]
  API --> Outbox["Outbox Table"]
  Worker["Python Worker"] --> DB
  Worker --> Outbox
  API --> Observability["Logs / Metrics / Errors"]
  Worker --> Observability
```

Browser to FastAPI direct access is a future option only after CORS/JWT strategy is explicitly approved.

## Backend Ownership Rule

FastAPI is the deployment unit for core ERP backend behavior. Next.js API
routes deployed with the web app are compatibility BFF endpoints only. They may
forward auth/session context, handle upload/session/bootstrap concerns, and keep
documented temporary fallbacks during migration. They must not become the
permanent home for operation orchestration, process, audit, outbox, policy,
readiness, integrity or projection runtime logic.

Release checks should include:

- `npm run migration:status`
- `npm run boundaries:check`
- `npm run ts-backend:inventory` when architecture inventory needs refresh

## Platform Options

- Vercel for Next.js plus external FastAPI/worker containers.
- Docker Compose on VPS for all services except managed Supabase.
- Kubernetes later for multi-tenant scale.
- GitHub Actions can trigger deploy hooks for each runtime independently.
