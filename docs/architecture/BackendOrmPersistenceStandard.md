# Backend ORM Persistence Standard

<!-- source-of-truth-standard: contract overrides markdown -->

Version: 1.0.0  
Status: active architecture standard  
Owner: Engineering / Product Architecture  
Related: `docs/architecture/PageFlowDeliveryContract.md`

## Decision

Eden ERP backend write pipeline uses SQLAlchemy 2.x async ORM as the canonical
persistence infrastructure for new CRUD, wizard and lifecycle flows.

The ORM is backend-only. Next.js, React components and BFF routes do not import
ORM models and do not create DB records directly.

## Required Flow

```text
Frontend form state
-> Zod validation
-> generated API client
-> Next BFF context pass-through
-> FastAPI Pydantic request model
-> service-layer command model
-> SQLAlchemy Unit of Work
-> typed repository
-> ORM entity / explicit projection query
-> PostgreSQL
```

## Boundaries

- Pydantic request/response schemas are API contracts.
- Service command models are business operation contracts.
- SQLAlchemy ORM models are persistence contracts.
- Repository methods receive normalized typed values, not raw frontend payloads.
- Unit of Work is the transaction boundary for write flows.
- Alembic remains the schema migration authority.
- OpenAPI remains the frontend/backend contract authority.

## New Code Rules

New create, update, submit and lifecycle code must follow these rules:

1. Endpoint accepts a Pydantic request model, never a generic raw dict.
2. Pydantic normalizes date, datetime, UUID and enum fields.
3. Service builds a typed command object.
4. Repository constructs ORM entities from that command.
5. Write flow runs inside `SqlAlchemyUnitOfWork`.
6. The service calls `commit()` explicitly after all writes succeed.
7. If `commit()` is not called, the Unit of Work rolls back on exit.
8. Repository methods do not accept component form state.
9. JSONB payloads are validated before persistence.
10. Audit/outbox writes are required when the flow contract says they are required.

## Raw SQL Policy

Raw SQL can still be used for:

- read-heavy projections,
- reporting queries,
- migration scripts,
- database diagnostics,
- explicitly reviewed performance paths.

Raw SQL cannot be used as an escape hatch for untyped write payloads. Write SQL
must remain inside repository/service modules, receive normalized values and be
covered by contract tests.

## Date / Datetime Contract

- `date` fields represent user-selected calendar dates.
- `datetime` fields represent audit, concurrency or system timestamps.
- PostgreSQL timestamp columns must receive Python `datetime` values, not strings.
- Frontend may send ISO strings; backend Pydantic converts them before service code.
- Repository and ORM layers never parse date strings.

## UUID Contract

- Frontend may carry UUIDs as strings.
- Frontend validates UUID shape with Zod.
- Backend Pydantic converts required IDs to `UUID`.
- Empty strings are invalid.
- Repository code receives UUID-compatible typed values.

## Enum Contract

- UI labels and canonical values are separate.
- Backend uses enum/Literal/Pydantic validation for accepted values.
- DB stores canonical values, not Turkish labels.

## Migration Plan

1. All new flows use `app.persistence`.
2. Existing high-risk flows are migrated when touched:
   - representative authority,
   - representative activation,
   - company wizard,
   - partner operations,
   - branch wizard,
   - document upload metadata,
   - Temalarimiz backend persistence.
3. Existing raw SQL read projections stay in place until a domain rewrite is useful.
4. Contract tests are added before a flow is marked live.

## Current Infrastructure

- `app.persistence.orm.Base`
- `app.persistence.orm.UuidPrimaryKeyMixin`
- `app.persistence.orm.TimestampMixin`
- `app.persistence.orm.WorkspaceScopedMixin`
- `app.persistence.orm.LifecycleStatusMixin`
- `app.persistence.repository.SqlAlchemyRepository`
- `app.persistence.unit_of_work.SqlAlchemyUnitOfWork`

## Acceptance

A new backend write flow is not complete unless:

- Pydantic request model exists,
- service command is typed,
- Unit of Work is used,
- repository receives normalized input,
- commit path is explicit,
- rollback behavior is tested,
- date/datetime/UUID/enum invalid payload tests exist,
- OpenAPI and generated client are synchronized.
