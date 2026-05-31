# Development / Release Vercel Workflow

## Purpose

Vercel tarafinda iki isimli ortam korunur: Development ve Release.

## Release Vercel

- Mevcut Vercel project korunur.
- `main` veya release branch ile baglidir.
- Env: `NEXT_PUBLIC_APP_ENV=release`, `NEXT_PUBLIC_RELEASE_CHANNEL=release`.
- Release Supabase kullanir.
- Demo mode kapali olur.
- Environment/status/version badge normal kullaniciya gorunmez.

## Development Vercel

- Ayri Vercel project veya ayni repo'dan ayri project olarak kurulabilir.
- `develop` branch ile baglidir.
- Env: `NEXT_PUBLIC_APP_ENV=development`, `NEXT_PUBLIC_RELEASE_CHANNEL=development`.
- Development Supabase kullanir.
- Demo/field test URL'i burasidir.
- Development/internal/demo sayfalar gorunebilir.

## Preview Deploys

Vercel Preview otomatik olarak olusabilir, fakat karar modeli yine iki ortamdir:

```text
Development Vercel
Release Vercel
```

Preview deploylar Development davranisina yakin ele alinmalidir.

## P0/P1/P2 Priority

- P0: Release Vercel'in Development Supabase'e veya Development Vercel'in Release Supabase'e bakmasi.
- P1: Release env'de demo/status badge gorunmesi.
- P2: Preview deploylarin isimlendirme/etiketleme eksigi.

## Suggested Next Prompt

Vercel env ekraninda Development ve Release degiskenlerini tablo halinde dogrula.
