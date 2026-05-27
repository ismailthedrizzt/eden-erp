# Process / Outbox / Audit FastAPI Migration

Bu fazda Process, Outbox ve Audit platform katmanlari Python/FastAPI tarafinda canonical backend olmaya basladi. Next.js route'lari `FASTAPI_BASE_URL` varsa FastAPI'ye proxy eder; yoksa yalnizca migration bridge olarak TS fallback calistirir.

## Migrated FastAPI Endpoints

- `GET/POST /api/v1/processes`
- `GET /api/v1/processes/{process_id}`
- `POST /api/v1/processes/{process_id}/start`
- `POST /api/v1/processes/{process_id}/steps/{step_key}/complete`
- `POST /api/v1/processes/{process_id}/cancel`
- `GET/POST /api/v1/tasks`
- `GET /api/v1/tasks/{task_id}`
- `POST /api/v1/tasks/{task_id}/assign`
- `POST /api/v1/tasks/{task_id}/complete`
- `GET/POST /api/v1/approvals`
- `POST /api/v1/approvals/{approval_id}/approve`
- `POST /api/v1/approvals/{approval_id}/reject`
- `GET /api/v1/audit`
- `GET /api/v1/audit/{audit_id}`
- `GET /api/v1/audit/by-record`
- `GET /api/v1/audit/by-operation`
- `GET /api/v1/audit/by-process`
- `GET /api/v1/action-center`
- `GET /api/v1/action-center/counts`
- `GET /api/v1/action-center/summary`
- `GET /api/v1/action-center/by-record`
- `POST /api/v1/system/outbox/dispatch`

## Process / Task / Approval Service

Python process service `backend/app/domains/process` altinda process instance, task, approval ve process event islemlerini tenant scope ile yonetir. Process Engine mutation yapmaz; domain mutation ihtiyaci varsa ilgili operation/domain service'e baglanir. Branch opening/closing process tanimlari pilot olarak Python registry'ye eklendi.

## Audit Canonical Service

Audit service `backend/app/domains/audit` altinda canonical hale getirildi. `record_audit_best_effort` mevcut operation servisleriyle uyumlu kalir, fakat write/list/detail/by-record/by-operation/by-process davranislari Python servisindedir. Masking kurallari token/secret alanlarini tamamen, IBAN/kimlik/vergi no alanlarini son 4 karakter disinda, e-posta/telefonu kismi olarak maskeler.

## Outbox Dispatcher Worker

Outbox event yazimi ve dispatcher MVP'si `backend/app/domains/outbox` altindadir. Handlerlar su an idempotent no-op MVP olarak projection invalidation, Action Center, audit ve AI context refresh icin hazirdir.

Worker komutlari:

```bash
cd backend
python -m app.workers.outbox_worker --once
python -m app.workers.outbox_worker
```

Env:

- `DATABASE_URL` veya `SUPABASE_DB_URL`
- `OUTBOX_BATCH_SIZE`
- `OUTBOX_POLL_INTERVAL_SECONDS`
- `WORKER_ID`
- `INTERNAL_BACKEND_TOKEN` veya `CRON_SECRET` for `/api/v1/system/outbox/dispatch`

## Next Proxy Behavior

Bu route gruplari FastAPI configured ise proxy olur:

- `app/api/processes/**`
- `app/api/tasks/**`
- `app/api/approvals/**`
- `app/api/audit/**`
- `app/api/action-center/**`
- `app/api/cron/outbox-dispatch/route.ts`

`FASTAPI_BASE_URL` yoksa mevcut TS fallback yalnizca lokal/migration bridge olarak kalir. Yeni business logic bu route'lara eklenmeyecek.

## Known Gaps

- Python JWT/tenant hardening P1.
- Worker deployment/scheduler orchestration P1.
- Process UI detail/approval flow completion P2.
- Projection invalidation and notification handlers real implementation P2.
- Audit admin UI and export permissions P2/P3.
