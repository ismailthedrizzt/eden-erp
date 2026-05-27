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

## Migration Notes

Do not copy TypeScript backend logic blindly. The Python migration should use the canonical domain boundaries and contracts documented in `docs/architecture`.
