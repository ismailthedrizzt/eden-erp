# Database Pooling Production Guide

## Amaç

FastAPI, worker processleri ve reporting/export joblari icin connection explosion riskini azaltmak ve Supabase/PostgreSQL kaynaklarini kontrollu kullanmak.

## Configuration

| Variable | Meaning | Production starter |
| --- | --- | --- |
| `DB_POOL_SIZE` | API process base pool | 5-10 per process |
| `DB_MAX_OVERFLOW` | Burst connections | 0-5 unless measured |
| `DB_POOL_TIMEOUT` | Connection wait timeout | 10-30s |
| `DB_POOL_RECYCLE` | Connection recycle seconds | 900-1800 |
| `DB_STATEMENT_TIMEOUT_MS` | PostgreSQL statement timeout | 1500-5000ms by workload |
| `DB_SLOW_QUERY_MS` | Slow query log threshold | 500-1000ms |
| `WORKER_DB_POOL_SIZE` | Optional worker override | 1-3 per worker process |
| `USE_SUPABASE_POOLER` | Pooler/PgBouncer routing flag | true when using transaction pooler |

## Production Sizing

- API pool budget = API replicas x (`DB_POOL_SIZE` + `DB_MAX_OVERFLOW`).
- Worker budget = worker replicas x effective worker pool.
- Reporting/export workers should have the smallest pool and stricter batch limits.
- Supabase pooler/PgBouncer should be preferred for serverless or autoscaled API deployments.
- Admin/manual jobs must not share unlimited direct DB URLs.

## Statement Timeout

`DB_STATEMENT_TIMEOUT_MS` must be set in staging and production. Long reporting/export queries should run through dedicated worker paths with explicit pagination or materialized read models, not unbounded request/response API calls.

## Monitoring

- Active connections by application name/process.
- Pool checked out/overflow/wait time.
- Slow query count and query fingerprint.
- DB CPU, locks, dead tuples and temp file usage.
- Worker backlog when pool wait increases.

## P0 Blockerlar

- Production'da DB pool limits yok.
- Serverless/API/worker replicas toplam connection sinirini asiyor.
- Statement timeout yok.
- Connection leak veya pool wait metriği izlenemiyor.
