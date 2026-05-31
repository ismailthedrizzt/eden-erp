# Vercel Environment Separation

## Purpose

Development and Release deployments are separate Vercel projects or clearly separated Vercel configurations.

## Development Vercel

- Project: `eden-erp-development` project or separate Vercel project.
- Branch: `develop`.
- Env:

```env
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_RELEASE_CHANNEL=development
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_SUPABASE_URL=<development-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<development-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<development-service-role-key>
```

- Development Supabase values only.
- Demo mode can be true.
- Environment/status badges can be visible.
- Development/demo/internal pages can be tested.

## Release Vercel

- Project: existing `eden-erp` release project.
- Branch: `main` or `release`.
- Env:

```env
NEXT_PUBLIC_APP_ENV=release
NEXT_PUBLIC_RELEASE_CHANNEL=release
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=<release-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<release-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<release-service-role-key>
```

- Release Supabase values only.
- Demo mode false.
- No normal-user status badge.
- Only `release` route registry entries are enabled.

## Preview Deployments

Vercel Preview can exist, but the operating model has two named environments:

```text
Development Vercel
Release Vercel
```

Preview deployments should behave like Development unless explicitly promoted.

## Findings

The route visibility model no longer depends on a third named environment.

## Risks

- Same Vercel project with mixed env values can become confusing.
- Preview deployments can accidentally use Release Supabase if env inheritance is wrong.

## Recommended Fixes

- Prefer two separate Vercel projects.
- Set Development project to `develop`.
- Set Release project to `main` or `release`.
- Do not copy Release Supabase service role into Development project.

## P0/P1/P2 Priority

- P0: Vercel Development deploy uses Release Supabase.
- P1: Release deploy does not set `NEXT_PUBLIC_APP_ENV=release`.
- P2: Add Vercel deployment checklist to PR template.

## Suggested Next Prompt

Vercel project env ekranlari icin Development ve Release degerlerini tek tek dogrula.
