# Promotion To Release Workflow

## Purpose

Development ortaminda test edilen degisiklikler kontrollu sekilde Release ortamına aktarilir.

## Flow

1. Codex `eden-erp-development` uzerinde calisir.
2. Kod `develop` branch'e commit edilir.
3. Development Vercel deploy eder.
4. Development Supabase uzerinde test edilir.
5. Sen Development URL'de kontrol edersin.
6. Uygun sayfa/ozellik release registry'de `release` yapilir.
7. PR, merge veya cherry-pick ile `main`/`release` branch'e alinir.
8. Release Vercel deploy eder.
9. Release smoke yapilir.
10. Sorun varsa rollback yapilir.

## Required Checks Before Promotion

```bash
npm run typecheck
npm run build
npm run release:check
npm run env:safety
npm run supabase:target:check
npm run migration:status
npm run boundaries:check
npm run openapi:drift
```

Backend etkilenmisse:

```bash
cd backend && python -m ruff check .
cd backend && python -m mypy app
cd backend && python -m pytest
```

## Release Migration Approval

Release Supabase migration yalnizca asagidaki env degerleri ile calisir:

```env
ALLOW_RELEASE_DB_MIGRATION=true
RELEASE_MIGRATION_APPROVED_BY=<name>
```

Seed, demo seed and reset are blocked in Release.

## Promotion Rules

- New page starts as `releaseStatus=development`.
- Test/onay olmadan `releaseStatus=release` yapilmaz.
- Release Vercel uses Release Supabase only.
- Development Vercel uses Development Supabase only.
- Release smoke is mandatory after deploy.

## Findings

Promotion is branch-based, not folder-name based. `eden-erp-development` pushes to the same GitHub repo but should push `develop`.

## Risks

- Merging `develop` to `main` before route status review can expose incomplete pages.
- Release migration without approval can change live data.

## Recommended Fixes

- Require `release:check`, `env:safety`, and `supabase:target:check` before promotion.
- Keep a manual release smoke note for every promotion.

## P0/P1/P2 Priority

- P0: Unapproved release migration or development route visible in Release.
- P1: Promotion without smoke checklist evidence.
- P2: CI automation for promotion checks.

## Suggested Next Prompt

GitHub PR template veya CI workflow icine promotion checklist ekle.
