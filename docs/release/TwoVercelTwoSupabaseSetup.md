# Single Main + Two Supabase Setup

## Purpose

Eden ERP uses the same `main` code locally and on the Virtual Server. Environment variables decide whether the app uses Development Supabase or Release Supabase.

## Local Development

| area | value |
|---|---|
| branch | `main` |
| machine | local workstation |
| env source | `.env.local` |
| Supabase project | separate Development project |
| users | Codex, demo users, field-test users |
| visible routes | `release`, `development`, `development_demo`, `development_internal`, `coming_soon` |
| badges | environment and release status badges can be visible |
| data operations | migration/seed/reset allowed only against Development Supabase |

## Live Release

| area | value |
|---|---|
| branch | `main` |
| machine | Virtual Server |
| env source | `/etc/eden-erp/eden-erp.env` |
| Supabase project | existing Release project |
| users | approved live users |
| visible routes | only `release`; `coming_soon` can be passive |
| badges | no demo, debug, environment or route-status badge for normal users |
| data operations | seed/reset forbidden; migration requires explicit approval |
| AI runtime | Ollama on the VS, usually `http://127.0.0.1:11434` |

## Guard Commands

```bash
npm run release:check
npm run env:safety
npm run supabase:target:check
```

## Recommended Fixes

- Keep Release Supabase secrets only in the VS env file or a server secret manager.
- Keep `.env.local` connected only to Development Supabase.
- Let VS automation pull only `origin/main`.

## Suggested Next Prompt

VS uzerinde `/etc/eden-erp/eden-erp.env` dosyasini `.env.release.example` baz alarak dolduralim.
