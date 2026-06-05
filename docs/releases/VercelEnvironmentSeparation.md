# Virtual Server Environment Separation

This document supersedes the earlier two-Vercel model. Eden ERP now uses one branch and a Virtual Server live runtime.

## Local Development

- Branch: `main`
- Env source: `.env.local`
- Supabase: Development project
- App env: `NEXT_PUBLIC_APP_ENV=development`
- Demo mode may be enabled.
- Development/internal/demo routes may be visible.

## Virtual Server Release

- Branch: `main`
- Env source: `/etc/eden-erp/eden-erp.env`
- Supabase: Release project
- App env: `NEXT_PUBLIC_APP_ENV=release`
- Demo mode is disabled.
- Only approved release routes are enabled.
- Ollama runs on the VS and is referenced by `OLLAMA_BASE_URL`.

## Guard Commands

```bash
npm run env:safety
npm run release:check
npm run supabase:target:check
```

## Risks

- Local `.env.local` accidentally points at Release Supabase.
- VS live env accidentally points at Development Supabase.
- Build runs without live `NEXT_PUBLIC_*` values loaded.

## Recommended Fixes

- Keep live secrets only in the VS env file or server secret manager.
- Source the VS env file before `npm run build`.
- Let the VS deploy script pull only `origin/main`.

## Suggested Next Prompt

VS env dosyasini ve systemd servis ayarlarini canli Supabase/Ollama degerleriyle dolduralim.
Deprecated: Bu dokuman eski Vercel/Supabase deployment varsayimi icin tutulmaktadir. Guncel deployment modeli uzak sunucu + yerel PostgreSQL/local DB modelidir.
