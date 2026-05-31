# Release Preservation Policy

## Purpose

Mevcut `eden-erp` calisma alani ve mevcut Vercel/Supabase release ortami korunur.

## Current Release Workspace

`eden-erp`:

- Release calisma alanidir.
- Mevcut GitHub baglantisini korur.
- Mevcut Vercel release deployment'a baglidir.
- Mevcut Supabase release project'i kullanir.
- Dogrudan gelistirme yapilmaz.
- Sadece onaylanmis degisiklikler aktarilir.

## Development Workspace

`eden-erp-development`:

- Aktif gelistirme calisma alanidir.
- Codex burada calisir.
- Development branch veya ayri working copy kullanir.
- Development Vercel deployment'a baglidir.
- Development Supabase project'e baglidir.
- Demo/field test kullanicilari burada calisir.

## Hard Rules

- Codex `eden-erp` release klasorunde aktif gelistirme yapmayacak.
- Schema/migration/seed denemeleri Release Supabase uzerinde yapilmayacak.
- Release'e gecis yalnizca insan onayi sonrasi yapilacak.
- Release env'de demo mode, login bypass ve legacy API access kapali olacak.

## P0/P1/P2 Priority

- P0: Release klasorunde direkt kod degisikligi veya release Supabase mutation.
- P1: Release'e aktarim oncesi `release:check`, `env:safety`, `supabase:target:check` calismamasi.
- P2: Manual smoke checklist'in eksik tutulmasi.

## Suggested Next Prompt

Promotion oncesi otomatik kontrol ve smoke checklist akisini tek komutta topla.
