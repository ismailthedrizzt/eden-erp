# Release Candidate Decision

- Tarih: 2026-06-06
- Branch: main
- Baseline commit: 1830fa4 manual_field_test_execution_plan
- Ortam: uzak sunucu, local PostgreSQL/local DB, Next.js UI/BFF, FastAPI canonical backend
- Test edilen kapsam: release guard, env guard, DB target guard, migration/boundary/openapi guard, build, backend ruff/mypy/pytest, health smoke, field-test register incelemesi
- Karar: FIX_BEFORE_RELEASE_CANDIDATE
- Sonraki adım: manuel field test ilk turu + P1 backend/test cleanup + tekrar gate

## Karar

FIX_BEFORE_RELEASE_CANDIDATE

## Gerekçe

- Açık doğrulanmış P0: 0.
- Açık gate P1: manuel field test kanıtı yok, backend pytest 2 fail, backend ruff 94 fail, backend mypy 1 fail, boundary warning 162, backup dry-run yapılmadı.
- Çekirdek field test durumu: not tested.
- Security gate durumu: env/auth guard teknik olarak geçiyor; tenant/scope/media negative testleri yapılmadı.
- DB/deployment gate durumu: db:target:check PASS, health smoke PASS; compose DATABASE_URL olmadan fail, backup/worker proof eksik.
- Release scope durumu: A/B/C kapsamı net; release registry teknik olarak PASS ama A kapsamı field test ile işaretlenmeli.

## Sonraki Adım

P1 stabilization sprint ve manuel field test tekrar. Eğer field test sırasında P0 bulunursa karar NOT_READY olarak güncellenir. Eğer core field test geçer ve backend gates temizlenirse karar READY_WITH_LIMITATIONS veya READY_FOR_RELEASE_CANDIDATE olabilir.
