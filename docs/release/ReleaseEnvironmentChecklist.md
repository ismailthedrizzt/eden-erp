# Release Environment Checklist

## Purpose

Release Vercel + Release Supabase ortamının temiz, onayli ve korumali oldugunu dogrular.

## Checklist

| check | expected |
|---|---|
| Release Vercel opens | App loads with release env |
| Release Supabase connected | URL/ref belongs to Release project |
| Login works | Auth uses Release users |
| Environment badge hidden | no `development` badge |
| Release status badge hidden | normal users see no route-status badge |
| Debug/version hidden | no normal-user internal version/debug badge |
| Development pages hidden | direct route is blocked/passive |
| Demo/test/legacy hidden | no normal navigation/search result |
| Sensitive pages hidden | admin/audit/documents/portal/integration/AI/automation hidden for normal users |
| Release pages visible | only approved release surface appears |
| Demo seed blocked | `demo:seed` fails in release |
| Reset blocked | reset command fails in release |
| Env safety passes | `npm run env:safety` passes with real release env |
| Login bypass blocked | `EDEN_LOGIN_DISABLED=true` fails release safety |
| Legacy API blocked | `EDEN_ALLOW_LEGACY_API_ACCESS=true` fails release safety |

## Required Env

```env
NEXT_PUBLIC_APP_ENV=release
NEXT_PUBLIC_RELEASE_CHANNEL=release
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=<release-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<release-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<release-service-role-key>
SUPABASE_PROJECT_REF=<release-project-ref>
ALLOW_RELEASE_DB_SEED=false
ALLOW_RELEASE_DB_RESET=false
```

## Commands

```bash
npm run release:check
npm run env:safety
npm run supabase:target:check
```

## Findings

Release visibility is enforced before module readiness, feature flags and permission checks.

## Risks

- A route can build successfully but remain unapproved for Release.
- Release migration without explicit approval can corrupt live data.

## Recommended Fixes

- Promote pages by changing registry status to `release` only after Development smoke.
- Keep Release Supabase credentials out of local `.env.local`.
- Require release migration approval env values for schema changes.

## P0/P1/P2 Priority

- P0: Release seed/reset/demo route exposure.
- P1: Missing release smoke evidence.
- P2: Add automated Release sidebar/search assertions.

## Suggested Next Prompt

Release env simule edilerek direct route guard ve sidebar/search gorunurlugu test edilsin.
