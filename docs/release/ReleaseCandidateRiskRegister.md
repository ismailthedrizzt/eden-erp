# Release Candidate Risk Register

- Tarih: 2026-06-06
- Branch: main
- Baseline commit: 1830fa4 manual_field_test_execution_plan
- Ortam: uzak sunucu, local PostgreSQL/local DB, Next.js UI/BFF, FastAPI canonical backend
- Test edilen kapsam: release guard, env guard, DB target guard, migration/boundary/openapi guard, build, backend ruff/mypy/pytest, health smoke, field-test register incelemesi
- Karar: FIX_BEFORE_RELEASE_CANDIDATE
- Sonraki adım: manuel field test ilk turu + P1 backend/test cleanup + tekrar gate

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
