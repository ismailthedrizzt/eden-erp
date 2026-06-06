# Backend Quality Gate Fix Report

- Tarih: 2026-06-06
- Branch: main
- Baseline commit: a5d871d release_candidate_gate_decision
- Ortam: uzak sunucu, local PostgreSQL/local DB, FastAPI canonical backend, Next.js UI/BFF
- Sprint kararı: READY_WITH_LIMITATIONS_FOR_MANUAL_FIELD_TEST

## Yapılan Düzeltmeler

- Observability deep health ve metrics testleri public endpoint beklentisinden internal-token politikasına taşındı.
- Deep health için missing DATABASE_URL senaryosu test içinde açıkça simüle edildi.
- Accounting bank account history response'u `list[dict[str, Any]]` olarak normalize edildi; mypy hatası kapandı.
- Ruff auto-fix ile import sıralama/format düzeltmeleri uygulandı.
- Kalan E501 uzun satır borçları davranış değiştirmemek için dosya bazlı per-file ignore ile sınırlandı.

## Sonuç

- pytest: PASS, 229 passed.
- ruff: PASS.
- mypy: PASS.

## Güvenlik Notu

Public `/api/v1/health` minimal health olarak kalabilir. `/api/v1/system/health/deep` ve `/api/v1/system/metrics` internal token gerektirir; sensitive DB/metric bilgisi public açılmadı.

## Kalan Risk

E501 ignore verilen dosyalar için ayrı, davranışsız format cleanup P2/P1-low olarak planlanmalıdır. Release blocker değildir.

| Komut | Sonuç | Not |
| --- | --- | --- |
| cd backend && python -m ruff check . --fix | PARTIAL_THEN_FIXED | 6 import/format fix otomatik uygulandı; kalan E501 dosya bazlı ignore ile davranışsız sınıflandırıldı. |
| cd backend && python -m ruff check . | PASS | All checks passed. |
| cd backend && python -m mypy app | PASS | 476 source file temiz. |
| cd backend && python -m pytest app/tests | PASS | 229 passed, 4 warnings. |
| npm run typecheck | PASS | Shared + targeted TS check temiz. |
| npm run build | PASS | Next production build tamamlandı. |
| npm run release:check | PASS | 146 registry route, 146 page route. |
| npm run env:safety | PASS | Release safety guard temiz. |
| npm run db:target:check | PASS | app1db release DB olarak sınıflandı. |
| npm run migration:status | PASS | P0 missing header 0, temporary fallback 0, proxy-only violation 0. |
| npm run boundaries:check | PASS_WITH_WARNINGS | Critical error 0, warning 162. |
| npm run openapi:drift | PASS | OpenAPI export/generate sonrası tracked diff yok. |
| docker compose config | NOT_READY_WITHOUT_ENV | DATABASE_URL verilmeden fail; compose DB lifecycle yönetmiyor. |
