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
```

The app imports without a database URL. Endpoints that need the database return a controlled
`BACKEND_DATABASE_NOT_CONFIGURED` response until `DATABASE_URL` or `SUPABASE_DB_URL` is set.

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
