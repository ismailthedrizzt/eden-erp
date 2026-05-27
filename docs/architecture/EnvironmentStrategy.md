# Environment Strategy

Eden ERP deploys as separate but coordinated runtimes: Next.js web/BFF, FastAPI core backend, Python worker and PostgreSQL/Supabase.

## Local

- Next URL: `http://localhost:3000`
- FastAPI URL: `http://localhost:8000`
- DB: local PostgreSQL or Supabase dev project
- Auth: `AUTH_REQUIRED=false` is allowed
- Trusted proxy headers: allowed with `ALLOW_TRUSTED_PROXY_HEADERS=true`
- Logs: readable or JSON
- Metrics: enabled, internal endpoints may be open for local work
- Worker: optional loop or `--once`
- Migrations: manual
- Seed/demo data: allowed

## Development

- Next and FastAPI can run as preview deployments or shared dev containers.
- Auth can use real Supabase or tightly scoped mock/dev fallback.
- Debug logs are allowed but sensitive values remain masked.
- Migrations are controlled manually or by a dev pipeline.
- Worker can run with small batch sizes.

## Staging

- Production-like URLs, real Supabase Auth and production-like CORS.
- `AUTH_REQUIRED=true`.
- Trusted proxy headers are hints only; JWT and tenant membership must validate.
- Migrations run through pipeline or controlled operator command.
- Load/performance tests can target staging.
- Worker runs as a separate process/container.

## Production

- `AUTH_REQUIRED=true`.
- Supabase JWT verification is required.
- `ALLOW_TRUSTED_PROXY_HEADERS=false` unless a controlled internal network policy exists.
- Secrets are managed by the deployment platform, not files.
- Metrics/deep health/internal endpoints require `INTERNAL_BACKEND_TOKEN`.
- Migrations require review and rollout approval.
- Worker is independently deployable and observable.
- Seed/demo data is disabled.
