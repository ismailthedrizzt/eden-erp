# Release Candidate Gate Report

<!-- source-of-truth-standard: contract overrides markdown -->

- Tarih: 2026-06-06
- Branch: main
- Baseline commit: 1830fa4 manual_field_test_execution_plan
- Ortam: uzak sunucu, local PostgreSQL/local DB, Next.js UI/BFF, FastAPI canonical backend
- Test edilen kapsam: release guard, env guard, DB target guard, migration/boundary/openapi guard, build, backend ruff/mypy/pytest, health smoke, field-test register incelemesi
- Karar: FIX_BEFORE_RELEASE_CANDIDATE
- Sonraki adım: manuel field test ilk turu + P1 backend/test cleanup + tekrar gate

## Komut Sonuçları

| Komut | Sonuç | Not |
| --- | --- | --- |
| npm run typecheck | PASS | Changed TypeScript file yok. |
| npm run build | PASS | Next build tamamlandı; build sonrası PWA artifact churn temizlendi. |
| npm run release:check | PASS | 146 registry route ve 146 page route eşleşti. |
| npm run env:safety | PASS | Release env safety local DB modeline göre geçti. |
| npm run db:target:check | PASS | DATABASE_URL app1db release DB olarak sınıflandı. |
| npm run migration:status | PASS | 521 route; 422 header; 99 missing; P0 missing 0; temporary fallback 0. |
| npm run boundaries:check | PASS_WITH_WARNINGS | Critical error 0; warning 162. |
| npm run openapi:drift | PASS | openapi refresh ve generated types tamamlandı. |
| cd backend && python -m pytest app/tests | FAIL | 225 pass, 2 fail: observability deep health/metrics endpointleri 401 döndü. |
| cd backend && python -m ruff check . | FAIL | 94 baseline lint error. |
| cd backend && python -m mypy app | FAIL | app/api/v1/accounting.py:596 ApiSuccess data type mismatch. |
| docker compose config | FAIL_WITH_ENV_MISSING | DATABASE_URL verilmeden compose config çalışmıyor; compose DB lifecycle yönetmiyor. |
| Next /login health smoke | PASS | HTTP 200. |
| FastAPI /api/v1/health smoke | PASS | HTTP 200. |

## Açık Riskler

| Priority | Risk | Durum | Etki | Gerekli aksiyon |
| --- | --- | --- | --- | --- |
| P0 | Açık doğrulanmış P0 | Yok | RC kararında NOT_READY üretmedi. | Field testte P0 çıkarsa karar NOT_READY olur. |
| P1 | Manuel field test kanıtı yok | Açık | Çekirdek ERP akışları gerçek kullanıcıyla doğrulanmadı. | ManualFieldTestScenario ilk turu işletilmeli. |
| P1 | Backend pytest 2 fail | Açık | Observability endpointleri testte 401 dönüyor. | Health/metrics auth beklentisi netleştirilip test veya endpoint düzeltilmeli. |
| P1 | Backend ruff 94 error | Açık | Backend kalite kapısı temiz değil. | Ayrı cleanup batch. |
| P1 | Backend mypy 1 error | Açık | Type safety gate temiz değil. | accounting.py:596 düzeltmesi. |
| P1 | Boundary warnings 162 | Açık | Next/FastAPI sınırı tam temiz değil. | FastAPI canonical backend burn-down devam etmeli. |
| P1 | Backup dry-run yapılmadı | Açık | Release promotion öncesi operasyon kanıtı eksik. | DB ve DOCUMENT_STORAGE_ROOT backup smoke. |
| P2 | Development modülleri kapsam dışı | Açık | Kullanıcı beklentisi yönetimi gerekir. | Known limitations ve release registry ile sınırla. |

## Karar

FIX_BEFORE_RELEASE_CANDIDATE. Bu karar yeni özellik eksikliğinden değil, release candidate için gerekli saha kanıtı ve backend kalite kapıları henüz temiz olmadığı için verilmiştir.
