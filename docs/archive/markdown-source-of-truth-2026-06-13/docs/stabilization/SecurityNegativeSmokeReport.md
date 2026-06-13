# Security Negative Smoke Report

- Tarih: 2026-06-06
- Branch: main
- Baseline commit: a5d871d release_candidate_gate_decision
- Ortam: uzak sunucu, local PostgreSQL/local DB, FastAPI canonical backend, Next.js UI/BFF
- Sprint kararı: READY_WITH_LIMITATIONS_FOR_MANUAL_FIELD_TEST

| Test | Beklenen | Sonuç | P0/P1/P2 |
| --- | --- | --- | --- |
| Protected page app session olmadan | Login redirect veya user-safe unauthorized | HTTP 307 | Pass |
| Protected API app session olmadan | 401 AUTH_REQUIRED | HTTP 401 | Pass |
| EDEN_LOGIN_DISABLED=true release env | env:safety fail | Exit 1 | Pass |
| FastAPI x-user-id/x-tenant-id, proxy secret yok | Trusted proxy kabul edilmez | HTTP 401 | Pass |
| FastAPI yanlış x-proxy-secret | Trusted proxy kabul edilmez | HTTP 401 | Pass |
| FastAPI doğru x-proxy-secret smoke | Spoof ile context açılamaz | HTTP 401 | Pass |
| Public FastAPI /api/v1/health | Public business API olmamalı | HTTP 401 on public path | Pass |
| Public FastAPI /api/v1/companies | Auth required | HTTP 401 AUTH_REQUIRED | Pass |
| Media URL app session olmadan | 401/403 | HTTP 401 | Pass |
| Media traversal unauthenticated | Auth bypass olmamalı | HTTP 401 | Pass; authenticated traversal ayrıca field testte denenmeli |
| Hatalı id endpoint | User-safe error | HTTP 401, stack trace yok | Pass |

## Sonuç

Auth bypass, tenant/scope leak, media auth bypass, path traversal public bypass veya user-visible stack trace bulunmadı. Authenticated media traversal ve gerçek scope dışı company/branch denemesi manuel field testte tekrarlanmalıdır.
