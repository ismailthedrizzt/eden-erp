# Environment Variable Matrix

## Purpose

Development and Release Vercel/Supabase values must be explicit and never mixed.

## Matrix

| env key | development value source | release value source | public/private | required? | notes | risk if wrong |
|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_APP_ENV` | Development Vercel / `.env.local` | Release Vercel | public | yes | `development` or `release` | Wrong route visibility |
| `NEXT_PUBLIC_RELEASE_CHANNEL` | Development Vercel / `.env.local` | Release Vercel | public | yes | mirrors app env | Wrong badge/guard behavior |
| `NEXT_PUBLIC_DEMO_MODE` | Development Vercel | Release Vercel | public | yes | can be `true` only in Development | Demo UI in Release |
| `NEXT_PUBLIC_SUPABASE_URL` | Development Supabase | Release Supabase | public | yes | browser-safe project URL | Wrong database/auth/storage target |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Development Supabase anon key | Release Supabase anon key | public | yes | anon key only | Auth against wrong project |
| `SUPABASE_SERVICE_ROLE_KEY` | Development Supabase service role | Release Supabase service role | private | server-side yes | never import into client code | Service role exposure |
| `SUPABASE_PROJECT_REF` | Development project ref | Release project ref | private | recommended | used by target guard | Wrong target undetected |
| `DEVELOPMENT_SUPABASE_URL` | Development project URL | optional guard reference | private | recommended | guard reference | Wrong target undetected |
| `DEVELOPMENT_SUPABASE_PROJECT_REF` | Development project ref | optional guard reference | private | recommended | guard reference | Wrong target undetected |
| `RELEASE_SUPABASE_URL` | optional guard reference | Release project URL | private | recommended | guard reference | Wrong target undetected |
| `RELEASE_SUPABASE_PROJECT_REF` | optional guard reference | Release project ref | private | recommended | guard reference | Wrong target undetected |
| `FASTAPI_BASE_URL` | Development FastAPI URL if used | Release FastAPI URL if used | private/server | conditional | keep server-only unless intentionally exposed | Backend calls fail or leak target |
| `INTERNAL_BACKEND_TOKEN` | Development internal token | Release internal token | private | conditional | server-only | Internal API exposure |
| `APP_ENV` | Development backend env | Release backend env | private | backend conditional | FastAPI/worker env | Wrong backend safety mode |
| `DATABASE_URL` | Development Supabase DB/pooler | Release Supabase DB/pooler | private | backend conditional | server/worker only | Live DB mutation risk |
| `SUPABASE_URL` | Development Supabase | Release Supabase | private | backend conditional | backend Supabase URL | Wrong auth/storage target |
| `SUPABASE_JWT_SECRET` | Development JWT secret | Release JWT secret | private | backend conditional | or use JWKS | Invalid auth verification |
| `SUPABASE_JWKS_URL` | Development JWKS URL | Release JWKS URL | private | backend conditional | preferred where available | Invalid auth verification |
| `AUTH_REQUIRED` | `true` | `true` | private | backend conditional | no auth bypass | Auth bypass |
| `ALLOW_TRUSTED_PROXY_HEADERS` | `false` unless controlled | `false` | private | backend conditional | JWT remains source of truth | Tenant/user spoofing |
| `CORS_ALLOWED_ORIGINS` | Development Vercel URL | Release Vercel URL | private | backend conditional | exact origins | Cross-env access |
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
NEXT_PUBLIC_SUPABASE_URL=<development_supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<development_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<development_service_role_key>
EDEN_LOGIN_DISABLED=false
EDEN_ALLOW_LEGACY_API_ACCESS=false
```

Release:

```env
NEXT_PUBLIC_APP_ENV=release
NEXT_PUBLIC_RELEASE_CHANNEL=release
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=<release_supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<release_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<release_service_role_key>
EDEN_LOGIN_DISABLED=false
EDEN_ALLOW_LEGACY_API_ACCESS=false
ALLOW_RELEASE_DB_SEED=false
ALLOW_RELEASE_DB_RESET=false
```

## Rules

- Development env must not contain Release Supabase URL as the active target.
- Release env must not contain Development Supabase URL as the active target.
- Release env cannot enable demo mode, login bypass, legacy API access, release seed or release reset.
- No secret-looking value may start with `NEXT_PUBLIC_`.
- Service role keys are server-only.

## Findings

The repo now includes `.env.development.example`, `.env.release.example`, `.env.local.example`, and backend env examples.

## Risks

- Vercel env copy/paste errors are the highest operational risk.
- Missing project refs reduce guard precision.

## Recommended Fixes

- Fill `SUPABASE_PROJECT_REF` and environment-specific guard refs in Vercel.
- Run `npm run env:safety` and `npm run supabase:target:check` before promotion.

## P0/P1/P2 Priority

- P0: Active env points to the wrong Supabase project.
- P1: Missing guard reference values.
- P2: Document actual project refs after projects are created.

## Suggested Next Prompt

Actual Development Supabase project ref ve Release Supabase project ref degerlerini matrix'e isleyelim.
