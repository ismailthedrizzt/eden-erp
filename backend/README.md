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
DATABASE_URL=postgresql+asyncpg://...
# or
SUPABASE_DB_URL=postgresql+asyncpg://...
APP_ENV=local
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000
SUPABASE_URL=https://...
SUPABASE_JWT_SECRET=...
SUPABASE_JWKS_URL=https://.../auth/v1/.well-known/jwks.json
AUTH_REQUIRED=false
ALLOW_TRUSTED_PROXY_HEADERS=true
TRUSTED_PROXY_SECRET=local-proxy-secret
INTERNAL_BACKEND_TOKEN=local-internal-secret
LOG_FORMAT=json
DB_SLOW_QUERY_MS=750
ERROR_TRACKING_ENABLED=false
SENTRY_DSN=
```

The app imports without a database URL. Endpoints that need the database return a controlled
`BACKEND_DATABASE_NOT_CONFIGURED` response until `DATABASE_URL` or `SUPABASE_DB_URL` is set.

Auth hardening:

- Production/staging require Supabase JWT validation.
- Local development can relax auth with `AUTH_REQUIRED=false`.
- Next BFF should forward the Supabase access token as `Authorization: Bearer ...`.
- Internal worker/cron endpoints use `INTERNAL_BACKEND_TOKEN` or `CRON_SECRET`, not a user JWT.
- Trusted proxy headers are hints only; production requires validated JWT user and tenant membership.

## Observability

- Every request gets `X-Request-Id` and `X-Correlation-Id` response headers.
- Structured logs include request, tenant, user, company, operation and process context when available.
- Sensitive values such as token, secret, password, signed URL, identity number, tax number, phone and email are masked before logging.
- `GET /api/v1/system/metrics` returns the in-memory metrics snapshot.
- `GET /api/v1/system/health/deep` runs an internal deep health check.
- Production should protect system endpoints with `INTERNAL_BACKEND_TOKEN`.

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
