# Environment Variable Matrix

Updated 2026-06-06: Supabase variables in this matrix are legacy compatibility only. Canonical release/development separation is remote server env + local PostgreSQL/local DB target.

## Purpose

Remote server/local PostgreSQL target values must be explicit and never mixed. Both runtimes use the same `main` branch.

## Matrix

| env key | development value source | release value source | public/private | required? | notes | risk if wrong |
|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_APP_ENV` | `.env.local` | VS env file | public | yes | `development` or `release` | Wrong route visibility |
| `NEXT_PUBLIC_RELEASE_CHANNEL` | `.env.local` | VS env file | public | yes | mirrors app env | Wrong badge/guard behavior |
| `NEXT_PUBLIC_DEMO_MODE` | `.env.local` | VS env file | public | yes | can be `true` only locally | Demo UI in Release |
| `NEXT_PUBLIC_SUPABASE_URL` | legacy only | legacy only | public | no | warn if configured | Legacy target confusion |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | legacy only | legacy only | public | no | warn if configured with Supabase URL | Legacy target confusion |
| `SUPABASE_SERVICE_ROLE_KEY` | legacy server-only | legacy server-only | private | no | deprecated adapter inventory only | Service role exposure |
| `FASTAPI_BASE_URL` | Development FastAPI URL if used | Release FastAPI URL if used | private/server | conditional | keep server-only unless intentionally exposed | Backend calls fail or leak target |
| `INTERNAL_BACKEND_TOKEN` | Development internal token | Release internal token | private | conditional | server-only | Internal API exposure |
| `APP_ENV` | Development backend env | Release backend env | private | backend conditional | FastAPI/worker env | Wrong backend safety mode |
| `DATABASE_URL` | Development local PostgreSQL | Release local PostgreSQL | private | yes | server/worker only | Live DB mutation risk |
| `SUPABASE_URL` | legacy only | legacy only | private | no | warning if configured | Legacy target confusion |
| `SUPABASE_JWT_SECRET` | legacy/direct bearer only | legacy/direct bearer only | private | no | not canonical auth | Invalid legacy verification |
| `SUPABASE_JWKS_URL` | legacy/direct bearer only | legacy/direct bearer only | private | no | not canonical auth | Invalid legacy verification |
| `AUTH_REQUIRED` | `true` | `true` | private | backend conditional | no auth bypass | Auth bypass |
| `ALLOW_TRUSTED_PROXY_HEADERS` | `false` unless controlled | `false` | private | backend conditional | JWT remains source of truth | Tenant/user spoofing |
| `CORS_ALLOWED_ORIGINS` | local URL | live VS/app URL | private | backend conditional | exact origins | Cross-env access |
| `OLLAMA_BASE_URL` | optional local Ollama URL | VS-local Ollama URL | private/server | recommended | defaults to `http://127.0.0.1:11434` | AI guide falls back to rule-only answers |
| `OLLAMA_MODEL` | optional local model | VS model | private/server | recommended | defaults to `llama3.1:8b` | Wrong or missing model |
| `LOG_LEVEL` | `INFO` or `DEBUG` | `INFO` | private | optional | no secrets in logs | Sensitive logs |
| `DB_POOL_SIZE` | small dev pool | controlled release pool | private | backend conditional | DB resource control | Connection exhaustion |
| `DB_MAX_OVERFLOW` | small dev overflow | controlled release overflow | private | backend conditional | DB resource control | Connection exhaustion |
| `DB_POOL_TIMEOUT` | configured | configured | private | backend conditional | DB resource control | Hung requests |
| `WORKER_DB_POOL_SIZE` | small worker pool | controlled worker pool | private | backend conditional | worker DB limit | Worker connection storm |
| `EDEN_LOGIN_DISABLED` | `false` | `false` | private | yes | release guard fails if true | Auth bypass |
| `EDEN_ALLOW_LEGACY_API_ACCESS` | `false` | `false` | private | yes | release guard fails if true | Legacy bypass |
| `ALLOW_RELEASE_DB_MIGRATION` | `false` | `false` except approved migration | private | yes | requires approval for release migration | Unapproved schema change |
| `RELEASE_MIGRATION_APPROVED_BY` | empty | set only for approved migration | private | conditional | named approval | Untraceable release mutation |
| `ALLOW_RELEASE_DB_SEED` | `false` | `false` | private | yes | release safety fails if true | Demo data in live |
| `ALLOW_RELEASE_DB_RESET` | `false` | `false` | private | yes | release safety fails if true | Data loss |

## Examples

Development:

```env
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_RELEASE_CHANNEL=development
NEXT_PUBLIC_DEMO_MODE=true
DATABASE_URL=<development_local_postgresql_url>
APP_SESSION_SECRET=<development_session_secret>
FASTAPI_BASE_URL=http://127.0.0.1:8000
INTERNAL_BACKEND_TOKEN=<development_internal_backend_token>
EDEN_LOGIN_DISABLED=false
EDEN_ALLOW_LEGACY_API_ACCESS=false
```

Release:

```env
NEXT_PUBLIC_APP_ENV=release
NEXT_PUBLIC_RELEASE_CHANNEL=release
NEXT_PUBLIC_DEMO_MODE=false
DATABASE_URL=<release_local_postgresql_url>
APP_SESSION_SECRET=<release_session_secret>
FASTAPI_BASE_URL=http://127.0.0.1:8000
INTERNAL_BACKEND_TOKEN=<release_internal_backend_token>
TRUSTED_PROXY_SECRET=<release_trusted_proxy_secret>
EDEN_LOGIN_DISABLED=false
EDEN_ALLOW_LEGACY_API_ACCESS=false
ALLOW_RELEASE_DB_SEED=false
ALLOW_RELEASE_DB_RESET=false
```

## Rules

- Development env must not point at a release-like DB target.
- Release env must declare a release DB target explicitly.
- Release env cannot enable demo mode, login bypass, legacy API access, release seed or release reset.
- No secret-looking value may start with `NEXT_PUBLIC_`.
- Service role keys are server-only.

## Findings

The repo now includes `.env.development.example`, `.env.release.example`, `.env.local.example`, and backend env examples.

## Risks

- Env copy/paste errors between `.env.local` and the VS env file are the highest operational risk.
- Missing project refs reduce guard precision.

## Recommended Fixes

- Set `DATABASE_TARGET_CLASS=development` or `release` when a DB name is intentionally neutral.
- Run `npm run env:safety` and `npm run db:target:check` before promotion.

## P0/P1/P2 Priority

- P0: Active env points to the wrong local PostgreSQL target.
- P1: Missing explicit `DATABASE_TARGET_CLASS` for neutral DB names.
- P2: Document actual DB names after release DB creation.

## Suggested Next Prompt

Actual development and release local PostgreSQL DB target names/classes should be recorded in the matrix.
