# Virtual Server Release Environment Checklist

## Purpose

Virtual Server + Release Supabase ortamının temiz, onayli ve korumali oldugunu dogrular.

## Checklist

| check | expected |
|---|---|
| Virtual Server app opens | App loads with release env |
| Release Supabase connected | URL/ref belongs to Release project |
| Login works | Auth uses Release users |
| Environment badge hidden | no `development` badge |
| Release status badge hidden | normal users see no route-status badge |
| Debug/version hidden | no normal-user internal version/debug badge |
| Development pages hidden | direct route is blocked/passive |
| Demo/test/legacy hidden | no normal navigation/search result |
| Release pages visible | only approved release surface appears |
| Ollama service healthy | `OLLAMA_BASE_URL` responds locally on the VS |
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
OLLAMA_BASE_URL=http://127.0.0.1:11434
ALLOW_RELEASE_DB_SEED=false
ALLOW_RELEASE_DB_RESET=false
```

## Commands

```bash
npm run release:check
npm run env:safety
npm run supabase:target:check
```

## Suggested Next Prompt

VS release env simule edilerek direct route guard, sidebar/search gorunurlugu ve Ollama sagligi test edilsin.
