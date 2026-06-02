# Main / Local / Virtual Server Workflow

## Purpose

Development and live release use the same `main` code. They are separated by environment values and Supabase projects.

## Local Development

- Branch: `main`
- Env: `.env.local`
- `NEXT_PUBLIC_APP_ENV=development`
- Supabase: Development project
- Demo/field-test data is allowed.
- Development/internal/demo pages can be visible.

## Virtual Server Release

- Branch: `main`
- Env: `/etc/eden-erp/eden-erp.env`
- `NEXT_PUBLIC_APP_ENV=release`
- Supabase: Release project
- Demo mode is off.
- Environment/status/version badge is hidden from normal users.
- Ollama runs on the VS and is reached through `OLLAMA_BASE_URL`.

## Deploy Flow

```text
local work -> commit -> push origin main -> VS deploy script pulls origin/main -> build with live env -> restart service
```

## P0/P1/P2 Priority

- P0: live VS env points at Development Supabase or local env points at Release Supabase.
- P1: release env shows demo/status surfaces.
- P2: webhook/cron automation missing.

## Suggested Next Prompt

GitHub push sonrasi VS uzerinde `scripts/deploy-main-vps.sh` calisacak otomasyonu kur.
