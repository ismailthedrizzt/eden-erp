# Public Reverse Proxy Smoke Report

- Tarih: 2026-06-06
- Branch: main
- Baseline commit: a5d871d release_candidate_gate_decision
- Ortam: uzak sunucu, local PostgreSQL/local DB, FastAPI canonical backend, Next.js UI/BFF
- Sprint kararı: READY_WITH_LIMITATIONS_FOR_MANUAL_FIELD_TEST

| Test | Sonuç |
| --- | --- |
| Local Next /login | HTTP 200 |
| Local FastAPI /api/v1/health | HTTP 200 |
| Public HTTPS /login | HTTP 200 |
| Public HTTP /login | HTTP 301 |
| Public API /api/v1/health | HTTP 401 |
| Public API /api/v1/companies | HTTP 401 AUTH_REQUIRED |
| HSTS | Yok |

## Karar

Public app ve HTTPS çalışıyor. HTTP, HTTPS'e yönleniyor. FastAPI public business surface olarak açık davranmıyor; public API path auth required dönüyor.

## Risk

- P1: HSTS header yok. Credential taşıyan release yüzeyinde HSTS eklenmesi önerilir.
- P0 bulunmadı: public app açılıyor, HTTP redirect var, FastAPI business endpoint auth'suz açılmıyor.
