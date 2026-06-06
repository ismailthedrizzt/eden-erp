# Release Promotion Plan

- Tarih: 2026-06-06
- Branch: main
- Baseline commit: 1830fa4 manual_field_test_execution_plan
- Ortam: uzak sunucu, local PostgreSQL/local DB, Next.js UI/BFF, FastAPI canonical backend
- Test edilen kapsam: release guard, env guard, DB target guard, migration/boundary/openapi guard, build, backend ruff/mypy/pytest, health smoke, field-test register incelemesi
- Karar: FIX_BEFORE_RELEASE_CANDIDATE
- Sonraki adım: manuel field test ilk turu + P1 backend/test cleanup + tekrar gate

## Promotion Akışı

1. Field test bulguları kapatılır.
2. Release registry yalnız onaylı A kapsamı sayfalarını release yapar.
3. Development-only sayfalar release'te gizli kalır.
4. Build, typecheck ve backend testleri çalışır.
5. DB target check çalışır.
6. DB ve document storage backup alınır.
7. Migration gerekiyorsa approval env set edilir.
8. Deployment yapılır.
9. Smoke test yapılır.
10. Rollback commit ve backup bilgisi hazır tutulur.

## Promotion Öncesi Komutlar

- npm run typecheck
- npm run build
- npm run release:check
- npm run env:safety
- npm run db:target:check
- npm run migration:status
- npm run boundaries:check
- npm run openapi:drift
- cd backend && python -m ruff check .
- cd backend && python -m mypy app
- cd backend && python -m pytest

## Ops Kanıtları

- DB backup dosya adı ve saati kaydedilir.
- DOCUMENT_STORAGE_ROOT backup dosya adı ve saati kaydedilir.
- Deployment restart planı kaydedilir.
- Rollback commit hash ve restore komutları kaydedilir.
