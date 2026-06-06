# Post Release Stabilization Plan

- Tarih: 2026-06-06
- Branch: main
- Baseline commit: 1830fa4 manual_field_test_execution_plan
- Ortam: uzak sunucu, local PostgreSQL/local DB, Next.js UI/BFF, FastAPI canonical backend
- Test edilen kapsam: release guard, env guard, DB target guard, migration/boundary/openapi guard, build, backend ruff/mypy/pytest, health smoke, field-test register incelemesi
- Karar: FIX_BEFORE_RELEASE_CANDIDATE
- Sonraki adım: manuel field test ilk turu + P1 backend/test cleanup + tekrar gate

## İlk 14 Gün Stabilizasyon Planı

### Günlük Kontrol

- Login sorunları
- DB errors
- Slow pages
- Worker backlog
- Document upload issues
- Audit failures
- Permission denied spikes
- User feedback
- P0/P1 bug listesi

### İlk 7 Gün

- Sadece P0/P1 fix yapılır.
- Yeni modül geliştirme yapılmaz.
- Release yüzeyi genişletilmez.

### İlk 14 Gün

- P1 cleanup yapılır.
- UX polish batch'i hazırlanır.
- Field test geri bildirimleri sınıflandırılır.
- Yeni release adayı kapsamı değerlendirilir.

### Sonraki Modül Adayları

- Sözleşmeler
- CRM
- Satış Sonrası
- Raporlama
- Data Quality
- Import / Export
