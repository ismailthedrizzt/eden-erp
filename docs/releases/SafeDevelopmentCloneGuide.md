# Safe Main Branch Local Guide

This document supersedes the earlier separate development clone guide.

## Local Rule

Use the existing repository and stay on `main`.

```bash
git switch main
git pull origin main
```

Copy `.env.local.example` to `.env.local` and fill Development Supabase values only.

## Live Rule

The Virtual Server also checks out `main`, but it uses `/etc/eden-erp/eden-erp.env` with Release Supabase values.

```text
local machine  -> main -> .env.local                 -> Development Supabase
Virtual Server -> main -> /etc/eden-erp/eden-erp.env -> Release Supabase
```

## Do Not

- Do not put Release Supabase secrets in `.env.local`.
- Do not run seed/reset/migration against Release Supabase without explicit release migration approval.
- Do not recreate a long-lived `develop` branch.

## Suggested Next Prompt

Local `.env.local` dosyasinin Development Supabase'e baktigini guard komutlariyla dogrula.
Deprecated: Bu dokuman eski Vercel/Supabase deployment varsayimi icin tutulmaktadir. Guncel deployment modeli uzak sunucu + yerel PostgreSQL/local DB modelidir.
