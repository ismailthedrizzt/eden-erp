# Eden ERP FastAPI Backend

This folder is the Python/FastAPI core backend scaffold for Eden ERP.

## Role

FastAPI will become the permanent core ERP backend. Next.js API routes remain only as BFF/proxy/adaptor endpoints during migration.

Core backend responsibilities:

- domain services
- operation orchestration
- process engine
- policy and scope engine
- data integrity guards
- audit log service
- outbox dispatcher and workers
- projection/read model services
- transaction boundary and database atomicity

## Local Setup

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

## Environment

```bash
DATABASE_URL=postgresql://postgres:<postgres-password>@localhost:5432/app1db
APP_ENV=production
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000
SUPABASE_URL=
SUPABASE_JWT_SECRET=
SUPABASE_JWKS_URL=
AUTH_REQUIRED=true
ALLOW_TRUSTED_PROXY_HEADERS=false
TRUSTED_PROXY_SECRET=local-proxy-secret
INTERNAL_BACKEND_TOKEN=local-internal-secret
LOG_FORMAT=json
DB_SLOW_QUERY_MS=750
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=10
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=1800
DB_STATEMENT_TIMEOUT_MS=1500
USE_SUPABASE_POOLER=false
API_SLOW_REQUEST_MS=1000
API_VERY_SLOW_REQUEST_MS=3000
EXPOSE_RESPONSE_TIME_HEADER=true
OUTBOX_MAX_RUNTIME_MS=25000
OUTBOX_LOCK_TTL_SECONDS=300
OUTBOX_MAX_RETRIES=5
ERROR_TRACKING_ENABLED=false
SENTRY_DSN=
```

The app imports without a database URL. Endpoints that need the database return a controlled
`BACKEND_DATABASE_NOT_CONFIGURED` response until `DATABASE_URL` is set.

Auth hardening:

- The single VS environment should keep `AUTH_REQUIRED=true`.
- Next BFF should forward the user access token as `Authorization: Bearer ...` when auth is enabled.
- Internal worker/cron endpoints use `INTERNAL_BACKEND_TOKEN` or `CRON_SECRET`, not a user JWT.
- Trusted proxy headers are hints only; the VS environment requires validated user and tenant membership.

## Observability

- Every request gets `X-Request-Id` and `X-Correlation-Id` response headers.
- Structured logs include request, tenant, user, company, operation and process context when available.
- Sensitive values such as token, secret, password, signed URL, identity number, tax number, phone and email are masked before logging.
- `GET /api/v1/system/metrics` returns the in-memory metrics snapshot.
- `GET /api/v1/system/health/deep` runs an internal deep health check.
- `GET /api/v1/system/performance/smoke` runs an internal DB/platform timing smoke.
- Production should protect system endpoints with `INTERNAL_BACKEND_TOKEN`.

## Performance

- SQLAlchemy async pool settings are controlled by `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`,
  `DB_POOL_TIMEOUT` and `DB_POOL_RECYCLE`.
- `DB_STATEMENT_TIMEOUT_MS` is applied for asyncpg connections when configured.
- `DB_SLOW_QUERY_MS`, `API_SLOW_REQUEST_MS` and `API_VERY_SLOW_REQUEST_MS`
  produce structured performance warnings.
- `backend/scripts/explain_queries.py` prepares EXPLAIN checks for critical read paths.
- `npm run load:test:scenarios` lists frontend/BFF load-test scenarios.

## Deployment

Container image:

```bash
docker build -f backend/Dockerfile backend
```

Production API command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Worker command:

```bash
python -m app.workers.outbox_worker
```

`python -m app.workers.outbox_worker --once` can be used for controlled cron-style runs. API and worker deployments should use separate DB pool budgets.

## Commands

```bash
ruff check .
mypy app
pytest
alembic revision --autogenerate -m "message"
alembic upgrade head
```

## Health

- `GET /health`
- `GET /api/v1/health`

Both return:

```json
{
  "status": "ok",
  "service": "eden-erp-backend",
  "version": "0.1.0"
}
```

## First Migrated Domain

Branch opening/closing is the first real FastAPI migration target:

- `POST /api/v1/companies/{company_id}/branch-openings`
- `GET /api/v1/companies/{company_id}/branch-openings/precheck`
- `POST /api/v1/companies/{company_id}/branch-closings`
- `GET /api/v1/companies/{company_id}/branch-closings/precheck`
- `GET /api/v1/branches`
- `GET /api/v1/branches/{branch_id}`
- `PATCH /api/v1/branches/{branch_id}`

Next.js routes proxy to these endpoints when `FASTAPI_BASE_URL` is configured.

## Migration Notes

Do not copy TypeScript backend logic blindly. The Python migration should use the canonical domain boundaries and contracts documented in `docs/architecture`.
