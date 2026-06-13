# Eden ERP FastAPI Backend

<!-- source-of-truth-standard: contract overrides markdown -->

This service is the new backend source of truth for Eden ERP. It keeps Supabase
PostgreSQL as the database provider while moving sensitive writes, permission
checks, module checks, audit logging, history, optimistic locking, and workflow
hooks behind server-side APIs.

## Local Run

```bash
cd apps/api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Required environment variables are documented in `infra/env.example`.
