# Architecture Summary

Status: canonical AI context
Updated: 2026-06-13

Eden ERP is a modular ERP platform moving toward a Next.js frontend/BFF plus FastAPI/Python core backend. PostgreSQL is the production database. Permanent ERP business logic belongs in FastAPI domain services, not in Next.js API routes.

## Layer Rules

- UI calls typed frontend services.
- Next.js BFF routes are thin proxies or explicit UI/session/upload adapters.
- FastAPI owns permission checks, lifecycle orchestration, domain validation, audit/outbox, and transaction boundaries.
- Domain services own business mutation.
- Projections/read models support UI lists and summaries.

## Primary References

- `docs/architecture/EdenERPPlatformArchitecture.md`
- `docs/architecture/NextBffRoutePolicy.md`
- `docs/architecture/PageFlowDeliveryContract.md`
- `docs/architecture/BackendOrmPersistenceStandard.md`
- `docs/architecture/DomainBoundaries.md`
- `docs/architecture/TransactionBoundary.md`
- `docs/architecture/OpenAPIContractStrategy.md`
