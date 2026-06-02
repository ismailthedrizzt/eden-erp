# Environment Variables

Real values must never be committed. Examples live in `.env.local.example` and `backend/.env.example`.

## Next.js

- `NEXT_PUBLIC_APP_ENV`
- `NEXT_PUBLIC_RELEASE_CHANNEL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_ACTION_GUIDE_ENABLED`
- `NEXT_PUBLIC_GUIDED_TOUR_ENABLED`
- `DATABASE_URL`
- `FASTAPI_BASE_URL`
- `INTERNAL_BACKEND_TOKEN`
- `TRUSTED_PROXY_SECRET`
- `CRON_SECRET`

Only `NEXT_PUBLIC_*` values are browser-visible. Service role keys, internal backend tokens and proxy secrets are server-only.

The single database target is:

```text
postgresql://postgres:<postgres-password>@localhost:5432/app1db
```

Supabase variables are optional and should only be set if the deployment still uses Supabase Auth/API:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_JWT_SECRET`

## FastAPI

- `APP_ENV`
- `APP_NAME`
- `APP_VERSION`
- `DATABASE_URL`
- `INTERNAL_BACKEND_TOKEN`
- `AUTH_REQUIRED`
- `ALLOW_TRUSTED_PROXY_HEADERS`
- `TRUSTED_PROXY_SECRET`
- `CORS_ALLOWED_ORIGINS`
- `LOG_LEVEL`
- `LOG_FORMAT`
- `METRICS_ENABLED`
- `SENTRY_DSN`
- `ERROR_TRACKING_ENABLED`
- `DB_POOL_SIZE`
- `DB_MAX_OVERFLOW`
- `DB_POOL_TIMEOUT`
- `DB_POOL_RECYCLE`
- `DB_STATEMENT_TIMEOUT_MS`
- `DB_SLOW_QUERY_MS`
- `API_SLOW_REQUEST_MS`
- `API_VERY_SLOW_REQUEST_MS`

Optional Supabase Auth values:

- `SUPABASE_URL`
- `SUPABASE_JWT_SECRET`
- `SUPABASE_JWKS_URL`

## Worker

- `DATABASE_URL`
- `INTERNAL_BACKEND_TOKEN`
- `LOG_LEVEL`
- `LOG_FORMAT`
- `OUTBOX_BATCH_SIZE`
- `OUTBOX_POLL_INTERVAL_SECONDS`
- `OUTBOX_LOCK_TTL_SECONDS`
- `OUTBOX_MAX_RUNTIME_MS`
- `OUTBOX_MAX_RETRIES`
- `WORKER_ID`

## Safety Rules

- No `NEXT_PUBLIC_*SECRET`.
- No `NEXT_PUBLIC_INTERNAL_BACKEND_TOKEN`.
- No service role key in client components.
- No `.env`, `.env.local`, VS env files or real secrets in Git.
- Run `npm run env:safety` before deployment.
