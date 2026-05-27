# Observability / Logging / Metrics

Step 16 establishes the first production observability foundation for the FastAPI core backend.

## Structured Logging

FastAPI uses JSON-compatible structured logs in production. Every log entry can include:

- `request_id`
- `correlation_id`
- `tenant_id`
- `user_id`
- `company_id`
- `branch_id`
- `operation_id`
- `process_instance_id`
- `task_id`
- `outbox_event_id`
- `endpoint`
- `method`
- `status_code`
- `duration_ms`
- `error_code`
- `module_key`
- `action_key`

The logging context is backed by Python `contextvars`, so request and operation identifiers can flow through domain services without passing every value manually.

## Request And Correlation IDs

`RequestContextMiddleware` reads incoming `X-Request-Id` and `X-Correlation-Id` headers. If they are absent, FastAPI generates a UUID. Both headers are returned on every response.

Next BFF proxy forwards these headers to FastAPI and propagates the FastAPI response headers back to the frontend.

## Metrics

The MVP metrics registry is in-memory and available through:

```txt
GET /api/v1/system/metrics
```

Production access requires the internal token. Metrics currently include:

- request count and duration
- error count
- operation status counts
- operation duration
- outbox status counts and handler duration
- audit write failure count
- DB query duration
- projection query/fallback counts

Prometheus/OpenTelemetry export is a follow-up.

## Error Normalization

FastAPI global exception handlers normalize:

- Eden business errors
- validation errors
- HTTP errors
- SQLAlchemy dependency errors
- unexpected exceptions

Unexpected production errors return:

```json
{
  "error": "Islem tamamlanamadi. Lutfen tekrar deneyin.",
  "code": "INTERNAL_SERVER_ERROR",
  "request_id": "...",
  "correlation_id": "..."
}
```

Stack traces, SQL text, token details and internal file paths are not returned to users.

## Sensitive Data

`backend/app/core/sanitization.py` masks:

- password/token/secret/api key fields
- Authorization and Cookie headers
- signed URLs
- identity, tax, passport and account numbers
- phone and email

Request logging does not write full payloads.

## DB Slow Query Logging

SQLAlchemy event listeners record `db_query_duration_ms`. Queries slower than `DB_SLOW_QUERY_MS` log a structured warning with truncated statement text. Production dashboards should use this signal with PostgreSQL/Supabase query logs.

## Operation, Process, Outbox, Audit And Projection Logs

- Operations log start, duplicate, created, completed and failed states.
- Process events log process/task/approval transitions through the process event service.
- Outbox logs batch and per-event processing, retry and failure context.
- Audit logs only technical success/failure metadata, not audit payloads.
- Projection services record duration, row count and fallback usage.

Audit remains the user/compliance trace. Observability logs are technical runtime traces.

## Error Tracking

`backend/app/core/error_tracking.py` is a no-op extension point. `SENTRY_DSN` and `ERROR_TRACKING_ENABLED` are reserved for Sentry or another provider.

## Recommended Production Stack

- OpenTelemetry tracing for Next/FastAPI/worker request chains
- Prometheus/Grafana for metrics
- Loki or ELK for structured logs
- Sentry for exception aggregation
- Supabase/Postgres logs for query-level diagnosis

## Known Gaps

- Metrics are in-memory and reset on process restart.
- No distributed trace exporter yet.
- Build-time and worker runtime logs are not centralized yet.
- DB slow query dashboards are not provisioned yet.
- Frontend UI does not yet expose request ID as a polished support-code detail everywhere.
