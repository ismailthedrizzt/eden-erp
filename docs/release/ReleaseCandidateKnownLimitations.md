# Release Candidate Known Limitations

<!-- source-of-truth-standard: contract overrides markdown -->

- Tarih: 2026-06-06
- Branch: main
- Baseline commit: 1830fa4 manual_field_test_execution_plan
- Ortam: uzak sunucu, local PostgreSQL/local DB, Next.js UI/BFF, FastAPI canonical backend
- Test edilen kapsam: release guard, env guard, DB target guard, migration/boundary/openapi guard, build, backend ruff/mypy/pytest, health smoke, field-test register incelemesi
- Karar: FIX_BEFORE_RELEASE_CANDIDATE
- Sonraki adım: manuel field test ilk turu + P1 backend/test cleanup + tekrar gate

Bu sınırlamalar ürün kusuru olarak değil, release candidate kapsam sınırı olarak ele alınır.

- CRM development kapsamındadır.
- Sözleşmeler development kapsamındadır.
- Satış Sonrası release kapsamında değildir veya sınırlıdır.
- Portal kapalıdır.
- AI Copilot kapalıdır.
- Integration Hub kapalıdır.
- Automation kapalıdır.
- Gelişmiş raporlama kapalıdır.
- e-Fatura / banka API canlı entegrasyonu yoktur.
- E-imza yoktur.
- Sözleşme müzakere portalı yoktur.
- OCR / AI belge analizi yoktur.
- Belge preview bazı dosya tiplerinde download davranışına düşebilir; güvenli media access önceliklidir.
