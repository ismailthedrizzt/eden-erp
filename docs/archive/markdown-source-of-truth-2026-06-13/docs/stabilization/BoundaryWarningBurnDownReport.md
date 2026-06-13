# Boundary Warning Burn-Down Report

- Tarih: 2026-06-06
- Branch: main
- Baseline commit: a5d871d release_candidate_gate_decision
- Ortam: uzak sunucu, local PostgreSQL/local DB, FastAPI canonical backend, Next.js UI/BFF
- Sprint kararı: READY_WITH_LIMITATIONS_FOR_MANUAL_FIELD_TEST

| Metrik | Sonuç |
| --- | --- |
| Critical errors | 0 |
| Temporary fallback routes | 0 |
| Warnings | 162 |
| Route files scanned | 521 |
| TS files scanned | 1201 |

## Sınıflandırma

- Release kapsamı etkileyen: şirket, ortak, temsilci, şube, muhasebe, belge ve audit sayfalarında TS backend-core helper import uyarıları var.
- Auth/session/security etkileyen: critical error yok; secret/env import violation yok.
- Document/media etkileyen: Document components warning üretir ama media route proxy-only critical violation yok.
- Lifecycle/operation etkileyen: route fallback veya direct DB critical error yok; helper import borcu P1 olarak kalır.
- Development-only: sözleşmeler, AI, CRM, reporting, after-sales ve integrations uyarıları development kapsamına alınır.

## Burn-down Sonucu

Bu sprintte release blocker boundary warning bulunmadı. Toplam warning sayısı düşürülmedi; warnings sınıflandırıldı. Sonraki burn-down işi frontend shared contract ayrımıdır.
