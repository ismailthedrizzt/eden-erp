# Scaling Architecture

Bu dokuman Eden ERP'nin ciddi olcek hedefi icin hedef runtime mimarisini tanimlar.

## Target Runtime

- Next.js frontend/BFF olarak kalir.
- FastAPI stateless core backend olarak yatay olceklenir.
- PostgreSQL/Supabase veri katmanidir.
- Background workers outbox, process, projection, audit ve notification islerini yurutur.
- Read-heavy listeler projection/read model ile servis edilir.
- Critical operations SQLAlchemy transaction, DB transaction/RPC veya stored procedure ile atomic yapilir.
- Capital increase and ownership updates run through one FastAPI transaction boundary so company capital, partner distribution, ownership transactions, lifecycle, audit and outbox stay consistent.
- Multi-tenant isolation `tenant_id`, RLS ve app policy ile korunur.
- FastAPI validates Supabase JWTs and resolves tenant/user/company scope server-side; Next BFF proxy headers are hints, not the production security boundary.
- Feature/module readiness startup ve request guardlarda kontrol edilir.
- Observability/logging/metrics zorunlu platform katmani olmalidir.
- Request/correlation ID, structured JSON logs, metrics snapshots, slow query warnings and worker logs are standard FastAPI runtime signals.

## Scale Target

- yuzlerce firma
- eszamanli binlerce kullanici
- yogun liste/read model trafigi
- arka planda process/outbox/audit/notification isleri

## Logical Deployment

```mermaid
flowchart LR
  Browser["Browser"]
  Next["Next.js Frontend / BFF"]
  FastAPI["FastAPI Core Backend"]
  Workers["Python Workers"]
  PG["Supabase / PostgreSQL"]
  Storage["Supabase Storage"]
  Auth["Supabase Auth"]
  Observability["Logs / Metrics / Traces"]

  Browser --> Next
  Next --> FastAPI
  FastAPI --> PG
  FastAPI --> Storage
  FastAPI --> Auth
  FastAPI --> Workers
  Workers --> PG
  FastAPI --> Observability
  Workers --> Observability
```

## Data Access

FastAPI owns core data access. Next.js should not hold permanent domain query/mutation logic. Projection/read model endpoints should favor indexed views or materialized read tables for high-volume screens.

## Background Work

Workers process:

- outbox dispatch
- process task timers
- projection refresh
- audit aggregation
- notification delivery
- AI context refresh

External side effects must happen outside critical DB transactions.

## Transaction Strategy

Critical operations use one of:

1. SQLAlchemy async transaction with domain services.
2. PostgreSQL RPC/stored procedure for highly atomic DB-side logic.
3. Hybrid: Python orchestration + DB transaction boundary.

Partial failure should mark operation state and audit trail; aggressive data deletion is not default compensation.

## Tenant Isolation

Tenant isolation combines:

- `tenant_id` on core tables
- RLS where enabled
- FastAPI request context
- policy/scope checks
- audit of denied attempts

No endpoint should reveal cross-tenant existence through detailed errors.

## Observability

Required follow-up:

- structured JSON logs
- request id and correlation id
- operation id / process id tracing
- outbox retry metrics
- projection lag metrics
- audit write failure alerts

Step 16 implements the first observability foundation: request/correlation middleware, structured logging context, in-memory metrics, slow query hooks, system metrics/deep health endpoints and Next BFF correlation propagation. Central log/metric storage remains a deployment follow-up.
